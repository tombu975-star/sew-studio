/**
 * App-owned authentication on Railway Postgres: Argon2id passwords, random
 * HttpOnly session cookies (only a SHA-256 digest is stored), and one-time
 * password-reset tokens. The method names mirror what the API routes already
 * call (signInWithPassword, signOut, getUser, updateUser, admin.createUser ...)
 * so those routes keep working.
 */
import { createHash, randomBytes } from "crypto";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";
import type { PoolClient } from "pg";
import { getPool } from "./pool";
import { sendEmail } from "../mailer";

export const SESSION_COOKIE = "sew_session";

const DAY = 24 * 60 * 60 * 1000;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

export interface CookieAdapter {
  get(name: string): string | undefined;
  set(name: string, value: string, opts: Record<string, unknown>): void;
  delete(name: string): void;
}

type AuthError = { message: string; status?: number; code?: string };
type AuthUser = { id: string; email: string };

// ---- persistent, shared login throttling (Postgres) ----
// Keyed separately per account and per IP so one attacker can't lock a victim
// out from many addresses without also tripping the IP limit, and a single IP
// can't spray many accounts. Only FAILED attempts count. If the limiter table
// is unavailable we fail open (and log) rather than lock everyone out.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LIMITS = { account: 8, ip: 30 };

async function isThrottled(keys: { key: string; max: number }[]): Promise<boolean> {
  try {
    const { rows } = await getPool().query(
      `select key, failures from private.login_attempts where key = any($1) and reset_at > now()`,
      [keys.map((k) => k.key)]
    );
    return rows.some((r) => r.failures >= (keys.find((k) => k.key === r.key)?.max ?? Infinity));
  } catch (e) {
    console.error("[auth] rate-limit check failed", e);
    return false;
  }
}

async function recordFailure(keys: string[]) {
  try {
    await getPool().query(
      `insert into private.login_attempts (key, failures, reset_at)
       select k, 1, now() + ($2 || ' milliseconds')::interval from unnest($1::text[]) as k
       on conflict (key) do update set
         failures = case when private.login_attempts.reset_at < now() then 1 else private.login_attempts.failures + 1 end,
         reset_at = case when private.login_attempts.reset_at < now() then now() + ($2 || ' milliseconds')::interval else private.login_attempts.reset_at end`,
      [keys, String(LOGIN_WINDOW_MS)]
    );
    // opportunistic cleanup
    getPool().query(`delete from private.login_attempts where reset_at < now() - interval '1 day'`).catch(() => {});
  } catch (e) {
    console.error("[auth] rate-limit record failed", e);
  }
}

async function clearAttempts(key: string) {
  await getPool().query(`delete from private.login_attempts where key = $1`, [key]).catch(() => {});
}

// A real hash to verify against when the email is unknown, so "no such
// account" and "wrong password" take about the same time.
let dummyHash: Promise<string> | null = null;
const getDummy = () => (dummyHash ??= argonHash("not-a-real-password"));

export class AuthApi {
  /** Set after a successful sign-in so later queries in the same request run as that user. */
  onUser?: (id: string | null) => void;

  constructor(
    private cookies: CookieAdapter | null,
    private opts: { rememberMe?: boolean; ip?: string } = {}
  ) {}

  // ----- sessions -----

