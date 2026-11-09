import { NextResponse } from "next/server";
import type { Database } from "@/lib/db/database.types";
import { getTenant } from "@/lib/db/session";
import { findIdentityConflict, identityErrorMessage, isPlausiblePhone, MESSAGES } from "@/lib/identity";
import { createAdminClient } from "@/lib/db/adminClient";

export async function PATCH(req: Request) {
  const ctx = await getTenant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  if (!fullName) {
    return NextResponse.json({ error: "Your name is required." }, { status: 400 });
  }

  const data: Database["public"]["Tables"]["profiles"]["Update"] = { full_name: fullName };
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

  if (data.phone) {
    if (!isPlausiblePhone(data.phone)) {
      return NextResponse.json({ error: MESSAGES.badPhone }, { status: 400 });
    }
    const conflict = await findIdentityConflict(createAdminClient(), {
      phone: data.phone,
      excludeId: ctx.userId,
    });
    if (conflict) return NextResponse.json({ error: conflict.message }, { status: 409 });
  }

  const { data: profile, error } = await ctx.db
    .from("profiles")
    .update(data)
    .eq("id", ctx.userId)
    .eq("shop_id", ctx.shopId)
    .select("id, email, full_name, role, gender, phone, avatar_url, shop_id, can_access_orders, can_access_board, can_manage_freelancers, shop:shops(id, name, slug, currency)")
    .single();
  if (error) {
    const friendly = identityErrorMessage(error);
    if (friendly) return NextResponse.json({ error: friendly }, { status: 409 });
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
      canManageFreelancers: profile.can_manage_freelancers,
    },
  });
}