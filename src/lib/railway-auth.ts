import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { Client } from "pg";

export const RAILWAY_SESSION_COOKIE = "madam_session";

export function isRailwayAuthEnabled(): boolean {
  return process.env.USE_RAILWAY_AUTH === "1" || process.env.USE_RAILWAY_AUTH === "true";
}

export function getRailwayDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;
}

export async function hashRailwayToken(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function createRailwaySessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function setRailwaySessionCookie(token: string, maxAgeSeconds = 60 * 60 * 24 * 30) {
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

export async function getRailwaySessionContext(): Promise<any | null> {
  if (!isRailwayAuthEnabled()) return null;
  const dbUrl = getRailwayDatabaseUrl();
  if (!dbUrl) return null;

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(RAILWAY_SESSION_COOKIE)?.value;
  if (!cookieValue) return null;

  try {
    const client = new Client({ connectionString: dbUrl });
    await client.connect();

    try {
      const tokenHash = await hashRailwayToken(cookieValue);
      const result = await client.query(
        `
          select p.id as user_id,
                 p.shop_id,
                 p.role,
                 p.email,
                 p.can_manage_freelancers,
                 p.is_active,
                 p.shop_id as tenant_id,
                 s.identity_type,
                 s.expires_at
          from public.app_sessions s
          left join public.profiles p on p.id = s.identity_id
          where s.token_hash = $1
            and s.expires_at > now()
          limit 1;
        `,
        [tokenHash]
      );

      const row = result.rows[0];
      if (!row) return null;

      const profile = {
        id: row.user_id,
        shop_id: row.shop_id,
        role: row.role,
        email: row.email,
        can_manage_freelancers: row.can_manage_freelancers,
        is_active: row.is_active,
      };

      if (profile.is_active === false) return null;

      return {
        supabase: null,
        userId: profile.id,
        shopId: profile.shop_id,
        role: profile.role,
        email: profile.email,
        canManageFreelancers: Boolean(profile.can_manage_freelancers),
      };
    } finally {
      await client.end();
    }
  } catch {
    return null;
  }
}

export async function issueRailwaySessionTokenForUser(args: {
  identityType: "shop" | "freelancer" | "system_admin";
  identityId: string;
  userEmail?: string;
  rememberMe?: boolean;
}): Promise<{ token: string; expiresAt: Date } | null> {
  if (!isRailwayAuthEnabled()) return null;
  const dbUrl = getRailwayDatabaseUrl();
  if (!dbUrl) return null;

  try {
    const token = createRailwaySessionToken();
    const tokenHash = await hashRailwayToken(token);
    const expiresAt = new Date(Date.now() + (args.rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000);

    const client = new Client({ connectionString: dbUrl });
    await client.connect();
    try {
      await client.query(
        `
          insert into public.app_sessions (token_hash, identity_type, identity_id, expires_at, last_seen_at)
          values ($1, $2, $3, $4, now())
          on conflict (token_hash)
          do update set identity_type = excluded.identity_type,
                        identity_id = excluded.identity_id,
                        expires_at = excluded.expires_at,
                        last_seen_at = now();
        `,
        [tokenHash, args.identityType, args.identityId, expiresAt]
      );
    } finally {
      await client.end();
    }

    return { token, expiresAt };
  } catch {
    return null;
  }
}
