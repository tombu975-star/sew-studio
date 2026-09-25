import { getTenant } from "@/lib/supabase/session";
import { serializeTrainingLog } from "@/lib/supabase/serializers";

const LOG_SELECT =
  "*, trainee:profiles!training_logs_trainee_id_fkey(id, full_name, role), mentor:profiles!training_logs_mentor_id_fkey(id, full_name)";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { data: existing } = await ctx.supabase
      .from("training_logs")
      .select("id")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!existing) return Response.json({ error: "Training log not found" }, { status: 404 });

    const body = await req.json();
    const { skill, title, note, status, mentorId } = body || {};
    const data: Record<string, unknown> = {};
    if (skill !== undefined) data.skill = skill;
    if (title !== undefined) data.title = title;
    if (note !== undefined) data.note = note;
    if (["Learning", "Practicing", "Proficient"].includes(status)) data.status = status;
    if (mentorId !== undefined) {
      if (mentorId) {
        const { data: mentor } = await ctx.supabase
          .from("profiles")
          .select("id")
          .eq("id", String(mentorId))
          .eq("shop_id", ctx.shopId)
          .maybeSingle();
        data.mentor_id = mentor ? String(mentorId) : null;
      } else {
        data.mentor_id = null;
      }
    }

    const { data: updated, error } = await ctx.supabase
      .from("training_logs")
      .update(data)
      .eq("id", id)
      .select(LOG_SELECT)
      .single();
    if (error) throw error;

    return Response.json(serializeTrainingLog(updated));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { data: existing } = await ctx.supabase
      .from("training_logs")
      .select("id")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!existing) return Response.json({ error: "Training log not found" }, { status: 404 });

    await ctx.supabase.from("training_logs").delete().eq("id", id);
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
