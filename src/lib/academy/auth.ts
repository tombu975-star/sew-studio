// Sign-in for Academy learners: an email code (or link), no password to forget.
// Separate from studio, freelancer and admin sign-in.
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getPool } from "@/lib/db/pool";
import { sendEmail } from "@/lib/mailer";
import { getAppBaseUrl } from "@/lib/website-content.server";

export const LEARNER_COOKIE = "sew_learner";
const SESSION_DAYS = 60;
const CODE_MINUTES = 15;
const sha = (v: string) => createHash("sha256").update(v).digest("hex");

export type Learner = { id: string; email: string; fullName: string };

export const isEmail = (v: string) => v.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(v);

export async function getLearner(): Promise<Learner | null> {
  try {
    const token = (await cookies()).get(LEARNER_COOKIE)?.value;
    if (!token || token.length < 20 || token.length > 200) return null;
    const { rows } = await getPool().query(
      `select l.id, l.email, l.full_name from public.academy_learner_sessions s
         join public.academy_learners l on l.id = s.learner_id
        where s.token_hash = $1 and s.expires_at > now()`, [sha(token)]);
    if (!rows[0]) return null;
    void getPool().query(`update public.academy_learners set last_seen_at = now() where id = $1 and (last_seen_at is null or last_seen_at < now() - interval '1 hour')`, [rows[0].id]).catch(() => undefined);
    return { id: rows[0].id, email: rows[0].email, fullName: rows[0].full_name };
  } catch { return null; }
}

export async function startSession(learnerId: string) {
  const token = randomBytes(32).toString("base64url");
  await getPool().query(
    `insert into public.academy_learner_sessions (token_hash, learner_id, expires_at) values ($1, $2, now() + ($3 || ' days')::interval)`,
    [sha(token), learnerId, String(SESSION_DAYS)]);
  (await cookies()).set(LEARNER_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DAYS * 86400 });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(LEARNER_COOKIE)?.value;
  if (token) await getPool().query("delete from public.academy_learner_sessions where token_hash = $1", [sha(token)]).catch(() => undefined);
  jar.delete(LEARNER_COOKIE);
}

/** Creates the learner if new, then emails a 6-digit code and a one-tap link. */
export async function requestSignIn(email: string, name: string, next: string) {
  const pool = getPool();
  const fallback = email.split("@")[0].replace(/[._-]+/g, " ").trim().slice(0, 120) || "Learner";
  const { rows } = await pool.query(
    `insert into public.academy_learners (email, full_name) values ($1, $2)
       on conflict (lower(email)) do update set email = public.academy_learners.email
     returning id, full_name`, [email, name || fallback]);
  const learner = rows[0];
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const token = randomBytes(32).toString("base64url");
  await pool.query("delete from public.academy_auth_codes where learner_id = $1 and used_at is null", [learner.id]);
  await pool.query(
    `insert into public.academy_auth_codes (learner_id, code_hash, token_hash, expires_at) values ($1, $2, $3, now() + ($4 || ' minutes')::interval)`,
    [learner.id, sha(`${learner.id}:${code}`), sha(token), String(CODE_MINUTES)]);
  const base = await getAppBaseUrl();
  const link = `${base}/api/academy/auth/link?t=${token}&next=${encodeURIComponent(safeNext(next))}`;
  await sendEmail({
    to: email, type: "academy-sign-in", subject: `Your Sewsiness Academy code: ${code}`,
    body: `Hello ${learner.full_name},\n\nYour sign-in code is ${code}. It works for ${CODE_MINUTES} minutes.\n\nOr open this link on the same device: ${link}\n\nIf you did not ask for this, you can ignore this email.\n\nThe Sewsiness team`,
  }).catch(() => undefined);
}

/** Only same-site paths are allowed as a return address. */
export function safeNext(next: unknown): string {
  return typeof next === "string" && /^\/(?!\/)[\w\-./?=&%#]*$/.test(next) && next.length < 300 ? next : "/academy/me";
}

export async function verifyCode(email: string, code: string): Promise<string | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select c.id, c.learner_id, c.code_hash, c.attempts from public.academy_auth_codes c
       join public.academy_learners l on l.id = c.learner_id
      where lower(l.email) = lower($1) and c.used_at is null and c.expires_at > now()
      order by c.created_at desc limit 1`, [email]);
  const row = rows[0];
  if (!row || row.attempts >= 5) return null;
  const a = Buffer.from(sha(`${row.learner_id}:${code}`)), b = Buffer.from(row.code_hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await pool.query("update public.academy_auth_codes set attempts = attempts + 1 where id = $1", [row.id]);
    return null;
  }
  await pool.query("update public.academy_auth_codes set used_at = now() where id = $1", [row.id]);
  return row.learner_id;
}

export async function verifyLinkToken(token: string): Promise<string | null> {
  if (token.length < 20 || token.length > 100) return null;
  const { rows } = await getPool().query(
    `update public.academy_auth_codes set used_at = now()
      where token_hash = $1 and used_at is null and expires_at > now() returning learner_id`, [sha(token)]);
  return rows[0]?.learner_id ?? null;
}
