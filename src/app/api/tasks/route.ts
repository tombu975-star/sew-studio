import { db } from "@/lib/db";
import { getTenant, tenantWhere } from "@/lib/tenant";

// GET /api/tasks — list tasks with relations
//
// Scoped by role, not just by tenant: owner and trainers oversee the whole
// shop, so they see every task. Staff and trainees only work their own
// assignments, so this only returns tasks assigned to them. Enforced here
// (not just filtered in the UI) since the client's claimed role can't be
// trusted — mirrors the same pattern in /api/orders.
export async function GET(req: Request) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canSeeAll = ctx.role === "madam" || ctx.role === "trainer";
    const where = canSeeAll
      ? tenantWhere(ctx.shopId)
      : tenantWhere(ctx.shopId, { staffId: ctx.userId });

    const tasks = await db.task.findMany({
      where,
      include: {
        order: { include: { customer: true } },
        staff: true,
        gradedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return Response.json(tasks);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {
      shopId: ctx.shopId,
      title: String(body.title ?? "").trim(),
      status: body.status ? String(body.status) : "To Do",
      priority: body.priority ? String(body.priority) : "Medium",
    };
    if (body.orderId) {
      // Verify the parent order belongs to the tenant.
      const order = await db.order.findFirst({
        where: { id: String(body.orderId), shopId: ctx.shopId },
        select: { id: true },
      });
      if (!order) {
        return Response.json({ error: "Order not found" }, { status: 404 });
      }
      data.orderId = String(body.orderId);
    }
    if (body.staffId) {
      // Verify staff belongs to tenant.
      const staff = await db.user.findFirst({
        where: { id: String(body.staffId), shopId: ctx.shopId },
        select: { id: true, role: true, mentorId: true },
      });
      if (staff) {
        // A trainer may only hand out work to trainees they personally mentor.
        const allowed =
          ctx.role !== "trainer" ||
          (staff.role === "trainee" && staff.mentorId === ctx.userId);
        if (allowed) data.staffId = String(body.staffId);
      }
    }
    if (body.dueDate) data.dueDate = new Date(body.dueDate);
    if (body.notes) data.notes = String(body.notes);
    const task = await db.task.create({
      data: data as Parameters<typeof db.task.create>[0]["data"],
      include: { order: { include: { customer: true } }, staff: true },
    });
    return Response.json(task, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
