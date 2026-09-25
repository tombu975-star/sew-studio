import { getTenant } from "@/lib/supabase/session";
import { detectChannel } from "@/lib/notify";

// POST /api/customers/[id]/send-message — studio manually sends a message to a customer.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { title, body: text, channel, orderId } = body || {};
    if (!text) {
      return Response.json({ error: "Message body is required." }, { status: 400 });
    }

    const { data: customer } = await ctx.supabase
      .from("customers")
      .select("id, whatsapp, phone, email")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!customer) return Response.json({ error: "Customer not found" }, { status: 404 });

    const resolved = channel
      ? {
          channel: channel as "whatsapp" | "sms" | "email" | "in_app",
          recipient:
            channel === "whatsapp"
              ? customer.whatsapp || ""
              : channel === "sms"
                ? customer.phone || ""
                : channel === "email"
                  ? customer.email || ""
                  : "",
        }
      : detectChannel(customer);

    const { data: notification, error } = await ctx.supabase
      .from("customer_notifications")
      .insert({
        shop_id: ctx.shopId,
        customer_id: id,
        order_id: orderId || null,
        type: "message",
        title: title || "Message from the studio",
        body: String(text),
        direction: "manual",
        channel: resolved.channel,
        recipient: resolved.recipient || null,
        delivery_status: "sent",
        sent_at: new Date().toISOString(),
      })
      .select("*, order:orders(id, garment_design)")
      .single();
    if (error) throw error;

    return Response.json(
      {
        id: notification.id,
        shopId: notification.shop_id,
        customerId: notification.customer_id,
        orderId: notification.order_id,
        order: notification.order
          ? { id: notification.order.id, garmentDesign: notification.order.garment_design }
          : null,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        direction: notification.direction,
        channel: notification.channel,
        recipient: notification.recipient,
        deliveryStatus: notification.delivery_status,
        sentAt: notification.sent_at,
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
