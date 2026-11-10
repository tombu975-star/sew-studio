import { getTenant } from "@/lib/db/session";
import { notifyCustomer } from "@/lib/notify";
import { serializeFitting } from "@/lib/db/serializers";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (ctx.role !== "madam" && ctx.role !== "staff") {
      return Response.json({ error: "Not allowed to schedule fittings." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const { data: order } = await ctx.db
      .from("orders")
      .select("id, customer_id, garment_design")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

    const fittingDate = body.date ? new Date(body.date) : new Date();
    const fittingStatus = body.status ? String(body.status) : "Scheduled";
    const { data: fitting, error } = await ctx.db
      .from("fittings")
      .insert({
        order_id: id,
        date: fittingDate.toISOString(),
        status: fittingStatus,
        notes: body.notes ? String(body.notes) : null,
      })
      .select("*")
      .single();
    if (error) throw error;

    if (fittingStatus === "Scheduled") {
      const dateStr = fittingDate.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      await notifyCustomer(ctx.db, {
        shopId: ctx.shopId,
        customerId: order.customer_id,
        orderId: id,
        type: "fitting_scheduled",
        title: "Fitting scheduled",
        body: `A fitting has been scheduled for ${dateStr} for your order (${order.garment_design}). We can't wait to see you!`,
      });
    }

    return Response.json(serializeFitting(fitting), { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
