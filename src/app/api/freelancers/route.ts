import { getTenant, canManageFreelancers } from "@/lib/supabase/session";
import { createAdminSupabaseClient } from "@/lib/supabase/adminClient";
import { findIdentityConflict, identityErrorMessage, isPlausiblePhone, normalizeEmail, MESSAGES } from "@/lib/identity";
import type { SupabaseClient } from "@supabase/supabase-js";

// GET /api/freelancers — this shop's linked freelancers (their own
// rate notes/status here, plus the freelancer's shared identity fields).
// A shop only ever sees freelancers IT has linked — never another
// shop's roster, and never the freelancer's password (Supabase Auth
// manages that entirely separately now).
export async function GET() {
  try {
    const ctx = await getTenant();
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: links, error } = await ctx.supabase
      .from("freelancer_shop_links")
      .select("*, freelancer:freelancer_profiles(id, full_name, email, phone, specialty, skills)")
      .eq("shop_id", ctx.shopId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const freelancers = links.map((l) => ({
      linkId: l.id,
      id: l.freelancer?.id,
      name: l.freelancer?.full_name,
      email: l.freelancer?.email,
      phone: l.freelancer?.phone,
      specialty: l.freelancer?.specialty,
      skills: l.freelancer?.skills,
      rateNotes: l.rate_notes,
      status: l.status,
      createdAt: l.created_at,
    }));
    return Response.json(freelancers);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// POST /api/freelancers — commission a freelancer. If a freelancer
// account with this email already exists (they may already work with
// other shops), this just links them to this shop — it never creates a
// duplicate identity. Only a brand-new email creates a brand-new login.
//
// Uses the admin client throughout (after the permission check): finding
// or creating a freelancer_profiles row and its Supabase Auth user, and
// reading it back, all need to happen outside this shop's RLS — a shop
// legitimately has no read access to a freelancer's profile until AFTER
// it links them (see supabase/schema/0003_rls.sql).
export async function POST(req: Request) {
  const admin = createAdminSupabaseClient();
  let createdAuthUserId: string | null = null;

  try {
    const ctx = await getTenant();
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canManageFreelancers(ctx)) {
      return Response.json(
        {
          error:
            "Only the studio owner, or someone granted freelancer access, can manage freelancers.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { fullName, email, phone, specialty, skills, rateNotes, status, password } = body || {};
    if (!fullName || !email) {
      return Response.json({ error: "Name and email are required." }, { status: 400 });
    }
    const normalizedEmail = String(email).toLowerCase().trim();

    // Find the freelancer by their normalised email, so a Gmail alias
    // (jo.hn+x@gmail.com) links to the account that already exists instead of
    // creating a second one. Falls back to the exact email if migration 0013
    // hasn't been applied yet.
    const emailKey = normalizeEmail(normalizedEmail);
    // email_key comes from migration 0013, so it isn't in the generated types.
    const untyped = admin as unknown as SupabaseClient;
    const byKey = emailKey
      ? await untyped.from("freelancer_profiles").select("*").eq("email_key", emailKey).maybeSingle()
      : null;
    let freelancer = byKey && !byKey.error ? byKey.data : null;
    if (byKey?.error) {
      const exact = await admin
        .from("freelancer_profiles")
        .select("*")
        .eq("email", normalizedEmail)
        .maybeSingle();
      freelancer = exact.data;
    }

    if (!freelancer) {
      if (phone && !isPlausiblePhone(phone)) {
        return Response.json({ error: MESSAGES.badPhone }, { status: 400 });
      }
      // A brand-new account: its email/phone must not belong to anyone else
      // (a shop owner, a team member or another freelancer).
      const conflict = await findIdentityConflict(admin, { email: normalizedEmail, phone });
      if (conflict) return Response.json({ error: conflict.message }, { status: 409 });

      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password: String(password || "freelancer2025"),
        email_confirm: true,
      });
      if (authError || !authData.user) throw authError ?? new Error("Could not create freelancer account.");
      createdAuthUserId = authData.user.id;

      const { data: created, error: createError } = await admin
        .from("freelancer_profiles")
        .insert({
          id: createdAuthUserId,
          email: normalizedEmail,
          full_name: String(fullName).trim(),
          phone: phone || null,
          specialty: specialty || null,
          skills: skills || null,
        })
        .select("*")
        .single();
      if (createError) throw createError;
      freelancer = created;
    }

    const { data: existingLink } = await admin
      .from("freelancer_shop_links")
      .select("id")
      .eq("shop_id", ctx.shopId)
      .eq("freelancer_id", freelancer.id)
      .maybeSingle();
    if (existingLink) {
      return Response.json(
        { error: "This freelancer is already linked to your shop." },
        { status: 409 }
      );
    }

    const { data: link, error: linkError } = await admin
      .from("freelancer_shop_links")
      .insert({
        shop_id: ctx.shopId,
        freelancer_id: freelancer.id,
        rate_notes: rateNotes || null,
        status: status || "Available",
      })
      .select("*")
      .single();
    if (linkError) throw linkError;

    return Response.json({
      linkId: link.id,
      id: freelancer.id,
      name: freelancer.full_name,
      email: freelancer.email,
      phone: freelancer.phone,
      specialty: freelancer.specialty,
      skills: freelancer.skills,
      rateNotes: link.rate_notes,
      status: link.status,
      createdAt: link.created_at,
    });
  } catch (err) {
    if (createdAuthUserId) {
      await admin.auth.admin.deleteUser(createdAuthUserId).catch(() => {});
    }
    const friendly = identityErrorMessage(err);
    if (friendly) return Response.json({ error: friendly }, { status: 409 });
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
