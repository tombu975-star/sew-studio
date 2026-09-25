import { getTenant } from "@/lib/supabase/session";
import { serializeCompetencyUnit } from "@/lib/supabase/serializers";

// POST /api/training-programs/[id]/units — add a unit of competency
// (curriculum module) to a program. Trainer/madam only.
export async function POST(
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
    const { id: programId } = await params;
    const { data: program } = await ctx.supabase
      .from("training_programs")
      .select("id")
      .eq("id", programId)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!program) return Response.json({ error: "Program not found" }, { status: 404 });

    const body = await req.json();
    const title = String(body?.title ?? "").trim();
    if (!title) return Response.json({ error: "title is required." }, { status: 400 });

    const { count: lastOrder } = await ctx.supabase
      .from("competency_units")
      .select("id", { count: "exact", head: true })
      .eq("program_id", programId);

    const { data: unit, error } = await ctx.supabase
      .from("competency_units")
      .insert({
        shop_id: ctx.shopId,
        program_id: programId,
        title,
        code: body?.code ? String(body.code) : null,
        learning_outcomes: String(body?.learningOutcomes ?? ""),
        assessment_criteria: String(body?.assessmentCriteria ?? ""),
        nominal_hours: body?.nominalHours != null ? Number(body.nominalHours) : null,
        order_index: lastOrder ?? 0,
      })
      .select("*")
      .single();
    if (error) throw error;

    return Response.json(serializeCompetencyUnit(unit), { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
