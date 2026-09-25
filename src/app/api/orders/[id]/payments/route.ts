import { getTenant } from "@/lib/supabase/session";
import { notifyCustomer } from "@/lib/notify";
import { serializePayment } from "@/lib/supabase/serializers";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const { data: order } = await ctx.supabase
      .from("orders")
      .select("id, customer_id, garment_design")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

    const amount = Number(body.amount) || 0;
    const { data: payment, error } = await ctx.supabase
      .from("payments")
      .insert({
        order_id: id,
        amount,
        method: body.method ? String(body.method) : null,
        note: body.note ? String(body.note) : null,
        date: body.date ? new Date(body.date).toISOString() : new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) throw error;

    await notifyCustomer(ctx.supabase, {
      shopId: ctx.shopId,
      customerId: order.customer_id,
      orderId: id,
      type: "payment_received",
      title: "Payment received",
      body: `We've received a payment of GHS ${amount.toLocaleString("en-GB")} for your order (${order.garment_design}). Thank you!`,
    });

    return Response.json(serializePayment(payment), { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
