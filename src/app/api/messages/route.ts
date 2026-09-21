import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";

// GET /api/messages — studio outbox: all messages sent to customers in this shop.
// Optional ?customerId= filter.
export async function GET(req: Request) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(req.url);
    const customerId = url.searchParams.get("customerId");
    const where: Record<string, unknown> = { shopId: ctx.shopId };
    if (customerId) where.customerId = customerId;

    const messages = await db.customerNotification.findMany({
      where,
      orderBy: { sentAt: "desc" },
      take: 200,
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true, whatsapp: true } },
        order: { select: { id: true, garmentDesign: true } },
      },
    });
    return Response.json(messages);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
