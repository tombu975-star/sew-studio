import { getTenant, canManageFreelancers } from "@/lib/db/session";
import { createAdminClient } from "@/lib/db/adminClient";
import { findIdentityConflict, identityErrorMessage, isPlausiblePhone, normalizeEmail, MESSAGES } from "@/lib/identity";
import type { AppClient } from "@/lib/db/appClient";
import type { PoolClient } from "pg";
import { randomBytes } from "crypto";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/freelancers — this shop's linked freelancers (their own
// rate notes/status here, plus the freelancer's shared identity fields).
// A shop only ever sees freelancers IT has linked — never another
// shop's roster, and never the freelancer's password (the app's sign-in
// manages that entirely separately now).
export async function GET() {
  try {
    const ctx = await getTenant();
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: links, error } = await ctx.db
      .from("freelancer_shop_links")
      .select("*, freelancer:freelancer_profiles(id, full_name, email, phone, specialty, skills, verified_at)")
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
      verified: !!l.freelancer?.verified_at,
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
// or creating a freelancer_profiles row and its sign-in, and
// reading it back, all need to happen outside this shop's RLS — a shop
// legitimately has no read access to a freelancer's profile until AFTER
// it links them (see db/schema/0003_rls.sql).
export async function POST(req: Request) {
  const admin = createAdminClient();

  try {
    const ctx = await getTenant();
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (ctx.role === "madam") {
      return Response.json(
        {
          error:
            "Studio owners can view freelancers and assign them work, but cannot add freelancer accounts from this portal.",
        },
        { status: 403 }
      );
    }
    if (!canManageFreelancers(ctx)) {
      return Response.json(
        {
          error:
            "Only a team member granted freelancer-management access can add freelancer accounts.",
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "A valid freelancer request is required." }, { status: 400 });
    }

    const { fullName, email, phone, specialty, skills, rateNotes, status, password } = body;
    const name = String(fullName ?? "").trim();
    const normalizedEmail = String(email ?? "").toLowerCase().trim();
    if (!name || !normalizedEmail) {
      return Response.json({ error: "Name and email are required." }, { status: 400 });
    }
    if (!EMAIL_RE.test(normalizedEmail)) {
      return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (name.length > 120 || normalizedEmail.length > 254) {
      return Response.json({ error: "Name or email is too long." }, { status: 400 });
    }
    if (phone && !isPlausiblePhone(phone)) {
      return Response.json({ error: MESSAGES.badPhone }, { status: 400 });
    }
    if (password && String(password).length < 8) {
      return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    const passwordValue = password ? String(password) : randomBytes(18).toString("base64url");
    const phoneValue = phone ? String(phone).trim().slice(0, 40) : null;
    const specialtyValue = specialty ? String(specialty).trim().slice(0, 80) : null;
    const skillsValue = skills ? String(skills).trim().slice(0, 300) : null;
    const rateNotesValue = rateNotes ? String(rateNotes).trim().slice(0, 500) : null;
    const statusValue = status ? String(status).trim().slice(0, 40) : "Available";

    // Find the freelancer by their normalised email, so a Gmail alias
    // (jo.hn+x@gmail.com) links to the account that already exists instead of
    // creating a second one. Fall back to an exact email match when older
    // profile rows don't have a populated normalized key.
    const emailKey = normalizeEmail(normalizedEmail);
    // email_key comes from migration 0013, so it isn't in the generated types.
    const untyped = admin as AppClient;
    let freelancer: {
      id: string;
      full_name: string;
      email: string;
      phone: string | null;
      specialty: string | null;
      skills: string | null;
    } | null = null;
    if (emailKey) {
      const byKey = await untyped
        .from("freelancer_profiles")
        .select("*")
        .eq("email_key", emailKey)
        .maybeSingle();
      if (!byKey.error) freelancer = byKey.data;
    }
    if (!freelancer) {
      const exact = await admin
        .from("freelancer_profiles")
        .select("*")
        .eq("email", normalizedEmail)
        .maybeSingle();
      if (exact.error) throw exact.error;
      freelancer = exact.data;
    }

    let accountCreated = false;
    let link: {
      id: string;
      rate_notes: string | null;
      status: string;
      created_at: string;
    } | null = null;

    if (!freelancer) {
      // A brand-new account: its email/phone must not belong to anyone else
      // (a shop owner, a team member or another freelancer).
      const conflict = await findIdentityConflict(admin, { email: normalizedEmail, phone: phoneValue });
      if (conflict) return Response.json({ error: conflict.message }, { status: 409 });

      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password: passwordValue,
        email_confirm: true,
        provision: async (client: PoolClient, user) => {
          const { rows: profileRows } = await client.query(
            `insert into public.freelancer_profiles
              (id, email, full_name, phone, specialty, skills)
             values ($1, $2, $3, $4, $5, $6)
             returning id, full_name, email, phone, specialty, skills`,
            [user.id, normalizedEmail, name, phoneValue, specialtyValue, skillsValue]
          );
          const { rows: linkRows } = await client.query(
            `insert into public.freelancer_shop_links
              (shop_id, freelancer_id, rate_notes, status)
             values ($1, $2, $3, $4)
             returning id, rate_notes, status, created_at`,
            [ctx.shopId, user.id, rateNotesValue, statusValue]
          );
          return { profile: profileRows[0], link: linkRows[0] };
        },
      });
      if (authError || !authData.user) {
        if (authError?.code === "email_exists") {
          return Response.json(
            {
              error:
                "This email already belongs to another account. Ask the freelancer to use their existing freelancer account email, or provide an unused email address.",
            },
            { status: 409 }
          );
        }
        throw authError ?? new Error("Could not create freelancer account.");
      }
      if (!authData.provisioned) {
        throw new Error("Freelancer account was created without its shop link.");
      }
      freelancer = authData.provisioned.profile;
      link = authData.provisioned.link;
      accountCreated = true;
    }

    if (!freelancer) {
      throw new Error("Freelancer account could not be found or created.");
    }

    if (!link) {
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

      const { data: createdLink, error: linkError } = await admin
        .from("freelancer_shop_links")
        .insert({
          shop_id: ctx.shopId,
          freelancer_id: freelancer.id,
          rate_notes: rateNotesValue,
          status: statusValue,
        })
        .select("*")
        .single();
      if (linkError?.code === "23505") {
        return Response.json(
          { error: "This freelancer is already linked to your shop." },
          { status: 409 }
        );
      }
      if (linkError) throw linkError;
      link = createdLink;
    }

    if (!link) {
      throw new Error("Freelancer account was not fully linked to the shop.");
    }

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
      accountCreated,
      ...(accountCreated ? { temporaryPassword: passwordValue } : {}),
    });
  } catch (err) {
    const friendly = identityErrorMessage(err);
    if (friendly) return Response.json({ error: friendly }, { status: 409 });
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
