import { getLearner } from "@/lib/academy/auth";
import { getLearnerDashboard } from "@/lib/academy/data";
import { json, text } from "@/lib/academy/http";
import { getPool } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const learner = await getLearner();
  if (!learner) return json({ learner: null });
  if (new URL(req.url).searchParams.get("summary") !== "1") return json({ learner });
  const d = await getLearnerDashboard(learner.id);
  const open = d.courses.find((c) => !c.completedAt && c.lastLessonId);
  return json({ learner, streak: d.streak, resume: open ? { title: open.title, slug: open.slug, lessonId: open.lastLessonId, done: open.done, total: open.lessonCount } : null });
}

export async function PATCH(req: Request) {
  const learner = await getLearner();
  if (!learner) return json({ error: "Please sign in." }, 401);
  const b = await req.json().catch(() => ({}));
  const fullName = text(b.fullName, 120);
  if (fullName.length < 2) return json({ error: "Please enter your name." }, 400);
  await getPool().query("update public.academy_learners set full_name = $2 where id = $1", [learner.id, fullName]);
  return json({ ok: true });
}
