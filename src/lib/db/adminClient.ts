import { AppClient } from "@/lib/db/appClient";

/**
 * Service-level database client. This BYPASSES row-level security — never
 * import it into a route that just serves ordinary shop-member requests.
 *
 * Legitimate uses only:
 *  - Shop registration (creating the user + shop + profile before any
 *    session exists for that user)
 *  - Inviting a new staff/trainee account on someone else's behalf
 *  - The token-authenticated customer portal (/portal/[token])
 *  - The freelancer and system-admin flows, which sit outside the shop
 *    tenant boundary
 */
export function createAdminClient() {
  return new AppClient("service_role");
}
