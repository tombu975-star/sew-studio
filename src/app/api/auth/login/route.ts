import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/serverClient";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email).toLowerCase().trim(),
      password: String(password),
    });
    if (error || !data.user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "id, email, full_name, role, gender, phone, shop_id, can_access_orders, can_access_board, shop:shops(id, name, slug, currency)"
      )
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile) {
      // Auth user exists but has no shop profile — most likely this email
      // belongs to a freelancer account instead. Sign them back out of this
      // session (they're not a shop member) and say so clearly.
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "No shop account found for that email. Freelancers should sign in at /freelancer." },
        { status: 401 }
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
        shopId: profile.shop_id,
        shop: profile.shop,
        canAccessOrders: profile.can_access_orders,
        canAccessBoard: profile.can_access_board,
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
