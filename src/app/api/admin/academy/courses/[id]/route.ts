import { audit, requireAdmin } from "@/lib/academy/admin";
import { UUID, json, text } from "@/lib/academy/http";
import { getPool } from "@/lib/db/pool";

export const dynamic = "force-dynamic";
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const COLOR = /^#[0-9a-fA-F]{6}$/;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin(); if ("error" in a) return a.error;
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "Not found." }, 404);
  const pool = getPool();
  const c = await pool.query(
    `select id, slug, title, coalesce(subtitle, '') as subtitle, coalesce(description, '') as description, level, coalesce(category, '') as category,
            cover_media_id as "coverMediaId", accent, pass_mark as "passMark", certificate_enabled as "certificateEnabled", published, sort_order as "sortOrder"
       from public.academy_courses where id = $1`, [id]);
  if (!c.rows[0]) return json({ error: "Not found." }, 404);
  const l = await pool.query(
    `select l.id, l.section, l.position, l.title, l.kind, coalesce(l.summary, '') as summary, coalesce(l.body, '') as body,
            l.media_id as "mediaId", l.captions_media_id as "captionsMediaId", l.duration_seconds as "durationSeconds", l.quiz, l.is_preview as "isPreview",
            m.filename as "mediaName", m.status as "mediaStatus"
       from public.academy_lessons l left join public.academy_media m on m.id = l.media_id where l.course_id = $1 order by l.position, l.created_at`, [id]);
  return json({ ...c.rows[0], lessons: l.rows });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin(); if ("error" in a) return a.error;
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "Not found." }, 404);
  const b = await req.json().catch(() => ({}));
  const sets: string[] = []; const vals: unknown[] = [id];
  const put = (col: string, v: unknown) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
  if (typeof b.title === "string") { const t = text(b.title, 150); if (!t) return json({ error: "The title cannot be empty." }, 400); put("title", t); }
  if (typeof b.subtitle === "string") put("subtitle", text(b.subtitle, 200) || null);
  if (typeof b.description === "string") put("description", text(b.description, 4000) || null);
  if (typeof b.category === "string") put("category", text(b.category, 60) || null);
  if (LEVELS.includes(b.level)) put("level", b.level);
  if (typeof b.accent === "string" && COLOR.test(b.accent)) put("accent", b.accent);
  if (Number.isInteger(b.passMark) && b.passMark >= 1 && b.passMark <= 100) put("pass_mark", b.passMark);
  if (typeof b.certificateEnabled === "boolean") put("certificate_enabled", b.certificateEnabled);
  if (Number.isInteger(b.sortOrder)) put("sort_order", b.sortOrder);
  if (b.coverMediaId === null || (typeof b.coverMediaId === "string" && UUID.test(b.coverMediaId))) put("cover_media_id", b.coverMediaId);
  if (typeof b.published === "boolean") {
    if (b.published) {
      const n = await getPool().query("select count(*)::int as n from public.academy_lessons where course_id = $1", [id]);
      if (!n.rows[0].n) return json({ error: "Add at least one lesson before publishing." }, 400);
    }
    put("published", b.published);
  }
  if (!sets.length) return json({ error: "Nothing to change." }, 400);
  try { await getPool().query(`update public.academy_courses set ${sets.join(", ")} where id = $1`, vals); }
  catch { return json({ error: "Could not save. Check the file you picked and try again." }, 400); }
  await audit(a.session.adminId, "academy.course.updated", { id, fields: Object.keys(b) });
  return json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin(); if ("error" in a) return a.error;
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "Not found." }, 404);
  await getPool().query("delete from public.academy_courses where id = $1", [id]);
  await audit(a.session.adminId, "academy.course.deleted", { id });
  return json({ ok: true });
}
