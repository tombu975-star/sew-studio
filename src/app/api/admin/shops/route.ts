import { NextResponse } from "next/server";
import { getSystemAdminSession } from "@/lib/supabase/session";
import { createAdminSupabaseClient } from "@/lib/supabase/adminClient";

// GET /api/admin/shops — every shop on the platform, with summary stats.
// Uses the service-role client deliberately: this is meant to cross shop
// boundaries that RLS enforces for every other role in the app.
export async function GET() {
  const ctx = await getSystemAdminSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();

  const { data: shops, error } = await admin
    .from("shops")
    .select("id, name, slug, plan, currency, suspended_at, suspended_reason, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Per-shop counts, fetched in parallel. Fine at this scale (tens to low
  // hundreds of shops); switch to a single grouped query if this platform
  // ever needs to list thousands.
  const withStats = await Promise.all(
    (shops || []).map(async (shop) => {
      const [{ count: userCount }, { count: orderCount }, { data: owner }] = await Promise.all([
        admin.from("profiles").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
        admin.from("orders").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
        admin
          .from("profiles")
          .select("full_name, email")
          .eq("shop_id", shop.id)
          .eq("role", "madam")
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        plan: shop.plan,
        currency: shop.currency,
        suspendedAt: shop.suspended_at,
        suspendedReason: shop.suspended_reason,
        createdAt: shop.created_at,
        userCount: userCount ?? 0,
        orderCount: orderCount ?? 0,
        ownerName: owner?.full_name ?? null,
        ownerEmail: owner?.email ?? null,
      };
    })
  );

  return NextResponse.json(withStats);
}
