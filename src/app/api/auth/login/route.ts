import { NextResponse } from "next/server";
import { createRequestClient } from "@/lib/db/requestClient";

export async function POST(req: Request) {
  try {
    const { email, password, rememberMe } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const db = await createRequestClient({ rememberMe: rememberMe === true });
    const { data, error } = await db.auth.signInWithPassword({
      email: String(email).toLowerCase().trim(),
      password: String(password),
    });
    if (error || !data.user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const { data: profile } = await db
      .from("profiles")
      .select(
        "id, email, full_name, role, gender, phone, avatar_url, shop_id, can_access_orders, can_access_board, can_manage_freelancers, shop:shops(id, name, slug, currency, suspended_at, suspended_reason)"
      )
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile) {
      // Auth user exists but has no shop profile — most likely this email
      // belongs to a freelancer account instead. Sign them back out of this
      // session (they're not a shop member) and say so clearly.
      await db.auth.signOut();
      return NextResponse.json(
        { error: "No shop account found for that email. Freelancers should sign in at /freelancer." },
        { status: 401 }
      );
    }

    const shop = profile.shop as { suspended_at: string | null; suspended_reason: string | null } | null;
    if (shop?.suspended_at) {
      await db.auth.signOut();
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
