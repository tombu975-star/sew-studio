import { NextResponse } from "next/server";
import { getTenant } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";
import { normalizePlan } from "@/lib/plans";

const PLAN_RANK = { trial: 0, pro: 1, enterprise: 2 } as const;

export async function POST(request: Request) {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (tenant.role !== "madam") {
    return NextResponse.json({ error: "Only the studio owner can request a plan upgrade." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || (body.plan !== "pro" && body.plan !== "enterprise")) {
    return NextResponse.json({ error: "Choose the Pro or Enterprise plan." }, { status: 400 });
  }

  try {
    const { rows: shopRows } = await getPool().query(
      "select plan from public.shops where id = $1",
      [tenant.shopId]
    );
    const currentPlan = normalizePlan(shopRows[0]?.plan);
    if (PLAN_RANK[body.plan] <= PLAN_RANK[currentPlan]) {
      return NextResponse.json({ error: "You can only request an upgrade to a higher plan." }, { status: 400 });
    }

    const { rows } = await getPool().query(
      `insert into public.shop_plan_requests (shop_id, requested_by, requested_plan, message)
       values ($1, $2, $3, $4)
       on conflict (shop_id) where status = 'pending' do nothing
       returning id, requested_plan, status, message, created_at, updated_at`,
      [
        tenant.shopId,
        tenant.userId,
        body.plan,
        typeof body.message === "string" ? body.message.trim().slice(0, 1000) : "",
      ]
    );

    if (!rows[0]) {
      return NextResponse.json(
        { error: "Your studio already has a pending upgrade request." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      id: rows[0].id,
      requestedPlan: rows[0].requested_plan,
      status: rows[0].status,
      message: rows[0].message,
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at,
    }, { status: 201 });
  } catch (error) {
    console.error("[plan] could not submit upgrade request", error);
    return NextResponse.json({ error: "Could not submit your upgrade request." }, { status: 500 });
  }
}
