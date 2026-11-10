import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { createAdminClient } from "@/lib/db/adminClient";
import { createRequestClient } from "@/lib/db/requestClient";
import { findIdentityConflict, identityErrorMessage, isPlausiblePhone, MESSAGES } from "@/lib/identity";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const admin = createAdminClient();
  let createdAuthUserId: string | null = null;
  let createdShopId: string | null = null;

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "A valid registration request is required." }, { status: 400 });
    }
    const shopName = typeof body.shopName === "string" ? body.shopName.trim() : "";
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const emailNorm = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const gender = typeof body.gender === "string" ? body.gender : "Female";
    if (!shopName || !fullName || !emailNorm || !password) {
      return NextResponse.json(
        { error: "Shop name, your name, email and password are required." },
        { status: 400 }
      );
    }
    if (shopName.length > 120 || fullName.length > 120 || emailNorm.length > 254) {
      return NextResponse.json({ error: "Shop name and your name must be 120 characters or fewer, and email must be 254 characters or fewer." }, { status: 400 });
    }
    if (!EMAIL_RE.test(emailNorm)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (body.phone && !isPlausiblePhone(body.phone)) {
      return NextResponse.json({ error: MESSAGES.badPhone }, { status: 400 });
    }

    // One account per email (Gmail dots / "+tags" count as the same address).
    const emailConflict = await findIdentityConflict(admin, { email: emailNorm, phone: body.phone });
    if (emailConflict) {
      return NextResponse.json({ error: emailConflict.message }, { status: 409 });
    }

    const ownerGender = gender || "Female";
    const ownerLabel = ownerGender === "Male" ? "Master" : "Madam";
    const normalizedPhone = body.phone ? String(body.phone).trim().slice(0, 40) : null;

    // Keep the auth identity, shop, default settings and owner profile in the
    // same transaction so a failed insert cannot leave a partial shop behind.
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: emailNorm,
      password,
      email_confirm: true,
      provision: async (client: PoolClient, user) => {
        const baseSlug = slugify(shopName);
        await client.query("select pg_advisory_xact_lock(hashtext($1))", [baseSlug]);

        let shop: {
          id: string;
          name: string;
          slug: string;
          currency: string;
          plan: string;
          trial_started_at: string;
          trial_ends_at: string;
        } | undefined;
        for (let suffix = 0; suffix < 10_000 && !shop; suffix++) {
          const suffixText = suffix ? `-${suffix}` : "";
          const candidate = `${baseSlug.slice(0, 40 - suffixText.length)}${suffixText}`;
          const result = await client.query(
            `insert into public.shops (name, slug, plan, currency)
             values ($1, $2, 'trial', 'GHS')
             on conflict (slug) do nothing
             returning id, name, slug, currency, plan, trial_started_at, trial_ends_at`,
            [shopName, candidate]
          );
          shop = result.rows[0];
        }
        if (!shop) throw new Error("Could not allocate a unique shop address.");
        await client.query(
          `insert into public.settings (shop_id, owner_gender, studio_name)
           values ($1, $2, $3)`,
          [shop.id, ownerLabel, shopName]
        );
        await client.query(
          `insert into public.profiles
            (id, email, full_name, role, gender, phone, shop_id)
           values ($1, $2, $3, 'madam', $4, $5, $6)`,
          [user.id, emailNorm, fullName, ownerGender, normalizedPhone, shop.id]
        );
        return shop;
      },
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
    const shop = authData.provisioned;
    if (!shop) throw new Error("Shop registration completed without a shop record.");
    createdShopId = shop.id;

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, email, full_name, role, gender, shop_id")
      .eq("id", createdAuthUserId)
      .single();
    if (profileError || !profile) throw profileError ?? new Error("Could not load the owner profile.");

    // Sign the new owner in for real (sets the session cookies
    //    via the request-bound server client) so they land straight in the app.
    const db = await createRequestClient();
    const { error: signInError } = await db.auth.signInWithPassword({
      email: emailNorm,
      password,
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
        shop: {
          id: shop.id,
          name: shop.name,
          slug: shop.slug,
          currency: shop.currency,
          plan: shop.plan,
          trial_started_at: shop.trial_started_at,
          trial_ends_at: shop.trial_ends_at,
        },
      },
    });
  } catch (error) {
    console.error("[auth/register]", error);
    // Auth/profile creation is transactional; this cleanup only covers a
    // failure after commit (for example, when the session cookie cannot be set).
    if (createdShopId) {
      const { error: shopCleanupError } = await admin.from("shops").delete().eq("id", createdShopId);
      if (shopCleanupError) console.error("[auth/register] shop cleanup failed", shopCleanupError);
    }
    if (createdAuthUserId) {
      const { error: authCleanupError } = await admin.auth.admin.deleteUser(createdAuthUserId);
      if (authCleanupError) console.error("[auth/register] auth cleanup failed", authCleanupError);
    }
    const friendly = identityErrorMessage(error);
    if (friendly) return NextResponse.json({ error: friendly }, { status: 409 });
    return NextResponse.json(
      { error: "Could not create your shop. Please try again." },
      { status: 500 }
    );
  }
}
