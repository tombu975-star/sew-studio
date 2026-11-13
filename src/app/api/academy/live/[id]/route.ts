import { getLearner } from "@/lib/academy/auth";
import { UUID, json } from "@/lib/academy/http";
import { loadLiveSession } from "@/lib/academy/live";
import { getPool } from "@/lib/db/pool";
import { getSystemAdminSession } from "@/lib/db/session";

export const dynamic = "force-dynamic";

// State of a live classroom: the session, the clock, and any chat newer than ?since=
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "Session not found." }, 404);
  const session = await loadLiveSession(id);
  if (!session) return json({ error: "Session not found." }, 404);
  const [learner, admin] = await Promise.all([getLearner(), getSystemAdminSession()]);
  const isHost = !!admin;
  const base = { serverNow: Date.now(), isHost, learner: learner ? { id: learner.id, name: learner.fullName } : null };
  if (!learner && !isHost) return json({ ...base, session: { ...session, mediaId: null, captionsMediaId: null }, messages: [], lastId: 0 });
  const since = Math.max(0, Number(new URL(req.url).searchParams.get("since")) || 0);
  const { rows } = await getPool().query(
    `select id, display_name as name, body, kind, answered, pinned, hidden, created_at as at, learner_id
       from public.academy_live_messages
      where training_id = $1 and id > $2 ${isHost ? "" : "and not hidden"} order by id ${since ? "asc" : "desc"} limit 100`, [id, since]);
  const list = (since ? rows : rows.reverse()).map((m) => ({ id: Number(m.id), name: m.name, body: m.body, kind: m.kind, answered: m.answered, pinned: m.pinned, hidden: m.hidden, at: m.at, mine: !!learner && m.learner_id === learner.id }));
  return json({ ...base, session, messages: list, lastId: list.length ? list[list.length - 1].id : since });
}
