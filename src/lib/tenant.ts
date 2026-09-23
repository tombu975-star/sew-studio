import { db } from "@/lib/db";

export interface TenantContext {
  userId: string;
  shopId: string;
  role: string;
  canManageFreelancers: boolean;
}

/**
 * Read the session cookie from a Request and return the tenant context
 * (userId + shopId + role). Returns null if not authenticated.
 *
 * The session cookie is `base64(userId:shopId)` — set on login.
 */
export async function getTenant(req: Request): Promise<TenantContext | null> {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/ms_session=([^;]+)/);
    if (!match) return null;

    const decoded = Buffer.from(match[1], "base64").toString("utf-8");
    const [userId, shopId] = decoded.split(":");
    if (!userId || !shopId) return null;

    // Verify the user still exists + belongs to this shop, and pick up
    // their current role + granted permissions (so callers can authorize
    // sensitive actions — always looked up fresh per-request, never
    // trusted from the client).
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        shopId: true,
        role: true,
        canManageFreelancers: true,
      },
    });
    if (!user || user.shopId !== shopId) return null;

    return {
      userId,
      shopId,
      role: user.role,
      canManageFreelancers: user.canManageFreelancers,
    };
  } catch {
    return null;
  }
}

/**
 * Freelancer management (commissioning, editing, assigning jobs) is
 * owner-only by default. The owner can grant it to any other member via
 * their canManageFreelancers flag — checked fresh on every request via
 * the tenant context above, never trusted from the client.
 */
export function canManageFreelancers(ctx: TenantContext): boolean {
  return ctx.role === "madam" || ctx.canManageFreelancers === true;
}

/**
 * Helper to build a Prisma `where` clause scoped to the current tenant.
 */
export function tenantWhere(shopId: string, extra: Record<string, unknown> = {}) {
  return { shopId, ...extra };
}
