import { NextRequest, NextResponse } from "next/server";
import { getTenant } from "@/lib/supabase/session";
import {
  serializeCustomer,
  serializeOrder,
  serializeMeasurementSet,
  serializeCustomerFeedback,
  serializeStyleConcept,
} from "@/lib/supabase/serializers";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/customers/[id] → { customer, orders, measurements, feedback, styleConcepts }
export async function GET(req: NextRequest, { params }: Ctx) {
  const ctx = await getTenant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: customer } = await ctx.supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("shop_id", ctx.shopId)
    .maybeSingle();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const [ordersRes, measurementsRes, feedbackRes, styleConceptsRes] = await Promise.all([
    ctx.supabase
      .from("orders")
      .select("*, assigned_staff:profiles!orders_assigned_staff_id_fkey(*)")
      .eq("customer_id", id)
      .eq("shop_id", ctx.shopId)
      .order("order_date", { ascending: false }),
    ctx.supabase
      .from("measurement_sets")
      .select("*, staff:profiles(id, full_name)")
      .eq("customer_id", id)
      .eq("shop_id", ctx.shopId)
      .order("date_taken", { ascending: false })
      .limit(60),
    ctx.supabase
      .from("customer_feedback")
      .select("*")
      .eq("customer_id", id)
      .eq("shop_id", ctx.shopId)
      .order("date", { ascending: false }),
    ctx.supabase
      .from("style_concepts")
      .select("*")
      .eq("customer_id", id)
      .eq("shop_id", ctx.shopId)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    customer: serializeCustomer(customer),
    orders: (ordersRes.data ?? []).map((o) => serializeOrder({ ...o, assigned_staff: o.assigned_staff })),
    measurements: (measurementsRes.data ?? []).map((m) => ({
      ...serializeMeasurementSet(m),
      staff: m.staff ? { id: m.staff.id, fullName: m.staff.full_name } : null,
    })),
    feedback: (feedbackRes.data ?? []).map(serializeCustomerFeedback),
    styleConcepts: (styleConceptsRes.data ?? []).map(serializeStyleConcept),
  });
}

// PATCH /api/customers/[id] → Customer
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const ctx = await getTenant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body: Record<string, unknown> = await req.json().catch(() => ({}));

  const { data: existing } = await ctx.supabase
    .from("customers")
    .select("id")
    .eq("id", id)
    .eq("shop_id", ctx.shopId)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  const fieldMap: Record<string, string> = {
    name: "name",
    phone: "phone",
    email: "email",
    whatsapp: "whatsapp",
    gender: "gender",
    occupation: "occupation",
    city: "city",
    country: "country",
    entrySource: "entry_source",
    referredBy: "referred_by",
    customerType: "customer_type",
    preferredStyles: "preferred_styles",
    favouriteColours: "favourite_colours",
    coloursToAvoid: "colours_to_avoid",
    favouriteFabrics: "favourite_fabrics",
    preferredFit: "preferred_fit",
    designPreferences: "design_preferences",
    styleNotes: "style_notes",
    skinTone: "skin_tone",
    notes: "notes",
    status: "status",
  };
  for (const [key, column] of Object.entries(fieldMap)) {
    if (key in body) {
      const v = body[key];
      data[column] = v === undefined || v === null ? null : String(v);
    }
  }

  if ("height" in body) {
    const v = body.height;
    data.height = v === null || v === "" || v === undefined ? null : Number(v);
  }
  if ("weight" in body) {
    const v = body.weight;
    data.weight = v === null || v === "" || v === undefined ? null : Number(v);
  }
  if ("loyaltyPoints" in body) {
    const v = body.loyaltyPoints;
    data.loyalty_points = v === null || v === "" || v === undefined ? 0 : Number(v);
  }

  const { data: updated, error } = await ctx.supabase
    .from("customers")
    .update(data)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(serializeCustomer(updated));
}

// DELETE /api/customers/[id] → { ok: true }
// Owner only. orders.customer_id has no ON DELETE CASCADE, so this customer's
// orders are removed first (which cascades to their payments, fittings and
// tasks); measurements, feedback, style concepts, notes etc. cascade from the
// customer row itself.
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const ctx = await getTenant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "madam") {
    return NextResponse.json(
      { error: "Only the studio owner can delete a customer." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const { data: existing } = await ctx.supabase
    .from("customers")
    .select("id")
    .eq("id", id)
    .eq("shop_id", ctx.shopId)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const { error: ordersError } = await ctx.supabase
    .from("orders")
    .delete()
    .eq("customer_id", id)
    .eq("shop_id", ctx.shopId);
  if (ordersError) return NextResponse.json({ error: ordersError.message }, { status: 500 });

  const { error } = await ctx.supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("shop_id", ctx.shopId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
