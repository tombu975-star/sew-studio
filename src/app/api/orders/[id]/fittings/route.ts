import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { notifyCustomer } from "@/lib/notify";

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
    const body = await req.json();
    // Verify the parent order belongs to the tenant.
    const order = await db.order.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true, customerId: true, garmentDesign: true },
    });
    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }
    const fittingDate = body.date ? new Date(body.date) : new Date();
    const fittingStatus = body.status ? String(body.status) : "Scheduled";
    const fitting = await db.fitting.create({
      data: {
        orderId: id,
        date: fittingDate,
        status: fittingStatus,
        notes: body.notes ? String(body.notes) : null,
      },
    });

    // Notify the customer about the fitting.
    if (fittingStatus === "Scheduled") {
      const dateStr = fittingDate.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      await notifyCustomer({
        shopId: ctx.shopId,
        customerId: order.customerId,
        orderId: id,
        type: "fitting_scheduled",
        title: "Fitting scheduled",
        body: `A fitting has been scheduled for ${dateStr} for your order (${order.garmentDesign}). We can't wait to see you!`,
      });
    }

    return Response.json(fitting, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
