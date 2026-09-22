import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";

export async function GET(req: Request) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      orders,
      payments,
      fittings,
      tasks,
      users,
      customers,
      styleConcepts,
    ] = await Promise.all([
      db.order.findMany({
        where: { shopId: ctx.shopId },
        include: {
          customer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.payment.findMany({
        where: { order: { shopId: ctx.shopId } },
        orderBy: { date: "desc" },
      }),
      db.fitting.findMany({
        where: { order: { shopId: ctx.shopId } },
        include: { order: { include: { customer: true } } },
        orderBy: { date: "asc" },
      }),
      db.task.findMany({
        where: { shopId: ctx.shopId },
        include: { order: { include: { customer: true } }, staff: true },
        orderBy: { createdAt: "desc" },
      }),
      db.user.findMany({
        where: { shopId: ctx.shopId },
        orderBy: { createdAt: "asc" },
      }),
      db.customer.findMany({
        where: { shopId: ctx.shopId },
        orderBy: { createdAt: "desc" },
      }),
      db.styleConcept.findMany({
        where: { shopId: ctx.shopId },
        include: { customer: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    let settings = await db.settings.findUnique({
      where: { shopId: ctx.shopId },
    });
    if (!settings) {
      settings = await db.settings.create({
        data: { shopId: ctx.shopId, ownerGender: "Madam", studioName: "Madam Studio" },
      });
    }

    return Response.json({
      orders,
      payments,
      fittings,
      tasks,
      users,
      customers,
      settings,
      styleConcepts,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
