import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";

// GET /api/portfolio?staffId=ID — portfolio of completed work.
// Without staffId: studio-wide portfolio (all completed/collected orders with images).
// With staffId: that person's portfolio (orders assigned to them).
export async function GET(req: Request) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const staffId = url.searchParams.get("staffId");
    const where = {
      shopId: ctx.shopId,
      status: { in: ["Completed", "Collected/Delivered"] },
      ...(staffId ? { assignedStaffId: staffId } : {}),
    };
    const orders = await db.order.findMany({
      where,
      orderBy: { orderDate: "desc" },
      include: {
        customer: { select: { id: true, name: true } },
        assignedStaff: { select: { id: true, fullName: true } },
      },
      take: 100,
    });
    return Response.json(orders);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
