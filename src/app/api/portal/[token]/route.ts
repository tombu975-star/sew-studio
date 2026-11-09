import { createAdminClient } from "@/lib/db/adminClient";
import { serializePayment, serializeFitting, serializeShopPolicies } from "@/lib/db/serializers";

// GET /api/portal/[token] — public customer portal.
// Returns the customer + their orders + the shop's contact info.
// No session here — the token IS the credential, so this uses
// the service-role client and does its own authorization (the token
// lookup below), same as the old cookie-auth version did.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const admin = createAdminClient();

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

    // Business policies live on `settings`, one row per shop — fetched
    // separately since the customer→shop embed above doesn't carry it.
    const shopId = (customer.shop as { id?: string } | null)?.id;
    let policies: ReturnType<typeof serializeShopPolicies> = null;
    if (shopId) {
      const { data: settings } = await admin
        .from("settings")
        .select(
          "deposit_percent, rush_fee_percent, quote_valid_days, full_balance_before_pickup, fittings_included, alterations_window_days, deposit_policy_text, alterations_policy_text, cancellation_policy_text"
        )
        .eq("shop_id", shopId)
        .maybeSingle();
      policies = serializeShopPolicies(settings);
    }

    return Response.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
      shop: { ...customer.shop, policies },
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
