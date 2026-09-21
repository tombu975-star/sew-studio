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
    const fitting = await db.fitting.create({
      data: {
        orderId: id,
        date: body.date ? new Date(body.date) : new Date(),
        status: body.status ? String(body.status) : "Scheduled",
        notes: body.notes ? String(body.notes) : null,
      },
    });
    return Response.json(fitting, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
