import { getTenant } from "@/lib/db/session";
import { serializeTrainingLog } from "@/lib/db/serializers";

const LOG_SELECT =
  "*, trainee:profiles!training_logs_trainee_id_fkey(id, full_name, role), mentor:profiles!training_logs_mentor_id_fkey(id, full_name)";

// GET /api/training-logs?traineeId=ID — logs for a trainee (or all if no filter)
export async function GET(req: Request) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const requestedTraineeId = url.searchParams.get("traineeId");
    // A trainee can only ever see their own logs, no matter what the query
    // string asks for. Trainer/madam may filter by any traineeId, or omit
    // it to see the whole shop.
    const traineeId = ctx.role === "trainee" ? ctx.userId : requestedTraineeId;

    let query = ctx.db.from("training_logs").select(LOG_SELECT).eq("shop_id", ctx.shopId);
    if (traineeId) query = query.eq("trainee_id", traineeId);

    const { data: logs, error } = await query.order("date", { ascending: false });
    if (error) throw error;

    return Response.json(logs.map(serializeTrainingLog));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// POST — create a training log entry
export async function POST(req: Request) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { traineeId, mentorId, skill, title, note, status, date } = body || {};
    if (!traineeId || !title) {
      return Response.json({ error: "Trainee and title are required." }, { status: 400 });
    }

    const { data: trainee } = await ctx.db
      .from("profiles")
      .select("id")
      .eq("id", String(traineeId))
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!trainee) return Response.json({ error: "Trainee not found" }, { status: 404 });

    let finalMentorId: string | null = null;
    if (mentorId) {
      const { data: mentor } = await ctx.db
        .from("profiles")
        .select("id")
        .eq("id", String(mentorId))
        .eq("shop_id", ctx.shopId)
        .maybeSingle();
      finalMentorId = mentor ? String(mentorId) : null;
    }

    const validStatus = ["Learning", "Practicing", "Proficient"].includes(status)
      ? status
      : "Learning";

    const { data: log, error } = await ctx.db
      .from("training_logs")
      .insert({
        shop_id: ctx.shopId,
        trainee_id: traineeId,
        mentor_id: finalMentorId,
        skill: skill || null,
        title: String(title),
        note: note || null,
        status: validStatus,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
      })
      .select(LOG_SELECT)
      .single();
    if (error) throw error;

    return Response.json(serializeTrainingLog(log));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
