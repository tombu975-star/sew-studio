import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const order = await db.order.findUnique({ where: { id } });
    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }
    const payment = await db.payment.create({
      data: {
        orderId: id,
        amount: Number(body.amount) || 0,
        method: body.method ? String(body.method) : null,
        note: body.note ? String(body.note) : null,
        date: body.date ? new Date(body.date) : new Date(),
      },
    });
    return Response.json(payment, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
