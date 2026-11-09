import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { Pool } from "pg";

const scrypt = promisify(scryptCallback);
export const RAILWAY_SESSION_COOKIE = "madam_session";
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const REMEMBERED_SESSION_SECONDS = 30 * 24 * 60 * 60;

type IdentityType = "shop" | "freelancer" | "system_admin";

type ShopLoginProfile = {
  id: string;
  email: string;
  fullName: string;
  role: "madam" | "staff" | "trainer" | "trainee";
  gender: string | null;
  phone: string | null;
  avatarUrl: string | null;
  shopId: string;
  canAccessOrders: boolean;
  canAccessBoard: boolean;
  canManageFreelancers: boolean;
  isActive: boolean;
  shop: { id: string; name: string; slug: string; currency: string };
  suspendedAt: string | null;
  suspendedReason: string | null;
};

interface CredentialRecord {
  identity_type: IdentityType;
  identity_id: string;
  email: string;
  password_hash: string;
}

let pool: Pool | undefined;

export function isRailwayAuthEnabled(): boolean {
  return process.env.USE_RAILWAY_AUTH === "1" || process.env.USE_RAILWAY_AUTH === "true";
}

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  pool ??= new Pool({ connectionString, max: 5, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 5_000 });
  return pool;
}

export function hashRailwayToken(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function createRailwaySessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Store password hashes as scrypt$salt$digest. Never store plaintext passwords. */
export async function hashRailwayPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyRailwayPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, saltText, keyText, extra] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltText || !keyText || extra !== undefined) return false;
  try {
    const salt = Buffer.from(saltText, "base64url");
    const expected = Buffer.from(keyText, "base64url");
    if (salt.length !== 16 || expected.length !== 64) return false;
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function findRailwayCredential(email: string): Promise<CredentialRecord | null> {
  const result = await getPool().query<CredentialRecord>(
    `select identity_type, identity_id, email, password_hash
       from public.app_credentials
      where lower(email) = lower($1)
      limit 1`,
    [email.trim()]
  );
  return result.rows[0] ?? null;
}

export async function createRailwaySession(args: {
  identityType: IdentityType;
  identityId: string;
  rememberMe?: boolean;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = createRailwaySessionToken();
  const duration = args.rememberMe ? REMEMBERED_SESSION_SECONDS : SESSION_SECONDS;
  const expiresAt = new Date(Date.now() + duration * 1000);
  await getPool().query(
    `insert into public.app_sessions (token_hash, identity_type, identity_id, expires_at, last_seen_at)
     values ($1, $2, $3, $4, now())`,
    [hashRailwayToken(token), args.identityType, args.identityId, expiresAt]
  );
  return { token, expiresAt };
}

export async function setRailwaySessionCookie(token: string, maxAgeSeconds = SESSION_SECONDS) {
  const cookieStore = await cookies();
  cookieStore.set(RAILWAY_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearRailwaySessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(RAILWAY_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function revokeRailwaySession(token: string): Promise<void> {
  await getPool().query("delete from public.app_sessions where token_hash = $1", [hashRailwayToken(token)]);
}

export async function getRailwaySessionCookieToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(RAILWAY_SESSION_COOKIE)?.value ?? null;
}

async function getShopProfile(identityId: string): Promise<ShopLoginProfile | null> {
  const result = await getPool().query<Record<string, unknown>>(
    `select p.id,
            p.email,
            p.full_name as full_name,
            p.role,
            p.gender,
            p.phone,
            p.avatar_url,
            p.shop_id,
            p.can_access_orders,
            p.can_access_board,
            p.can_manage_freelancers,
            coalesce(p.is_active, true) as is_active,
            s.id as shop_id_value,
            s.name as shop_name,
            s.slug as shop_slug,
            s.currency as shop_currency,
            s.suspended_at,
            s.suspended_reason
       from public.profiles p
       join public.shops s on s.id = p.shop_id
      where p.id = $1
      limit 1`,
    [identityId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    fullName: String(row.full_name),
    role: row.role as ShopLoginProfile["role"],
    gender: row.gender as string | null,
    phone: row.phone as string | null,
    avatarUrl: row.avatar_url as string | null,
    shopId: String(row.shop_id),
    canAccessOrders: Boolean(row.can_access_orders),
    canAccessBoard: Boolean(row.can_access_board),
    canManageFreelancers: Boolean(row.can_manage_freelancers),
    isActive: Boolean(row.is_active),
    shop: {
      id: String(row.shop_id_value),
      name: String(row.shop_name),
      slug: String(row.shop_slug),
      currency: String(row.shop_currency),
    },
    suspendedAt: row.suspended_at ? String(row.suspended_at) : null,
    suspendedReason: row.suspended_reason ? String(row.suspended_reason) : null,
  };
}

export async function authenticateRailwayShop(email: string, password: string, rememberMe = false): Promise<
  | { ok: true; user: ShopLoginProfile; token: string; maxAgeSeconds: number }
  | { ok: false; status: 401 | 403; error: string }
> {
  const credential = await findRailwayCredential(email);
  if (!credential || credential.identity_type !== "shop" || !(await verifyRailwayPassword(password, credential.password_hash))) {
    return { ok: false, status: 401, error: "Invalid email or password." };
  }

  const profile = await getShopProfile(credential.identity_id);
  if (!profile || !profile.isActive) {
    return { ok: false, status: 401, error: "This account is unavailable. Contact your studio owner." };
  }
  if (profile.suspendedAt) {
    return {
      ok: false,
      status: 403,
      error: profile.suspendedReason
        ? `This studio's account is suspended: ${profile.suspendedReason}`
        : "This studio's account is currently suspended. Contact support for help.",
    };
  }

  const session = await createRailwaySession({ identityType: "shop", identityId: profile.id, rememberMe });
  return {
    ok: true,
    user: profile,
    token: session.token,
    maxAgeSeconds: rememberMe ? REMEMBERED_SESSION_SECONDS : SESSION_SECONDS,
  };
}

/** Returns the shop-member profile for a valid Railway session, otherwise null. */
export async function getRailwayShopSession(): Promise<ShopLoginProfile | null> {
  if (!isRailwayAuthEnabled()) return null;
  const token = await getRailwaySessionCookieToken();
  if (!token) return null;

  const result = await getPool().query<{ identity_id: string }>(
    `select identity_id
       from public.app_sessions
      where token_hash = $1
        and identity_type = 'shop'
        and expires_at > now()
      limit 1`,
    [hashRailwayToken(token)]
  );
  const identityId = result.rows[0]?.identity_id;
  if (!identityId) return null;
  const profile = await getShopProfile(identityId);
  if (!profile || !profile.isActive || profile.suspendedAt) return null;

  // Touch session only after successful validation; sliding expiration is not used.
  await getPool().query(
    `update public.app_sessions set last_seen_at = now() where token_hash = $1`,
    [hashRailwayToken(token)]
  );
  return profile;
}
