import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { ensurePortalToken } from "@/lib/notify";

// POST /api/customers/[id]/portal-token — generate (or return existing) portal token
// so the owner can share a tracking link with the customer.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    // Verify customer belongs to tenant.
    const customer = await db.customer.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true, name: true },
    });
    if (!customer) {
      return Response.json({ error: "Customer not found" }, { status: 404 });
    }
    const token = await ensurePortalToken(id);
    return Response.json({ token, url: `/portal?token=${token}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
