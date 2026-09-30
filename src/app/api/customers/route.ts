import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import { getTenant } from "@/lib/supabase/session";
import { serializeCustomer } from "@/lib/supabase/serializers";

// GET /api/customers → Customer[] (each with computed _orderCount)
export async function GET(req: NextRequest) {
  const ctx = await getTenant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customers, error } = await ctx.supabase
    .from("customers")
    .select("*, orders(count)")
    .eq("shop_id", ctx.shopId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Cast needed: the `orders(count)` aggregate embed can't be resolved from
  // this file's hand-maintained Relationships metadata, so postgrest-js
  // falls back to `never` here even though the shape at runtime is correct.
  type CustomerRow = Database["public"]["Tables"]["customers"]["Row"] & { orders: { count: number }[] };
  const result = (customers as unknown as CustomerRow[]).map((c) =>
    serializeCustomer({
      ...c,
      _orderCount: Array.isArray(c.orders) ? (c.orders[0]?.count ?? 0) : 0,
    })
  );
  return NextResponse.json(result);
}

// POST /api/customers → Customer
export async function POST(req: NextRequest) {
  const ctx = await getTenant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body?.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const data: Database["public"]["Tables"]["customers"]["Insert"] = {
    shop_id: ctx.shopId,
    name: String(body.name).trim(),
    phone: body.phone ?? null,
    email: body.email ?? null,
    whatsapp: body.whatsapp ?? null,
    gender: body.gender ?? null,
    occupation: body.occupation ?? null,
    city: body.city ?? null,
    country: body.country ?? null,
    entry_source: body.entrySource ?? null,
    referred_by: body.referredBy ?? null,
    customer_type: body.customerType ?? null,
    preferred_styles: body.preferredStyles ?? null,
    favourite_colours: body.favouriteColours ?? null,
    colours_to_avoid: body.coloursToAvoid ?? null,
    favourite_fabrics: body.favouriteFabrics ?? null,
    preferred_fit: body.preferredFit ?? null,
    design_preferences: body.designPreferences ?? null,
    style_notes: body.styleNotes ?? null,
    skin_tone: body.skinTone ?? null,
    notes: body.notes ?? null,
    status: body.status ?? "Active",
    loyalty_points: 0,
  };

  if (body.height != null && body.height !== "") {
    const h = Number(body.height);
    if (!Number.isNaN(h)) data.height = h;
  }
  if (body.weight != null && body.weight !== "") {
    const w = Number(body.weight);
    if (!Number.isNaN(w)) data.weight = w;
  }
  if (body.loyaltyPoints != null && body.loyaltyPoints !== "") {
    const lp = Number(body.loyaltyPoints);
    if (!Number.isNaN(lp)) data.loyalty_points = lp;
  }

  const { data: customer, error } = await ctx.supabase
    .from("customers")
    .insert(data)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(serializeCustomer(customer), { status: 201 });
}
