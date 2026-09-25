import { getTenant } from "@/lib/supabase/session";
import { serializeTrainingProgram } from "@/lib/supabase/serializers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { data: program } = await ctx.supabase
      .from("training_programs")
      .select(
        "*, units:competency_units(*), created_by:profiles!training_programs_created_by_id_fkey(id, full_name), trainees:profiles!profiles_program_id_fkey(*)"
      )
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!program) return Response.json({ error: "Program not found" }, { status: 404 });

    return Response.json({
      ...serializeTrainingProgram(program),
      trainees: Array.isArray(program.trainees)
        ? program.trainees.map((t: Record<string, any>) => ({ id: t.id, fullName: t.full_name }))
        : [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (ctx.role !== "trainer" && ctx.role !== "madam") {
      return Response.json(
        { error: "Only a trainer or the studio owner can edit a training program." },
        { status: 403 },
      );
    }
    const { id } = await params;
    const { data: existing } = await ctx.supabase
      .from("training_programs")
      .select("id")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!existing) return Response.json({ error: "Program not found" }, { status: 404 });

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.level !== undefined) data.level = String(body.level).trim();
    if (body.durationWeeks !== undefined) data.duration_weeks = Number(body.durationWeeks);
    if (body.description !== undefined)
      data.description = body.description ? String(body.description) : null;

    const { data: updated, error } = await ctx.supabase
      .from("training_programs")
      .update(data)
      .eq("id", id)
      .select("*, units:competency_units(*)")
      .single();
    if (error) throw error;

    return Response.json(serializeTrainingProgram(updated));
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
        { error: "Only a trainer or the studio owner can delete a training program." },
        { status: 403 },
      );
    }
    const { id } = await params;
    const { data: existing } = await ctx.supabase
      .from("training_programs")
      .select("id")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!existing) return Response.json({ error: "Program not found" }, { status: 404 });

    // Enrolled trainees fall back to no program (program_id -> NULL — see
    // "on delete set null" in supabase/schema/0001_tables.sql).
    await ctx.supabase.from("training_programs").delete().eq("id", id);
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
