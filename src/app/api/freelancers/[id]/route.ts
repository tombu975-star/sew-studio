import { getTenant, canManageFreelancers } from "@/lib/supabase/session";
import { createAdminSupabaseClient } from "@/lib/supabase/adminClient";
import type { Database } from "@/lib/supabase/database.types";
import { findIdentityConflict, isPlausiblePhone, MESSAGES } from "@/lib/identity";

const PERMISSION_ERROR = {
  error: "Only the studio owner, or someone granted freelancer access, can manage this.",
};

// Note: :id here is the freelancer_shop_links id (this shop's own link to
// the freelancer), NOT the freelancer's global account id — that's what
// keeps ownership checks correctly scoped to "this shop's relationship
// with them" rather than the shared identity itself.

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant();
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canManageFreelancers(ctx)) {
      return Response.json(PERMISSION_ERROR, { status: 403 });
    }

    const { id } = await params;
    const { data: existing } = await ctx.supabase
      .from("freelancer_shop_links")
      .select("id, freelancer_id")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!existing) {
      return Response.json({ error: "Freelancer not found" }, { status: 404 });
    }

    const body = await req.json();
    const { rateNotes, status, fullName, phone, specialty, skills } = body || {};

    // ── Contact details live on the freelancer's shared account ──────────
    // A freelancer can work with several studios, so their own details are
    // theirs to change. The owner may edit them only while this studio is
    // the freelancer's ONLY studio (i.e. one the owner set up themselves).
    const touchesProfile =
      fullName !== undefined ||
      phone !== undefined ||
      specialty !== undefined ||
      skills !== undefined;
    if (touchesProfile) {
      const admin = createAdminSupabaseClient();
      const { count: otherStudios } = await admin
        .from("freelancer_shop_links")
        .select("id", { count: "exact", head: true })
        .eq("freelancer_id", existing.freelancer_id)
        .neq("shop_id", ctx.shopId);
      if ((otherStudios ?? 0) > 0) {
        return Response.json(
          {
            error:
              "This freelancer also works with other studios, so only they can change their contact details. You can still edit your rate notes and their status.",
          },
          { status: 403 }
        );
      }
      const profileUpdate: Database["public"]["Tables"]["freelancer_profiles"]["Update"] = {};
      if (fullName !== undefined) {
        const name = String(fullName).trim();
        if (!name) return Response.json({ error: "Name can't be empty." }, { status: 400 });
        profileUpdate.full_name = name;
      }
      if (phone !== undefined) {
        profileUpdate.phone = phone ? String(phone).trim() : null;
        if (phone) {
          if (!isPlausiblePhone(phone)) {
            return Response.json({ error: MESSAGES.badPhone }, { status: 400 });
          }
          const conflict = await findIdentityConflict(admin, {
            phone,
            excludeId: existing.freelancer_id,
          });
          if (conflict) return Response.json({ error: conflict.message }, { status: 409 });
        }
      }
      if (specialty !== undefined) profileUpdate.specialty = specialty ? String(specialty) : null;
      if (skills !== undefined) profileUpdate.skills = skills ? String(skills) : null;
      const { error: profileError } = await admin
        .from("freelancer_profiles")
        .update(profileUpdate)
        .eq("id", existing.freelancer_id);
      if (profileError) throw profileError;
    }

    const data: Database["public"]["Tables"]["freelancer_shop_links"]["Update"] = {};
    if (rateNotes !== undefined) data.rate_notes = rateNotes;
    if (status !== undefined) data.status = status;

    const linkSelect =
      "*, freelancer:freelancer_profiles(id, full_name, email, phone, specialty, skills)";
    const { data: updated, error } =
      Object.keys(data).length > 0
        ? await ctx.supabase
            .from("freelancer_shop_links")
            .update(data)
            .eq("id", id)
            .select(linkSelect)
            .single()
        : await ctx.supabase
            .from("freelancer_shop_links")
            .select(linkSelect)
            .eq("id", id)
            .single();
    if (error) throw error;
    // Joined-select rows are loosely typed by the generated Supabase types.
    const row = updated as any;

    return Response.json({
      linkId: row.id,
      id: row.freelancer?.id,
      name: row.freelancer?.full_name,
      email: row.freelancer?.email,
      phone: row.freelancer?.phone,
      specialty: row.freelancer?.specialty,
      skills: row.freelancer?.skills,
      rateNotes: row.rate_notes,
      status: row.status,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// Unlink only — this NEVER deletes the freelancer's shared account,
// since other shops may still be commissioning them. Their jobs from
// this shop stay on record; only the shop<->freelancer relationship ends.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant();
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canManageFreelancers(ctx)) {
      return Response.json(PERMISSION_ERROR, { status: 403 });
    }

    const { id } = await params;
    const { data: existing } = await ctx.supabase
      .from("freelancer_shop_links")
      .select("id")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!existing) {
      return Response.json({ error: "Freelancer not found" }, { status: 404 });
    }
    await ctx.supabase.from("freelancer_shop_links").delete().eq("id", id);
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
