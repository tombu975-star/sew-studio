import { NextResponse } from "next/server";
import { getSystemAdminSession } from "@/lib/db/session";
import { createAdminClient } from "@/lib/db/adminClient";
import { trialEndDate } from "@/lib/plans";

type Ctx = { params: Promise<{ id: string }> };
type PlanRequestRow = {
  id: string;
  requested_plan: "pro" | "enterprise";
  status: "pending" | "approved" | "declined";
  message: string;
  created_at: string;
  updated_at: string;
};

// GET /api/admin/shops/:id — full detail: the shop, its members, and
// recent orders. Full platform-management access — this deliberately
// bypasses RLS, unlike every shop-scoped route elsewhere in the app.
export async function GET(_req: Request, { params }: Ctx) {
  const ctx = await getSystemAdminSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const admin = createAdminClient();

  const { data: shop } = await admin.from("shops").select("*").eq("id", id).maybeSingle();
  if (!shop) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  const [{ data: members }, { data: orders }, { count: customerCount }, { data: latestRequest }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, email, role, phone, created_at")
      .eq("shop_id", id)
      .order("created_at", { ascending: true }),
    admin
      .from("orders")
      .select("id, garment_design, status, selling_price, order_date, created_at, customer:customers(name)")
      .eq("shop_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    admin.from("customers").select("id", { count: "exact", head: true }).eq("shop_id", id),
    admin
      .from("shop_plan_requests")
      .select("id, requested_plan, status, message, created_at, updated_at")
      .eq("shop_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    id: shop.id,
    name: shop.name,
    slug: shop.slug,
    plan: shop.plan,
    trialStartedAt: shop.trial_started_at,
    trialEndsAt: shop.trial_ends_at,
    currency: shop.currency,
    suspendedAt: shop.suspended_at,
    suspendedReason: shop.suspended_reason,
    createdAt: shop.created_at,
    customerCount: customerCount ?? 0,
    latestPlanRequest: latestRequest
      ? {
          id: latestRequest.id,
          requestedPlan: latestRequest.requested_plan,
          status: latestRequest.status,
          message: latestRequest.message,
          createdAt: latestRequest.created_at,
          updatedAt: latestRequest.updated_at,
        }
      : null,
    members: (members || []).map((m) => ({
      id: m.id,
      fullName: m.full_name,
      email: m.email,
      role: m.role,
      phone: m.phone,
      createdAt: m.created_at,
    })),
    recentOrders: (orders || []).map((o) => ({
      id: o.id,
      garmentDesign: o.garment_design,
      status: o.status,
      sellingPrice: o.selling_price,
      orderDate: o.order_date,
      createdAt: o.created_at,
      customerName: (o.customer as { name?: string } | null)?.name ?? null,
    })),
  });
}

// PATCH /api/admin/shops/:id — edit shop fields and/or suspend/unsuspend.
export async function PATCH(req: Request, { params }: Ctx) {
  const ctx = await getSystemAdminSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();

  const { data: existing } = await admin.from("shops").select("id, plan").eq("id", id).maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if ("plan" in body) {
    if (body.plan !== "trial" && body.plan !== "pro" && body.plan !== "enterprise") {
      return NextResponse.json({ error: "Plan must be Trial, Pro, or Enterprise." }, { status: 400 });
    }
    data.plan = body.plan;
    if (body.plan === "trial" && existing.plan !== "trial") {
      const trialStart = new Date();
      data.trial_started_at = trialStart.toISOString();
      data.trial_ends_at = trialEndDate(trialStart).toISOString();
    }
  }
  if (typeof body.currency === "string" && body.currency.trim()) data.currency = body.currency.trim().toUpperCase();

  if (typeof body.suspended === "boolean") {
    if (body.suspended) {
      data.suspended_at = new Date().toISOString();
      data.suspended_reason =
        typeof body.suspendedReason === "string" && body.suspendedReason.trim()
          ? body.suspendedReason.trim()
          : null;
    } else {
      data.suspended_at = null;
      data.suspended_reason = null;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data: updated, error } = await admin
    .from("shops")
    .update(data)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let latestPlanRequest: PlanRequestRow | null = null;
  const { data: pendingRequest, error: requestError } = await admin
    .from("shop_plan_requests")
    .select("id, requested_plan, status, message, created_at, updated_at")
    .eq("shop_id", id)
    .eq("status", "pending")
    .maybeSingle();
  if (requestError) {
    console.error("[admin/shops] could not load upgrade request after plan update", requestError);
    return NextResponse.json({ error: "Plan was updated, but its upgrade request could not be refreshed." }, { status: 500 });
  }
  if (pendingRequest && typeof data.plan === "string" && existing.plan !== data.plan) {
    const status = pendingRequest.requested_plan === data.plan ? "approved" : "declined";
    const { error: reviewError } = await admin
      .from("shop_plan_requests")
      .update({
        status,
        reviewed_by: ctx.adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", pendingRequest.id);
    if (reviewError) {
      console.error("[admin/shops] could not review plan request", reviewError);
      return NextResponse.json({ error: "Plan was updated, but the upgrade request could not be reviewed." }, { status: 500 });
    }
    latestPlanRequest = { ...pendingRequest, status };
  } else {
    const { data: latest } = await admin
      .from("shop_plan_requests")
      .select("id, requested_plan, status, message, created_at, updated_at")
      .eq("shop_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    latestPlanRequest = latest;
  }

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    plan: updated.plan,
    trialStartedAt: updated.trial_started_at,
    trialEndsAt: updated.trial_ends_at,
    latestPlanRequest: latestPlanRequest
      ? {
          id: latestPlanRequest.id,
          requestedPlan: latestPlanRequest.requested_plan,
          status: latestPlanRequest.status,
          message: latestPlanRequest.message,
          createdAt: latestPlanRequest.created_at,
          updatedAt: latestPlanRequest.updated_at,
        }
      : null,
    currency: updated.currency,
    suspendedAt: updated.suspended_at,
    suspendedReason: updated.suspended_reason,
    createdAt: updated.created_at,
  });
}
