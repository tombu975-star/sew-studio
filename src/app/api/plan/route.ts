import { NextResponse } from "next/server";
import { getTenant } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";
import { getPlanEntitlements, PLANS } from "@/lib/plans";

export async function GET() {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { rows } = await getPool().query(
      `select s.plan, s.trial_started_at, s.trial_ends_at,
              (select count(*)::int from public.profiles p
                where p.shop_id = s.id and p.is_active = true) as member_count,
              (select json_build_object(
                  'id', r.id,
                  'requestedPlan', r.requested_plan,
                  'status', r.status,
                  'message', r.message,
                  'createdAt', r.created_at,
                  'updatedAt', r.updated_at)
                 from public.shop_plan_requests r
                where r.shop_id = s.id
                order by r.created_at desc
                limit 1) as latest_request
         from public.shops s
        where s.id = $1`,
      [tenant.shopId]
    );
    const shop = rows[0];
    if (!shop) return NextResponse.json({ error: "Studio not found." }, { status: 404 });

    return NextResponse.json({
      ...getPlanEntitlements(shop.plan, shop.trial_ends_at),
      trialStartedAt: shop.trial_started_at,
      memberCount: shop.member_count,
      latestRequest: shop.latest_request,
      plans: Object.values(PLANS),
    });
  } catch (error) {
    console.error("[plan] could not load studio plan", error);
    return NextResponse.json({ error: "Could not load your studio plan." }, { status: 500 });
  }
}
