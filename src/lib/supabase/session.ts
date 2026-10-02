import { createServerSupabaseClient } from "./serverClient";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export interface TenantContext {
  /** Request-scoped, RLS-aware client — reuse this for every query in the route. */
  supabase: SupabaseClient<Database>;
  userId: string;
  shopId: string;
  role: "madam" | "staff" | "trainer" | "trainee";
  email: string;
  canManageFreelancers: boolean;
}

/**
 * Resolves the signed-in user's id as cheaply as possible. getClaims()
 * verifies the session JWT locally against the project's signing keys, so it
 * skips the network round-trip to Supabase Auth that getUser() makes on every
 * single API request (it falls back to that call itself when local
 * verification isn't available). RLS still enforces tenancy on every query,
 * so this only changes how quickly we learn who the caller is.
 */
async function resolveUserId(supabase: SupabaseClient<Database>): Promise<string | null> {
  const auth = supabase.auth as unknown as {
    getClaims?: () => Promise<{ data: { claims?: { sub?: string } } | null }>;
  };
  if (typeof auth.getClaims === "function") {
    const { data } = await auth.getClaims();
    const sub = data?.claims?.sub;
    if (sub) return sub;
    return null;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Resolves the signed-in shop member for the current request. Replaces the
 * old cookie-parsing getTenant() from src/lib/tenant.ts — session state now
 * lives in Supabase Auth's own cookies (managed by @supabase/ssr), and
 * "does this user belong to this shop" is enforced by RLS on every query
 * `ctx.supabase` makes, not just by this check.
 *
 * Returns null if there's no session, or no matching profile row yet
 * (e.g. an auth user mid-registration before their profile is created).
 */
export async function getTenant(): Promise<TenantContext | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await resolveUserId(supabase);
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
    const withActive = await supabase
      .from("profiles")
      .select("id, shop_id, role, email, can_manage_freelancers, is_active, shop:shops(suspended_at)")
      .eq("id", userId)
      .single();
    if (withActive.error) {
      const legacy = await supabase
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
      supabase,
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
  supabase: SupabaseClient<Database>;
  freelancerId: string;
  email: string;
}

/** Same idea as getTenant(), for the separate freelancer identity space. */
export async function getFreelancerSession(): Promise<FreelancerContext | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: freelancer } = await supabase
      .from("freelancer_profiles")
      .select("id, email")
      .eq("id", user.id)
      .single();
    if (!freelancer) return null;

    return { supabase, freelancerId: freelancer.id, email: freelancer.email };
  } catch {
    return null;
  }
}

export interface SystemAdminContext {
  supabase: SupabaseClient<Database>;
  adminId: string;
  email: string;
}

/**
 * Same idea again, for the platform-level system admin identity — a third,
 * separate space from shop members and freelancers. System admin API
 * routes check this, then do their actual data access through the
 * service-role client (see adminClient.ts), not ctx.supabase, since admin
 * work is explicitly meant to cross shop boundaries that RLS otherwise
 * enforces everywhere else.
 */
export async function getSystemAdminSession(): Promise<SystemAdminContext | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: admin } = await supabase
      .from("system_admins")
      .select("id, email")
      .eq("id", user.id)
      .single();
    if (!admin) return null;

    return { supabase, adminId: admin.id, email: admin.email };
  } catch {
    return null;
  }
}
