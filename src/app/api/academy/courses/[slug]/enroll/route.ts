import { getLearner } from "@/lib/academy/auth";
import { json } from "@/lib/academy/http";
import { getPool } from "@/lib/db/pool";

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const learner = await getLearner();
  if (!learner) return json({ error: "Please sign in to start this course." }, 401);
  const { slug } = await params;
  const { rows } = await getPool().query("select id from public.academy_courses where lower(slug) = lower($1) and published", [slug]);
  if (!rows[0]) return json({ error: "Course not found." }, 404);
  await getPool().query("insert into public.academy_enrollments (learner_id, course_id) values ($1, $2) on conflict do nothing", [learner.id, rows[0].id]);
  return json({ ok: true });
}