  private async createSession(userId: string, ttlMs: number, persistent: boolean) {
    const token = newToken();
    await getPool().query(
      `insert into private.sessions (token_hash, user_id, expires_at) values ($1, $2, now() + ($3 || ' milliseconds')::interval)`,
      [sha256(token), userId, String(ttlMs)]
    );
    // opportunistic cleanup of expired rows
    getPool().query(`delete from private.sessions where expires_at < now()`).catch(() => {});
    if (this.cookies) {
      this.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        ...(persistent ? { maxAge: Math.floor(ttlMs / 1000) } : {}),
      });
    }
  }

  private currentToken(): string | undefined {
    return this.cookies?.get(SESSION_COOKIE);
  }

  // ----- public API (db-js shaped) -----

  async signInWithPassword(creds: { email: string; password: string }): Promise<{
    data: { user: AuthUser | null; session: object | null };
    error: AuthError | null;
  }> {
    const fail = (message = "Invalid login credentials", status = 400) => ({
      data: { user: null, session: null },
      error: { message, status },
    });
    const email = String(creds.email || "").toLowerCase().trim();
    const password = String(creds.password || "");
    if (!email || !password) return fail();

    const acctKey = `acct:${email}`;
    const ipKey = this.opts.ip ? `ip:${this.opts.ip}` : null;
    const limits = [{ key: acctKey, max: LOGIN_LIMITS.account }];
    if (ipKey) limits.push({ key: ipKey, max: LOGIN_LIMITS.ip });
    if (await isThrottled(limits)) {
      return fail("Too many attempts. Please wait a few minutes and try again.", 429);
    }
    const failKeys = ipKey ? [acctKey, ipKey] : [acctKey];

    const { rows } = await getPool().query(
      `select u.id, u.email, u.banned_until, c.password_hash
         from auth.users u join private.credentials c on c.user_id = u.id
        where lower(u.email) = $1`,
      [email]
    );
    const row = rows[0];
    if (!row) {
      await argonVerify(await getDummy(), password).catch(() => false);
      await recordFailure(failKeys);
      return fail();
    }
    const ok = await argonVerify(row.password_hash, password).catch(() => false);
    if (!ok) {
      await recordFailure(failKeys);
      return fail();
    }
    if (row.banned_until && new Date(row.banned_until) > new Date()) return fail("This account has been deactivated.", 400);

    await clearAttempts(acctKey);
    const remember = this.opts.rememberMe === true;
    await this.createSession(row.id, remember ? 30 * DAY : DAY, remember);
    this.onUser?.(row.id);
    return { data: { user: { id: row.id, email: row.email }, session: {} }, error: null };
  }

  async signOut() {
    const token = this.currentToken();
    if (token) await getPool().query(`delete from private.sessions where token_hash = $1`, [sha256(token)]);
    try {
      this.cookies?.delete(SESSION_COOKIE);
    } catch {
      /* ignore */
    }
    this.onUser?.(null);
    return { error: null };
  }

  async getUser(): Promise<{ data: { user: AuthUser | null }; error: AuthError | null }> {
    const user = await this.lookup();
    return { data: { user }, error: null };
  }

  /** Resolve the signed-in user from the session cookie, or null. */
  async lookup(): Promise<AuthUser | null> {
    const token = this.currentToken();
    if (!token) return null;
    const { rows } = await getPool().query(
      `select u.id, u.email, s.last_seen_at
         from private.sessions s join auth.users u on u.id = s.user_id
        where s.token_hash = $1 and s.expires_at > now()
          and (u.banned_until is null or u.banned_until <= now())`,
      [sha256(token)]
    );
    const r = rows[0];
    if (!r) return null;
    if (Date.now() - new Date(r.last_seen_at).getTime() > 60_000) {
      getPool().query(`update private.sessions set last_seen_at = now() where token_hash = $1`, [sha256(token)]).catch(() => {});
    }
    return { id: r.id, email: r.email };
  }

  async updateUser(attrs: { password?: string }): Promise<{ data: { user: AuthUser | null }; error: AuthError | null }> {
    const user = await this.lookup();
    if (!user) return { data: { user: null }, error: { message: "Auth session missing!", status: 401 } };
    if (attrs.password) {
      await setPassword(user.id, attrs.password);
      // sign out every other device, keep this one
      const token = this.currentToken();
      await getPool().query(`delete from private.sessions where user_id = $1 and token_hash <> $2`, [
        user.id,
        sha256(token ?? ""),
      ]);
    }
    return { data: { user }, error: null };
  }

  async resetPasswordForEmail(email: string, opts: { redirectTo?: string } = {}) {
    const { rows } = await getPool().query(`select id, email from auth.users where lower(email) = $1`, [
      String(email).toLowerCase().trim(),
    ]);
    const u = rows[0];
    if (u && opts.redirectTo) {
      const token = newToken();
      await getPool().query(
        `insert into private.password_resets (token_hash, user_id, expires_at) values ($1, $2, now() + interval '1 hour')`,
        [sha256(token), u.id]
      );
      const link = `${opts.redirectTo}${opts.redirectTo.includes("?") ? "&" : "?"}code=${token}`;
      const sent = await sendEmail({
        to: u.email,
        subject: "Reset your Sewiness password",
        body: `Use this link to choose a new password. It works once and expires in one hour.\n\n${link}\n\nIf you did not ask for this, you can ignore this message.`,
        type: "password_reset",
      });
      if (!sent) console.warn("[auth] Password reset requested but no email channel is configured.");
    }
    return { data: {}, error: null };
  }

  /** Redeems a one-time reset link and signs the person in for a short window. */
  async exchangeCodeForSession(code: string): Promise<{ error: AuthError | null }> {
    const { rows } = await getPool().query(
      `update private.password_resets set used_at = now()
        where token_hash = $1 and used_at is null and expires_at > now()
        returning user_id`,
      [sha256(code)]
    );
    if (!rows[0]) return { error: { message: "Invalid or expired link", status: 400 } };
    await this.createSession(rows[0].user_id, 60 * 60 * 1000, false);
    this.onUser?.(rows[0].user_id);
    return { error: null };
  }

  // ----- admin (service-level) -----

  admin = {
    createUser: async <T = undefined>(a: {
      email: string;
      password: string;
      email_confirm?: boolean;
      user_metadata?: object;
      mustChangePassword?: boolean;
      provision?: (client: PoolClient, user: AuthUser) => Promise<T>;
    }): Promise<{ data: { user: AuthUser | null; provisioned?: T }; error: AuthError | null }> => {
      const email = String(a.email || "").toLowerCase().trim();
      const client = await getPool().connect();
      try {
        const passwordHash = await argonHash(String(a.password));
        await client.query("begin");
        const u = await client.query(`insert into auth.users (email) values ($1) returning id, email`, [email]);
        const user = { id: u.rows[0].id, email: u.rows[0].email };
        await client.query(
          `insert into private.credentials (user_id, password_hash, must_change_password) values ($1, $2, $3)`,
          [user.id, passwordHash, a.mustChangePassword === true]
        );
        const provisioned = a.provision ? await a.provision(client, user) : undefined;
        await client.query("commit");
        return { data: { user, provisioned }, error: null };
      } catch (e: any) {
        await client.query("rollback").catch(() => {});
        if (e?.code === "23505") {
          return {
            data: { user: null },
            error: { message: "A user with this email address has already been registered", status: 422, code: "email_exists" },
          };
        }
        return { data: { user: null }, error: { message: e?.message ?? "Could not create user", status: 500 } };
      } finally {
        client.release();
      }
    },

    deleteUser: async (id: string) => {
      await getPool().query(`delete from auth.users where id = $1`, [id]);
      return { data: null, error: null };
    },

    updateUserById: async (
      id: string,
      a: { ban_duration?: string; password?: string; email?: string }
    ): Promise<{ data: { user: { id: string } | null }; error: AuthError | null }> => {
      try {
        if (a.ban_duration !== undefined) {
          if (a.ban_duration === "none") {
            await getPool().query(`update auth.users set banned_until = null where id = $1`, [id]);
          } else {
            const m = a.ban_duration.match(/^(\d+)h$/);
            const hours = m ? Number(m[1]) : 876000;
            await getPool().query(
              `update auth.users set banned_until = now() + ($2 || ' hours')::interval where id = $1`,
              [id, String(hours)]
            );
            // cut off any session that is already open
            await getPool().query(`delete from private.sessions where user_id = $1`, [id]);
          }
        }
        if (a.password) await setPassword(id, a.password);
        if (a.email) await getPool().query(`update auth.users set email = $2 where id = $1`, [id, a.email.toLowerCase().trim()]);
        return { data: { user: { id } }, error: null };
      } catch (e: any) {
        return { data: { user: null }, error: { message: e?.message ?? "Update failed", status: 500 } };
      }
    },
  };
}

async function setPassword(userId: string, password: string) {
  const h = await argonHash(String(password));
  await getPool().query(
    `insert into private.credentials (user_id, password_hash) values ($1, $2)
       on conflict (user_id) do update set password_hash = excluded.password_hash, must_change_password = false, updated_at = now()`,
    [userId, h]
  );
}
