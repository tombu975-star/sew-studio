import { NextResponse } from "next/server";
import { getTenant } from "@/lib/supabase/session";

export async function PATCH(req: Request) {
  const ctx = await getTenant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  if (!fullName) {
    return NextResponse.json({ error: "Your name is required." }, { status: 400 });
  }

  const data: Record<string, string | null> = { full_name: fullName };
  if ("phone" in body) data.phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
  if ("gender" in body) data.gender = typeof body.gender === "string" && body.gender.trim() ? body.gender.trim() : null;

  if ("avatarUrl" in body) {
    const raw = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : "";
    if (raw && !/^https?:\/\//i.test(raw)) {
      return NextResponse.json(
        { error: "Profile picture must be a web link starting with http:// or https://" },
        { status: 400 }
      );
    }
    data.avatar_url = raw ? raw.slice(0, 1000) : null;
  }

  const { data: profile, error } = await ctx.supabase
    .from("profiles")
    .update(data)
    .eq("id", ctx.userId)
    .eq("shop_id", ctx.shopId)
    .select("id, email, full_name, role, gender, phone, avatar_url, shop_id, can_access_orders, can_access_board, shop:shops(id, name, slug, currency)")
    .single();
  if (error) {
    return NextResponse.json({ error: "Could not update your profile." }, { status: 400 });
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
    },
  });
}