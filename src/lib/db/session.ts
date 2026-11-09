import { createRequestClient } from "./requestClient";
import type { AppClient } from "@/lib/db/appClient";

export interface TenantContext {
  /** Request-scoped, RLS-aware client — reuse this for every query in the route. */
  db: AppClient;
  userId: string;
  shopId: string;
  role: "madam" | "staff" | "trainer" | "trainee";
  email: string;
  canManageFreelancers: boolean;
}

async function resolveUserId(db: AppClient): Promise<string | null> {
  const user = await db.auth.lookup();
  return user?.id ?? null;
}

/**
 * Resolves the signed-in shop member for the current request. Replaces the
 * old cookie-parsing getTenant() from src/lib/tenant.ts — session state now
 * lives in the app's sign-in's own cookies (managed by @db/ssr), and
 * "does this user belong to this shop" is enforced by RLS on every query
 * `ctx.db` makes, not just by this check.
 *
 * Returns null if there's no session, or no matching profile row yet
 * (e.g. an auth user mid-registration before their profile is created).
 */
export async function getTenant(): Promise<TenantContext | null> {
  try {
    const db = await createRequestClient();
    const userId = await resolveUserId(db);
    if (!userId) return null;

    // `is_active` comes from migration 0012. If that migration hasn't been
    // applied yet the column doesn't exist, so fall back to the old query
    // rather than locking everyone out.
    let profile: {
      id: string;
      shop_id: string;
      role: TenantContext["role"];
      email: string;
      can_manage_freelancers: boolean;
      is_active?: boolean;
      shop?: { suspended_at: string | null } | null;
    } | null = null;
    const withActive = await db
      .from("profiles")
      .select("id, shop_id, role, email, can_manage_freelancers, is_active, shop:shops(suspended_at)")
      .eq("id", userId)
      .single();
    if (withActive.error) {
      const legacy = await db
        .from("profiles")
        .select("id, shop_id, role, email, can_manage_freelancers, shop:shops(suspended_at)")
        .eq("id", userId)
        .single();
      profile = legacy.data;
    } else {
      profile = withActive.data;
    }
    if (!profile) return null;
    // A member the owner has removed keeps their history but loses access
    // immediately, even if their browser session is still valid.
    if (profile.is_active === false) return null;
    // Same for a shop the platform admin has suspended — every existing
    // session for that shop is cut off on its very next request, not just
    // at their next login.
    if (profile.shop?.suspended_at) return null;

    return {
      db,
      userId: profile.id,
      shopId: profile.shop_id,
      role: profile.role,
      email: profile.email,
      canManageFreelancers: profile.can_manage_freelancers,
    };
  } catch {
    return null;
  }
}

/**
 * Freelancer management (commissioning, editing, assigning jobs) is
 * gated on either being the studio owner, or having been granted the
 * canManageFreelancers flag — checked fresh on every request via the
 * tenant context above, never trusted from the client.
 */
export function canManageFreelancers(ctx: TenantContext): boolean {
  return ctx.role === "madam" || ctx.canManageFreelancers === true;
}

export interface FreelancerContext {
  db: AppClient;
  freelancerId: string;
  email: string;
}

/** Same idea as getTenant(), for the separate freelancer identity space. */
export async function getFreelancerSession(): Promise<FreelancerContext | null> {
  try {
    const db = await createRequestClient();
    const user = await db.auth.lookup();
    if (!user) return null;

    const { data: freelancer } = await db
      .from("freelancer_profiles")
      .select("id, email")
      .eq("id", user.id)
      .single();
    if (!freelancer) return null;

    return { db, freelancerId: freelancer.id, email: freelancer.email };
  } catch {
    return null;
  }
}

export interface SystemAdminContext {
  db: AppClient;
  adminId: string;
  email: string;
}

/**
 * Same idea again, for the platform-level system admin identity — a third,
 * separate space from shop members and freelancers. System admin API
 * routes check this, then do their actual data access through the
 * service-role client (see adminClient.ts), not ctx.db, since admin
 * work is explicitly meant to cross shop boundaries that RLS otherwise
 * enforces everywhere else.
 */
export async function getSystemAdminSession(): Promise<SystemAdminContext | null> {
  try {
    const db = await createRequestClient();
    const user = await db.auth.lookup();
    if (!user) return null;

    const { data: admin } = await db
      .from("system_admins")
      .select("id, email")
      .eq("id", user.id)
      .single();
    if (!admin) return null;

    return { db, adminId: admin.id, email: admin.email };
  } catch {
    return null;
  }
}
