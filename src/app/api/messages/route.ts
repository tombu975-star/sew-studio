import { getTenant } from "@/lib/supabase/session";

// GET /api/messages — studio outbox: all messages sent to customers in this shop.
// Optional ?customerId= filter.
export async function GET(req: Request) {
  try {
    const ctx = await getTenant();
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(req.url);
    const customerId = url.searchParams.get("customerId");

    let query = ctx.supabase
      .from("customer_notifications")
      .select(
        "*, customer:customers(id, name, phone, email, whatsapp), order:orders(id, garment_design)"
      )
      .eq("shop_id", ctx.shopId);
    if (customerId) query = query.eq("customer_id", customerId);

    const { data: messages, error } = await query
      .order("sent_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    return Response.json(
      messages.map((n) => ({
        id: n.id,
        shopId: n.shop_id,
        customerId: n.customer_id,
        customer: n.customer,
        orderId: n.order_id,
        order: n.order ? { id: n.order.id, garmentDesign: n.order.garment_design } : null,
        type: n.type,
        title: n.title,
        body: n.body,
        statusFrom: n.status_from,
        statusTo: n.status_to,
        readAt: n.read_at,
        direction: n.direction,
        channel: n.channel,
        recipient: n.recipient,
        deliveryStatus: n.delivery_status,
        sentAt: n.sent_at,
        createdAt: n.created_at,
      }))
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
