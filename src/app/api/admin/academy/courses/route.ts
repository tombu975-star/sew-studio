import { audit, requireAdmin, slugify } from "@/lib/academy/admin";
import { json, text } from "@/lib/academy/http";
import { getPool } from "@/lib/db/pool";

export const dynamic = "force-dynamic";
const LEVELS = ["Beginner", "Intermediate", "Advanced"];

export async function GET() {
  const a = await requireAdmin(); if ("error" in a) return a.error;
  const { rows } = await getPool().query(
    `select c.id, c.slug, c.title, c.subtitle, c.level, c.category, c.published, c.sort_order as "sortOrder",
            (select count(*)::int from public.academy_lessons l where l.course_id = c.id) as "lessonCount",
            (select count(*)::int from public.academy_enrollments e where e.course_id = c.id) as learners,
            (select count(*)::int from public.academy_certificates x where x.course_id = c.id) as certificates
       from public.academy_courses c order by c.sort_order, c.created_at desc`);
  return json(rows);
}

export async function POST(req: Request) {
  const a = await requireAdmin(); if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const title = text(b.title, 150);
  if (!title) return json({ error: "Give the course a title." }, 400);
  const pool = getPool();
  let slug = slugify(title);
  if ((await pool.query("select 1 from public.academy_courses where lower(slug) = $1", [slug])).rowCount) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const { rows } = await pool.query(
    `insert into public.academy_courses (slug, title, subtitle, level, category) values ($1, $2, $3, $4, $5) returning id`,
    [slug, title, text(b.subtitle, 200) || null, LEVELS.includes(b.level) ? b.level : "Beginner", text(b.category, 60) || null]);
  await audit(a.session.adminId, "academy.course.created", { id: rows[0].id, title });
  return json({ id: rows[0].id }, 201);
}
