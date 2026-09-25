import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role Supabase client. This BYPASSES Row Level Security — never
 * import it into a route that just serves ordinary shop-member requests.
 *
 * Legitimate uses only:
 *  - Shop registration (creating the auth user + shop + profile before any
 *    session/RLS context exists for that user)
 *  - Madam/trainer inviting a new staff/trainee account (an admin action
 *    performed on someone else's behalf, via supabase.auth.admin.*)
 *  - The token-authenticated customer portal (/portal/[token]) — the
 *    customer has no Supabase session at all; authorization is the secret
 *    token itself, checked in route code, same as before this migration
 *  - The freelancer-auth flows, which similarly manage a second identity
 *    space outside the shop tenant boundary
 *
 * Every other route should use createServerSupabaseClient() instead, so
 * RLS applies as the signed-in user.
 */
export function createAdminSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
