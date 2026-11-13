import { getLearner } from "@/lib/academy/auth";
import { afterLessonComplete } from "@/lib/academy/data";
import { UUID, json } from "@/lib/academy/http";
import { grade, parseQuiz } from "@/lib/academy/quiz";
import { getPool } from "@/lib/db/pool";

// Marks a quiz on the server, so the answers are never sent to the browser in advance.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const learner = await getLearner();
  if (!learner) return json({ error: "Please sign in." }, 401);
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "Lesson not found." }, 404);
  const pool = getPool();
  const { rows } = await pool.query(
    `select l.course_id, l.quiz, c.pass_mark from public.academy_lessons l join public.academy_courses c on c.id = l.course_id
      where l.id = $1 and l.kind = 'quiz' and c.published`, [id]);
  const row = rows[0];
  const quiz = row ? parseQuiz(row.quiz) : null;
  if (!row || !quiz) return json({ error: "Quiz not found." }, 404);
  const b = await req.json().catch(() => ({}));
  const outcome = grade(quiz, b.answers, row.pass_mark);
  await pool.query(`insert into public.academy_quiz_attempts (learner_id, lesson_id, score, total, passed) values ($1, $2, $3, $4, $5)`,
    [learner.id, id, outcome.score, outcome.total, outcome.passed]);
  let after: Awaited<ReturnType<typeof afterLessonComplete>> | null = null;
  if (outcome.passed) {
    await pool.query(
      `insert into public.academy_progress (learner_id, lesson_id, completed_at) values ($1, $2, now())
         on conflict (learner_id, lesson_id) do update set completed_at = coalesce(public.academy_progress.completed_at, now()), updated_at = now()`, [learner.id, id]);
    after = await afterLessonComplete(learner.id, row.course_id);
  }
  return json({ ...outcome, passMark: row.pass_mark, ...(after ?? {}) });
}
