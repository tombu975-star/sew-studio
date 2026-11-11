import { getTenant, canManageFreelancers } from "@/lib/db/session";
import type { Database } from "@/lib/db/database.types";

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
    const { data: existing } = await ctx.db
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

    // A freelancer's profile (name, phone, specialty, skills) belongs to the freelancer.
    // Studios, including owners, may only manage their own working terms with them.
    if (fullName !== undefined || phone !== undefined || specialty !== undefined || skills !== undefined) {
      return Response.json(
        { error: "Only the freelancer can edit their own profile. You can update your rate notes and their status." },
        { status: 403 }
      );
    }

    const data: Database["public"]["Tables"]["freelancer_shop_links"]["Update"] = {};
    if (rateNotes !== undefined) data.rate_notes = rateNotes;
    if (status !== undefined) data.status = status;

    const linkSelect =
      "*, freelancer:freelancer_profiles(id, full_name, email, phone, specialty, skills)";
    const { data: updated, error } =
      Object.keys(data).length > 0
        ? await ctx.db
            .from("freelancer_shop_links")
            .update(data)
            .eq("id", id)
            .select(linkSelect)
            .single()
        : await ctx.db
            .from("freelancer_shop_links")
            .select(linkSelect)
            .eq("id", id)
            .single();
    if (error) throw error;
    // Joined-select rows are loosely typed by the generated database types.
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
    const { data: existing } = await ctx.db
      .from("freelancer_shop_links")
      .select("id")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!existing) {
      return Response.json({ error: "Freelancer not found" }, { status: 404 });
    }
    await ctx.db.from("freelancer_shop_links").delete().eq("id", id);
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
