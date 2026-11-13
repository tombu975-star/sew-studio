import { getLearner } from "@/lib/academy/auth";
import { UUID, json, text } from "@/lib/academy/http";
import { loadLiveSession } from "@/lib/academy/live";
import { getPool } from "@/lib/db/pool";
import { getSystemAdminSession } from "@/lib/db/session";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "Session not found." }, 404);
  const [learner, admin] = await Promise.all([getLearner(), getSystemAdminSession()]);
  if (!learner && !admin) return json({ error: "Please sign in to join the chat." }, 401);
  const session = await loadLiveSession(id);
  if (!session || session.delivery !== "onsite") return json({ error: "Session not found." }, 404);
  const b = await req.json().catch(() => ({}));
  const body = text(b.body, 500);
  if (!body) return json({ error: "Write a message first." }, 400);
  const pool = getPool();
  if (learner && !admin) {
    const recent = await pool.query(
      `select count(*) filter (where created_at > now() - interval '3 seconds')::int as burst, count(*)::int as total
         from public.academy_live_messages where training_id = $1 and learner_id = $2 and created_at > now() - interval '10 minutes'`, [id, learner.id]);
    if (recent.rows[0].burst > 0 || recent.rows[0].total >= 40) return json({ error: "You are sending messages too quickly. Wait a moment." }, 429);
  }
  const kind = admin ? "host" : b.kind === "question" ? "question" : "chat";
  const name = admin ? (session.presenter || "Host") : (learner!.fullName.split(" ")[0] || "Learner");
  await pool.query(
    `insert into public.academy_live_messages (training_id, learner_id, display_name, body, kind) values ($1, $2, $3, $4, $5)`,
    [id, admin ? null : learner!.id, name, body, kind]);
  return json({ ok: true }, 201);
}
