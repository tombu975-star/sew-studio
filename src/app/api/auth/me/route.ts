import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/serverClient";
import { getRailwayShopSession, isRailwayAuthEnabled } from "@/lib/railway-auth";
import { getTenant } from "@/lib/supabase/session";

export async function GET() {
  try {
    if (isRailwayAuthEnabled()) {
      const profile = await getRailwayShopSession();
      if (!profile) return NextResponse.json({ user: null }, { status: 200 });
      return NextResponse.json({
        user: {
          id: profile.id,
          email: profile.email,
          fullName: profile.fullName,
          role: profile.role,
          gender: profile.gender,
          phone: profile.phone,
          avatarUrl: profile.avatarUrl,
          shopId: profile.shopId,
          shop: profile.shop,
          canAccessOrders: profile.canAccessOrders,
          canAccessBoard: profile.canAccessBoard,
          canManageFreelancers: profile.canManageFreelancers,
        },
      });
    }

    const ctx = await getTenant();
    if (!ctx) return NextResponse.json({ user: null }, { status: 200 });

    const { data: profile } = await ctx.supabase
      .from("profiles")
      .select(
        "id, email, full_name, role, gender, phone, avatar_url, shop_id, can_access_orders, can_access_board, shop:shops(id, name, slug, currency)"
      )
      .eq("id", ctx.userId)
      .maybeSingle();
    if (!profile) return NextResponse.json({ user: null }, { status: 200 });

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
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
