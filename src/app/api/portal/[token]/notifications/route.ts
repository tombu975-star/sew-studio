import { createAdminSupabaseClient } from "@/lib/supabase/adminClient";

// GET /api/portal/[token]/notifications — customer's alert timeline (public).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const admin = createAdminSupabaseClient();

    const { data: customer } = await admin
      .from("customers")
      .select("id")
      .eq("portal_token", token)
      .maybeSingle();
    if (!customer) {
      return Response.json({ error: "Invalid or expired link" }, { status: 404 });
    }

    const { data: notifications, error } = await admin
      .from("customer_notifications")
      .select("*, order:orders(id, garment_design)")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;

    return Response.json(
      notifications.map((n) => ({
        id: n.id,
        shopId: n.shop_id,
        customerId: n.customer_id,
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

// PATCH /api/portal/[token]/notifications — mark all as read
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const admin = createAdminSupabaseClient();

    const { data: customer } = await admin
      .from("customers")
      .select("id")
      .eq("portal_token", token)
      .maybeSingle();
    if (!customer) {
      return Response.json({ error: "Invalid or expired link" }, { status: 404 });
    }

    await admin
      .from("customer_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("customer_id", customer.id)
      .is("read_at", null);

    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
