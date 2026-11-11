import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/db/database.types";
import { getTenant } from "@/lib/db/session";
import { serializeOrder } from "@/lib/db/serializers";

const ORDER_SELECT =
  "*, customer:customers(*), assigned_staff:profiles!orders_assigned_staff_id_fkey(*), payments(*), fittings(*)";

// GET /api/orders — list orders with relations
//
// Scoped by role, not just by tenant: the owner and trainers oversee the
// whole shop, so they see every order. Staff and trainees only work their
// own assignments, so the Production Board (and any other view built on
// this endpoint) should only ever return orders assigned to them, plus
// unassigned orders that are still up for grabs. RLS already guarantees
// tenant scoping; this role-based narrowing is an app-level rule on top.
export async function GET(req: NextRequest) {
  const ctx = await getTenant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canSeeAll = ctx.role === "madam" || ctx.role === "trainer";
  let query = ctx.db
    .from("orders")
    .select(ORDER_SELECT)
    .eq("shop_id", ctx.shopId);
  if (!canSeeAll) {
    query = query.or(`assigned_staff_id.eq.${ctx.userId},assigned_staff_id.is.null`);
  }
  const { data: orders, error } = await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Cast needed: this file's hand-maintained Relationships metadata can't
  // resolve the customer/assigned_staff/payments/fittings embeds, so
  // postgrest-js falls back to `never` even though the runtime shape (and
  // serializeOrder, which accepts a loose Record<string, any>) is correct.
  type OrderRow = Database["public"]["Tables"]["orders"]["Row"] & {
    customer: unknown;
    assigned_staff: unknown;
    payments: { date: string; [key: string]: unknown }[];
    fittings: { date: string; [key: string]: unknown }[];
  };

  // .order() on nested payments/fittings isn't available via the top-level
  // query builder for embedded resources, so sort them client-side.
  const result = (orders as unknown as OrderRow[]).map((o) =>
    serializeOrder({
      ...o,
      payments: [...(o.payments ?? [])].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
      fittings: [...(o.fittings ?? [])].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    })
  );
  return NextResponse.json(result);
}

// POST /api/orders — create a new order
export async function POST(req: NextRequest) {
  const ctx = await getTenant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Mirrors the UI rule (canCreateOrders): only the studio owner creates orders.
  if (ctx.role !== "madam") {
    return NextResponse.json({ error: "Only the studio owner can create orders." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "A valid order is required." }, { status: 400 });
  }

  const { data: customer } = await ctx.db
    .from("customers")
    .select("id")
    .eq("id", body.customerId)
    .eq("shop_id", ctx.shopId)
    .maybeSingle();
  if (!customer) {
    return NextResponse.json({ error: "Customer not found in this shop" }, { status: 404 });
  }

  const data: Database["public"]["Tables"]["orders"]["Insert"] = {
    shop_id: ctx.shopId,
    customer_id: body.customerId,
    garment_design: body.garmentDesign,
    order_date: body.orderDate ? new Date(body.orderDate).toISOString() : new Date().toISOString(),
    delivery_date: body.deliveryDate ? new Date(body.deliveryDate).toISOString() : null,
    status: body.status || "Enquiry",
    selling_price: Number(body.sellingPrice) || 0,
    fabric_cost: Number(body.fabricCost) || 0,
    labour_cost: Number(body.labourCost) || 0,
    other_cost: Math.max(0, Number(body.otherCost) || 0),
    markup_percent:
      body.markupPercent === undefined || body.markupPercent === null || body.markupPercent === ""
        ? null
        : Math.min(1000, Math.max(0, Number(body.markupPercent) || 0)),
    suggested_price:
      body.suggestedPrice === undefined || body.suggestedPrice === null || body.suggestedPrice === ""
        ? null
        : Math.max(0, Number(body.suggestedPrice) || 0),
    notes: body.notes || null,
    priority: body.priority || "Medium",
  };

  if (body.assignedStaffId) {
    const { data: staff } = await ctx.db
      .from("profiles")
      .select("id")
      .eq("id", body.assignedStaffId)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (staff) data.assigned_staff_id = body.assignedStaffId;
  }

  const { data: created, error } = await ctx.db
    .from("orders")
    .insert(data)
    .select(ORDER_SELECT)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(serializeOrder(created), { status: 201 });
}
