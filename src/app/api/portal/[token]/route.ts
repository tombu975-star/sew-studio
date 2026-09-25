import { createAdminSupabaseClient } from "@/lib/supabase/adminClient";
import { serializePayment, serializeFitting } from "@/lib/supabase/serializers";

// GET /api/portal/[token] — public customer portal.
// Returns the customer + their orders + the shop's contact info.
// No Supabase session here — the token IS the credential, so this uses
// the service-role client and does its own authorization (the token
// lookup below), same as the old cookie-auth version did.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const admin = createAdminSupabaseClient();

    const { data: customer } = await admin
      .from("customers")
      .select(
        "id, name, phone, email, shop:shops(id, name, currency), orders(*, payments(*), fittings(*))"
      )
      .eq("portal_token", token)
      .maybeSingle();
    if (!customer) {
      return Response.json({ error: "Invalid or expired link" }, { status: 404 });
    }

    const orders = [...(customer.orders ?? [])].sort(
      (a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
    );

    return Response.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
      shop: customer.shop,
      orders: orders.map((o) => ({
        id: o.id,
        garmentDesign: o.garment_design,
        designImage: o.design_image,
        orderDate: o.order_date,
        deliveryDate: o.delivery_date,
        status: o.status,
        priority: o.priority,
        payments: [...(o.payments ?? [])]
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map(serializePayment),
        fittings: [...(o.fittings ?? [])]
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map(serializeFitting),
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
