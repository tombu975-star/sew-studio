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
    const amount = Number(body.amount) || 0;
    const payment = await db.payment.create({
      data: {
        orderId: id,
        amount,
        method: body.method ? String(body.method) : null,
        note: body.note ? String(body.note) : null,
        date: body.date ? new Date(body.date) : new Date(),
      },
    });

    // Notify the customer that a payment was received.
    await notifyCustomer({
      shopId: ctx.shopId,
      customerId: order.customerId,
      orderId: id,
      type: "payment_received",
      title: "Payment received",
      body: `We've received a payment of GHS ${amount.toLocaleString("en-GB")} for your order (${order.garmentDesign}). Thank you!`,
    });

    return Response.json(payment, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
