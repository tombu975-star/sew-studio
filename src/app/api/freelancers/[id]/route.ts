import { getTenant, canManageFreelancers } from "@/lib/supabase/session";
import type { Database } from "@/lib/supabase/database.types";

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
      .select("id")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!existing) {
      return Response.json({ error: "Freelancer not found" }, { status: 404 });
    }

    const body = await req.json();
    const { rateNotes, status } = body || {};
    const data: Database["public"]["Tables"]["freelancer_shop_links"]["Update"] = {};
    if (rateNotes !== undefined) data.rate_notes = rateNotes;
    if (status !== undefined) data.status = status;

    const { data: updated, error } = await ctx.supabase
      .from("freelancer_shop_links")
      .update(data)
      .eq("id", id)
      .select("*, freelancer:freelancer_profiles(id, full_name, email, phone, specialty, skills)")
      .single();
    if (error) throw error;

    return Response.json({
      linkId: updated.id,
      id: updated.freelancer?.id,
      name: updated.freelancer?.full_name,
      email: updated.freelancer?.email,
      phone: updated.freelancer?.phone,
      specialty: updated.freelancer?.specialty,
      skills: updated.freelancer?.skills,
      rateNotes: updated.rate_notes,
      status: updated.status,
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
