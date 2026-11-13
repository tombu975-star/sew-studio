import { requireAdmin } from "@/lib/academy/admin";
import { UUID, json } from "@/lib/academy/http";
import { lessonValues } from "@/lib/academy/lesson-input";
import { getPool } from "@/lib/db/pool";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin(); if ("error" in a) return a.error;
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "Not found." }, 404);
  const b = await req.json().catch(() => ({}));
  const r = lessonValues(b, false);
  if ("error" in r) return json({ error: r.error }, 400);
  const pool = getPool();
  const next = await pool.query("select coalesce(max(position), -1) + 1 as p from public.academy_lessons where course_id = $1", [id]);
  const v = { section: "Lessons", position: next.rows[0].p, ...r.values };
  const cols = Object.keys(v);
  const ins = await pool.query(
    `insert into public.academy_lessons (course_id, ${cols.join(", ")}) values ($1, ${cols.map((_, i) => `$${i + 2}`).join(", ")}) returning id`,
    [id, ...Object.values(v)]);
  return json({ id: ins.rows[0].id }, 201);
}
