import { getTenant } from "@/lib/supabase/session";
import { serializeCompetencyUnit } from "@/lib/supabase/serializers";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (ctx.role !== "trainer" && ctx.role !== "madam") {
      return Response.json(
        { error: "Only a trainer or the studio owner can edit the curriculum." },
        { status: 403 },
      );
    }
    const { id } = await params;
    const { data: existing } = await ctx.supabase
      .from("competency_units")
      .select("id")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!existing) return Response.json({ error: "Unit not found" }, { status: 404 });

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.code !== undefined) data.code = body.code ? String(body.code) : null;
    if (body.learningOutcomes !== undefined) data.learning_outcomes = String(body.learningOutcomes);
    if (body.assessmentCriteria !== undefined)
      data.assessment_criteria = String(body.assessmentCriteria);
    if (body.nominalHours !== undefined)
      data.nominal_hours = body.nominalHours != null ? Number(body.nominalHours) : null;
    if (body.order !== undefined) data.order_index = Number(body.order);

    const { data: updated, error } = await ctx.supabase
      .from("competency_units")
      .update(data)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;

    return Response.json(serializeCompetencyUnit(updated));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (ctx.role !== "trainer" && ctx.role !== "madam") {
      return Response.json(
        { error: "Only a trainer or the studio owner can edit the curriculum." },
        { status: 403 },
      );
    }
    const { id } = await params;
    const { data: existing } = await ctx.supabase
      .from("competency_units")
      .select("id")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!existing) return Response.json({ error: "Unit not found" }, { status: 404 });

    // Tasks that referenced this unit just lose the reference (SET NULL),
    // their history/grades are untouched.
    await ctx.supabase.from("competency_units").delete().eq("id", id);
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
