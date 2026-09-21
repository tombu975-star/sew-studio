import { db } from "@/lib/db";

export async function GET() {
  try {
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
        include: {
          customer: true,
          assignedStaff: true,
          payments: { orderBy: { date: "asc" } },
          fittings: { orderBy: { date: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.payment.findMany({
        orderBy: { date: "desc" },
      }),
      db.fitting.findMany({
        include: { order: { include: { customer: true } } },
        orderBy: { date: "asc" },
      }),
      db.task.findMany({
        include: { order: { include: { customer: true } }, staff: true },
        orderBy: { createdAt: "desc" },
      }),
      db.user.findMany({ orderBy: { createdAt: "asc" } }),
      db.customer.findMany({ orderBy: { createdAt: "desc" } }),
      db.styleConcept.findMany({
        include: { customer: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    let settings = await db.settings.findFirst();
    if (!settings) {
      settings = await db.settings.create({
        data: { ownerGender: "Madam", studioName: "Madam Studio" },
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
