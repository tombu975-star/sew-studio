import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/pool";
import { getTenant } from "@/lib/db/session";

async function needsPasswordChange(userId: string): Promise<boolean> {
  try {
    const { rows } = await getPool().query(
      "select must_change_password from private.credentials where user_id = $1",
      [userId]
    );
    return rows[0]?.must_change_password === true;
  } catch {
    return false; // column missing until migration 021 is applied
  }
}

export async function GET() {
  try {
    const ctx = await getTenant();
    if (!ctx) return NextResponse.json({ user: null }, { status: 200 });

    const { data: profile } = await ctx.db
      .from("profiles")
      .select(
        "id, email, full_name, role, gender, phone, avatar_url, shop_id, can_access_orders, can_access_board, can_manage_freelancers, shop:shops(id, name, slug, currency, plan, trial_started_at, trial_ends_at)"
      )
      .eq("id", ctx.userId)
      .maybeSingle();
    if (!profile) return NextResponse.json({ user: null }, { status: 200 });

    const mustChangePassword = await needsPasswordChange(profile.id);
    return NextResponse.json({
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
        gender: profile.gender,
        phone: profile.phone,
        avatarUrl: profile.avatar_url,
        shopId: profile.shop_id,
        shop: profile.shop,
        canAccessOrders: profile.can_access_orders,
        canAccessBoard: profile.can_access_board,
        canManageFreelancers: profile.can_manage_freelancers,
        mustChangePassword,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
