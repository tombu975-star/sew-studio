import { db } from "@/lib/db";

export interface TenantContext {
  userId: string;
  shopId: string;
}

/**
 * Read the session cookie from a Request and return the tenant context
 * (userId + shopId). Returns null if not authenticated.
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

    // Verify the user still exists + belongs to this shop.
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, shopId: true },
    });
    if (!user || user.shopId !== shopId) return null;

    return { userId, shopId };
  } catch {
    return null;
  }
}

/**
 * Helper to build a Prisma `where` clause scoped to the current tenant.
 */
export function tenantWhere(shopId: string, extra: Record<string, unknown> = {}) {
  return { shopId, ...extra };
}
