import { getTenant } from "@/lib/supabase/session";
import { serializeTrainingProgram } from "@/lib/supabase/serializers";

const PROGRAM_SELECT =
  "*, units:competency_units(*), created_by:profiles!training_programs_created_by_id_fkey(id, full_name), trainees:profiles!profiles_program_id_fkey(count)";

// GET /api/training-programs — list this shop's curriculum.
// Everyone in the shop can view (a trainee needs to see the curriculum
// they're enrolled in), but only trainer/madam can create or edit one.
export async function GET() {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { data: programs, error } = await ctx.supabase
      .from("training_programs")
      .select(PROGRAM_SELECT)
      .eq("shop_id", ctx.shopId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return Response.json(programs.map(serializeTrainingProgram));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// POST /api/training-programs — create a program (trainer/madam only),
// optionally with an initial list of competency units.
export async function POST(req: Request) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (ctx.role !== "trainer" && ctx.role !== "madam") {
      return Response.json(
        { error: "Only a trainer or the studio owner can create a training program." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const level = String(body?.level ?? "").trim();
    const durationWeeks = Number(body?.durationWeeks);
    if (!name || !level || !durationWeeks || durationWeeks <= 0) {
      return Response.json(
        { error: "name, level and a positive durationWeeks are required." },
        { status: 400 },
      );
    }

    const units = Array.isArray(body?.units) ? body.units : [];

    const { data: program, error } = await ctx.supabase
      .from("training_programs")
      .insert({
        shop_id: ctx.shopId,
        name,
        level,
        duration_weeks: durationWeeks,
        description: body?.description ? String(body.description) : null,
        created_by_id: ctx.userId,
      })
      .select("*")
      .single();
    if (error) throw error;

    if (units.length > 0) {
      const { error: unitsError } = await ctx.supabase.from("competency_units").insert(
        units.map(
          (
            u: {
              title?: string;
              code?: string;
              learningOutcomes?: string;
              assessmentCriteria?: string;
              nominalHours?: number;
            },
            i: number,
          ) => ({
            shop_id: ctx.shopId,
            program_id: program.id,
            title: String(u.title ?? "").trim(),
            code: u.code ? String(u.code) : null,
            learning_outcomes: String(u.learningOutcomes ?? ""),
            assessment_criteria: String(u.assessmentCriteria ?? ""),
            nominal_hours: u.nominalHours != null ? Number(u.nominalHours) : null,
            order_index: i,
          }),
        ),
      );
      if (unitsError) throw unitsError;
    }

    const { data: withUnits, error: refetchError } = await ctx.supabase
      .from("training_programs")
      .select("*, units:competency_units(*)")
      .eq("id", program.id)
      .single();
    if (refetchError) throw refetchError;

    return Response.json(serializeTrainingProgram(withUnits), { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
