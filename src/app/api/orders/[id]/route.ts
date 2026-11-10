import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/db/database.types";
import { getTenant } from "@/lib/db/session";
import { notifyCustomer, statusChangeMessage } from "@/lib/notify";
import { serializeOrder, serializeTask } from "@/lib/db/serializers";

const ORDER_SELECT =
  "*, customer:customers(*), assigned_staff:profiles!orders_assigned_staff_id_fkey(*), payments(*), fittings(*), tasks(*, staff:profiles!tasks_staff_id_fkey(*))";

function sortByDate<T extends { date: string }>(rows: T[] | null | undefined) {
  return [...(rows ?? [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function serializeFullOrder(o: Record<string, any>) {
  return {
    ...serializeOrder({
      ...o,
      payments: sortByDate(o.payments),
      fittings: sortByDate(o.fittings),
    }),
    tasks: [...(o.tasks ?? [])]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(serializeTask),
  };
}

// GET /api/orders/[id] — single order with full relations
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const canSeeAll = ctx.role === "madam" || ctx.role === "trainer";
  let query = ctx.db.from("orders").select(ORDER_SELECT).eq("id", id).eq("shop_id", ctx.shopId);
  if (!canSeeAll) {
    query = query.or(`assigned_staff_id.eq.${ctx.userId},assigned_staff_id.is.null`);
  }
  const { data: order, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  return NextResponse.json(serializeFullOrder(order));
}

// PATCH /api/orders/[id] — partial update (esp. status)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const canSeeAll = ctx.role === "madam" || ctx.role === "trainer";
  let existingQuery = ctx.db
    .from("orders")
    .select("id, status, customer_id, garment_design")
    .eq("id", id)
    .eq("shop_id", ctx.shopId);
  if (!canSeeAll) {
    existingQuery = existingQuery.or(
      `assigned_staff_id.eq.${ctx.userId},assigned_staff_id.is.null`
    );
  }
  const { data: existing } = await existingQuery.maybeSingle();
  if (!existing) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "A valid update is required." }, { status: 400 });
  }
  // Production roles (staff/trainer/trainee) move orders along; money, customer,
  // assignment, scheduling and priority stay owner-only. Enforced here, not just in the UI.
  if (ctx.role !== "madam") {
    const allowed = new Set(["status", "notes", "designImage"]);
    for (const k of Object.keys(body)) if (!allowed.has(k)) delete (body as Record<string, unknown>)[k];
  }
  const statusChanged = body.status !== undefined && body.status !== existing.status;

  const data: Database["public"]["Tables"]["orders"]["Update"] = {};
  if (body.garmentDesign !== undefined) data.garment_design = body.garmentDesign;
  if (body.orderDate !== undefined)
    data.order_date = body.orderDate ? new Date(body.orderDate).toISOString() : new Date().toISOString();
  if (body.deliveryDate !== undefined)
    data.delivery_date = body.deliveryDate ? new Date(body.deliveryDate).toISOString() : null;
  if (body.status !== undefined) data.status = body.status;
  if (body.designImage !== undefined) data.design_image = body.designImage || null;
  if (body.sellingPrice !== undefined) data.selling_price = Number(body.sellingPrice) || 0;
  if (body.fabricCost !== undefined) data.fabric_cost = Number(body.fabricCost) || 0;
  if (body.labourCost !== undefined) data.labour_cost = Number(body.labourCost) || 0;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.assignedStaffId !== undefined) {
    if (body.assignedStaffId) {
      const { data: staff } = await ctx.db
        .from("profiles")
        .select("id")
        .eq("id", body.assignedStaffId)
        .eq("shop_id", ctx.shopId)
        .maybeSingle();
      data.assigned_staff_id = staff ? body.assignedStaffId : null;
    } else {
      data.assigned_staff_id = null;
    }
  }
  if (body.customerId !== undefined) {
    const { data: customer } = await ctx.db
      .from("customers")
      .select("id")
      .eq("id", body.customerId)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (customer) data.customer_id = body.customerId;
  }

  const { data: updated, error } = await ctx.db
    .from("orders")
    .update(data)
    .eq("id", id)
    .select(ORDER_SELECT)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (statusChanged) {
    const msg = statusChangeMessage(existing.garment_design, existing.status, updated.status);
    const type =
      updated.status === "Ready"
        ? "ready_for_collection"
        : updated.status === "Collected/Delivered" || updated.status === "Completed"
          ? "delivered"
          : "status_change";
    await notifyCustomer(ctx.db, {
      shopId: ctx.shopId,
      customerId: existing.customer_id,
      orderId: id,
      type,
      title: msg.title,
      body: msg.body,
      statusFrom: existing.status,
      statusTo: updated.status,
    });
  }

  return NextResponse.json(serializeFullOrder(updated));
}

// DELETE /api/orders/[id] → { ok: true }
// Owner only. Payments, fittings and tasks cascade from the order row.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "madam") {
    return NextResponse.json(
      { error: "Only the studio owner can delete an order." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const { data: existing } = await ctx.db
    .from("orders")
    .select("id")
    .eq("id", id)
    .eq("shop_id", ctx.shopId)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const { error } = await ctx.db
    .from("orders")
    .delete()
    .eq("id", id)
    .eq("shop_id", ctx.shopId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
