import { getLearner } from "@/lib/academy/auth";
import { afterLessonComplete } from "@/lib/academy/data";
import { UUID, json } from "@/lib/academy/http";
import { getPool } from "@/lib/db/pool";

// Saves where the learner stopped, and marks video or reading lessons done.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const learner = await getLearner();
  if (!learner) return json({ error: "Please sign in." }, 401);
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "Lesson not found." }, 404);
  const b = await req.json().catch(() => ({}));
  const pool = getPool();
  const { rows } = await pool.query(
    `select l.course_id, l.kind from public.academy_lessons l join public.academy_courses c on c.id = l.course_id where l.id = $1 and c.published`, [id]);
  const lesson = rows[0];
  if (!lesson) return json({ error: "Lesson not found." }, 404);
  const position = Math.max(0, Math.min(86400, Math.round(Number(b.position) || 0)));
  const complete = b.completed === true && lesson.kind !== "quiz"; // a quiz is finished only by passing it
  await pool.query(
    `insert into public.academy_progress (learner_id, lesson_id, position_seconds, completed_at) values ($1, $2, $3, case when $4 then now() end)
       on conflict (learner_id, lesson_id) do update set position_seconds = excluded.position_seconds, updated_at = now(),
         completed_at = coalesce(public.academy_progress.completed_at, excluded.completed_at)`, [learner.id, id, position, complete]);
  await pool.query(`insert into public.academy_enrollments (learner_id, course_id) values ($1, $2) on conflict do nothing`, [learner.id, lesson.course_id]);
  const result = complete ? await afterLessonComplete(learner.id, lesson.course_id) : null;
  return json({ ok: true, ...(result ?? {}) });
}
