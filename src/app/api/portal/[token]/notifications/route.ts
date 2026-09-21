import { db } from "@/lib/db";

// GET /api/portal/[token]/notifications — customer's alert timeline (public).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const customer = await db.customer.findUnique({
      where: { portalToken: token },
      select: { id: true },
    });
    if (!customer) {
      return Response.json({ error: "Invalid or expired link" }, { status: 404 });
    }
    const notifications = await db.customerNotification.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        order: { select: { id: true, garmentDesign: true } },
      },
    });
    return Response.json(notifications);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// PATCH /api/portal/[token]/notifications — mark all as read
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const customer = await db.customer.findUnique({
      where: { portalToken: token },
      select: { id: true },
    });
    if (!customer) {
      return Response.json({ error: "Invalid or expired link" }, { status: 404 });
    }
    await db.customerNotification.updateMany({
      where: { customerId: customer.id, readAt: null },
      data: { readAt: new Date() },
    });
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
