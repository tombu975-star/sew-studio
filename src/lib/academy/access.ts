import { getPool } from "@/lib/db/pool";
import { getSystemAdminSession } from "@/lib/db/session";
import { getLearner } from "./auth";

export type MediaRow = { id: string; kind: string; content_type: string; storage_key: string; status: string };

/**
 * Who may fetch a stored file:
 *  - course covers: anyone (they appear on the public catalogue);
 *  - preview lessons: anyone;
 *  - other lesson files and live-session files: a signed-in learner;
 *  - platform admins: everything (to preview their own uploads).
 */
export async function mediaAccess(media: MediaRow): Promise<{ allowed: boolean; cache: string }> {
  const pool = getPool();
  const cover = await pool.query("select 1 from public.academy_courses where cover_media_id = $1 and published limit 1", [media.id]);
  if (cover.rowCount) return { allowed: true, cache: "public, max-age=86400" };
  const lesson = await pool.query(
    `select l.is_preview from public.academy_lessons l join public.academy_courses c on c.id = l.course_id
      where (l.media_id = $1 or l.captions_media_id = $1) and c.published`, [media.id]);
  if (lesson.rows.some((r) => r.is_preview)) return { allowed: true, cache: "public, max-age=3600" };
  const needsSignIn = lesson.rowCount
    || (await pool.query("select 1 from public.system_public_trainings where (media_id = $1 or captions_media_id = $1) and published limit 1", [media.id])).rowCount;
  if (needsSignIn && (await getLearner())) return { allowed: true, cache: "private, max-age=3600" };
  if (await getSystemAdminSession()) return { allowed: true, cache: "private, no-store" };
  return { allowed: false, cache: "no-store" };
}
