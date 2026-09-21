import { db } from "@/lib/db";

// GET /api/portal/[token] — public customer portal.
// Returns the customer + their orders + the shop's contact info.
// No auth — the token IS the credential.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const customer = await db.customer.findUnique({
      where: { portalToken: token },
      include: {
        shop: { select: { id: true, name: true, currency: true } },
        orders: {
          orderBy: { orderDate: "desc" },
          include: {
            payments: { orderBy: { date: "asc" } },
            fittings: { orderBy: { date: "asc" } },
          },
        },
      },
    });
    if (!customer) {
      return Response.json({ error: "Invalid or expired link" }, { status: 404 });
    }
    return Response.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
      shop: customer.shop,
      orders: customer.orders.map((o) => ({
        id: o.id,
        garmentDesign: o.garmentDesign,
        designImage: o.designImage,
        orderDate: o.orderDate,
        deliveryDate: o.deliveryDate,
        status: o.status,
        priority: o.priority,
        payments: o.payments,
        fittings: o.fittings,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
