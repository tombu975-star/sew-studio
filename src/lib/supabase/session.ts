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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, shop_id, role, email, can_manage_freelancers")
      .eq("id", user.id)
      .single();
    if (!profile) return null;

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
