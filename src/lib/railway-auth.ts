import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { Pool } from "pg";

const scrypt = promisify(scryptCallback);
export const RAILWAY_SESSION_COOKIE = "madam_session";
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const REMEMBERED_SESSION_SECONDS = 30 * 24 * 60 * 60;

type IdentityType = "shop" | "freelancer" | "system_admin";

export interface RailwayShopIdentity {
  identityType: "shop";
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
  shop: { id: string; name: string; slug: string; currency: string };
}

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
  const expiresAt = new Date(Date.now() + (args.rememberMe ? REMEMBERED_SESSION_SECONDS : SESSION_SECONDS) * 1000);
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

/** Returns the shop-member profile for a valid Railway session, otherwise null. */
export async function getRailwayShopSession(): Promise<RailwayShopIdentity | null> {
  if (!isRailwayAuthEnabled()) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(RAILWAY_SESSION_COOKIE)?.value;
  if (!token) return null;

  const result = await getPool().query<Record<string, unknown>>(
    `select p.id,
            p.email,
            p.full_name as "fullName",
            p.role,
            p.gender,
            p.phone,
            p.avatar_url as "avatarUrl",
            p.shop_id as "shopId",
            p.can_access_orders as "canAccessOrders",
            p.can_access_board as "canAccessBoard",
            p.can_manage_freelancers as "canManageFreelancers",
            s.id as shop_id,
            s.name as shop_name,
            s.slug as shop_slug,
            s.currency as shop_currency
       from public.app_sessions session
       join public.profiles p on p.id = session.identity_id
       join public.shops s on s.id = p.shop_id
      where session.token_hash = $1
        and session.identity_type = 'shop'
        and session.expires_at > now()
        and coalesce(p.is_active, true) = true
        and s.suspended_at is null
      limit 1`,
    [hashRailwayToken(token)]
  );
  const row = result.rows[0];
  if (!row) return null;

  return {
    identityType: "shop",
    id: String(row.id),
    email: String(row.email),
    fullName: String(row.fullName),
    role: row.role as RailwayShopIdentity["role"],
    gender: row.gender as string | null,
    phone: row.phone as string | null,
    avatarUrl: row.avatarUrl as string | null,
    shopId: String(row.shopId),
    canAccessOrders: Boolean(row.canAccessOrders),
    canAccessBoard: Boolean(row.canAccessBoard),
    canManageFreelancers: Boolean(row.canManageFreelancers),
    shop: {
      id: String(row.shop_id),
      name: String(row.shop_name),
      slug: String(row.shop_slug),
      currency: String(row.shop_currency),
    },
  };
}
