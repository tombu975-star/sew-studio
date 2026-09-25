import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/adminClient";
import { createServerSupabaseClient } from "@/lib/supabase/serverClient";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || `shop-${Date.now()}`
  );
}

// Register a new shop + owner (madam).
//
// Uses the service-role client throughout: RLS on `shops`/`profiles` has no
// INSERT policy for ordinary users (by design — you can't create a shop as
// a shop member you aren't a member of yet), so this privileged, one-time
// bootstrap sequence has to run outside RLS. Once created, the owner signs
// in normally and every subsequent request is RLS-scoped as usual.
export async function POST(req: Request) {
  const admin = createAdminSupabaseClient();
  let createdAuthUserId: string | null = null;

  try {
    const { shopName, fullName, email, password, gender } = await req.json();
    if (!shopName || !fullName || !email || !password) {
      return NextResponse.json(
        { error: "Shop name, your name, email and password are required." },
        { status: 400 }
      );
    }
    const emailNorm = String(email).toLowerCase().trim();

    // Generate a unique slug.
    let slug = slugify(String(shopName));
    let suffix = 1;
    let slugTaken = true;
    while (slugTaken) {
      const { data: existing } = await admin
        .from("shops")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) {
        slugTaken = false;
      } else {
        slug = `${slugify(String(shopName))}-${suffix++}`;
      }
    }

    const ownerGender = gender || "Female";
    const ownerLabel = ownerGender === "Male" ? "Master" : "Madam";

    // 1. Create the Supabase Auth user (pre-confirmed — this app has no
    //    email-verification flow, matching its previous demo-auth behaviour).
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: emailNorm,
      password: String(password),
      email_confirm: true,
    });
    if (authError || !authData.user) {
      const message = authError?.message ?? "";
      if (message.toLowerCase().includes("already")) {
        return NextResponse.json(
          { error: "An account with that email already exists." },
          { status: 409 }
        );
      }
      throw authError ?? new Error("Could not create the auth user.");
    }
    createdAuthUserId = authData.user.id;

    // 2. Create the shop.
    const { data: shop, error: shopError } = await admin
      .from("shops")
      .insert({ name: String(shopName).trim(), slug, plan: "trial", currency: "GHS" })
      .select("id, name, slug, currency")
      .single();
    if (shopError || !shop) throw shopError ?? new Error("Could not create the shop.");

    // 3. Default settings + the owner's profile.
    const [{ error: settingsError }, { data: profile, error: profileError }] = await Promise.all([
      admin
        .from("settings")
        .insert({ shop_id: shop.id, owner_gender: ownerLabel, studio_name: String(shopName).trim() }),
      admin
        .from("profiles")
        .insert({
          id: createdAuthUserId,
          email: emailNorm,
          full_name: String(fullName).trim(),
          role: "madam",
          gender: ownerGender,
          shop_id: shop.id,
        })
        .select("id, email, full_name, role, gender, shop_id")
        .single(),
    ]);
    if (settingsError) throw settingsError;
    if (profileError || !profile) throw profileError ?? new Error("Could not create the profile.");

    // 4. Sign the new owner in for real (sets the Supabase session cookies
    //    via the request-bound server client) so they land straight in the app.
    const supabase = await createServerSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailNorm,
      password: String(password),
    });
    if (signInError) throw signInError;

    return NextResponse.json({
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
        gender: profile.gender,
        shopId: shop.id,
        shop: { id: shop.id, name: shop.name, slug: shop.slug, currency: shop.currency },
      },
    });
  } catch (error) {
    console.error("[auth/register]", error);
    // Best-effort cleanup so a failed registration doesn't leave a stray
    // auth user behind with no shop/profile.
    if (createdAuthUserId) {
      await admin.auth.admin.deleteUser(createdAuthUserId).catch(() => {});
    }
    return NextResponse.json(
      { error: "Could not create your shop. Please try again." },
      { status: 500 }
    );
  }
}
