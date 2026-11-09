import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/serverClient";
import {
  authenticateRailwayShop,
  isRailwayAuthEnabled,
  setRailwaySessionCookie,
} from "@/lib/railway-auth";

export async function POST(req: Request) {
  try {
    const { email, password, rememberMe } = await req.json();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const normalizedPassword = typeof password === "string" ? password : "";

    if (!normalizedEmail || !normalizedPassword) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (isRailwayAuthEnabled()) {
      const result = await authenticateRailwayShop(
        normalizedEmail,
        normalizedPassword,
        rememberMe === true
      );
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }

      await setRailwaySessionCookie(result.token, result.maxAgeSeconds);
      const profile = result.user;
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

    // Existing Supabase flow remains the default until Railway data access and
    // tenant authorization have been migrated and verified.
    const supabase = await createServerSupabaseClient({ rememberMe: rememberMe === true });
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPassword,
    });
    if (error || !data.user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "id, email, full_name, role, gender, phone, avatar_url, shop_id, can_access_orders, can_access_board, can_manage_freelancers, shop:shops(id, name, slug, currency, suspended_at, suspended_reason)"
      )
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "No shop account found for that email. Freelancers should sign in at /freelancer." },
        { status: 401 }
      );
    }

    const shop = profile.shop as { suspended_at: string | null; suspended_reason: string | null } | null;
    if (shop?.suspended_at) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error: shop.suspended_reason
            ? `This studio's account is suspended: ${shop.suspended_reason}`
            : "This studio's account is currently suspended. Contact support for help.",
        },
        { status: 403 }
      );
    }

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
      },
    });
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json(
      { error: "Could not sign you in. Please try again." },
      { status: 500 }
    );
  }
}
