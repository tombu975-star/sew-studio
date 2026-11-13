import { requireAdmin } from "@/lib/academy/admin";
import { json } from "@/lib/academy/http";
import { getPool } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

export async function GET() {
  const a = await requireAdmin(); if ("error" in a) return a.error;
  const { rows } = await getPool().query(
    `select t.id, t.title, t.starts_at as "startsAt", t.duration_minutes as "durationMinutes", t.status, t.delivery,
            t.media_id as "mediaId", t.captions_media_id as "captionsMediaId", m.filename as "mediaName",
            (select count(*)::int from public.academy_live_messages x where x.training_id = t.id and x.kind = 'question' and not x.answered and not x.hidden) as "openQuestions"
       from public.system_public_trainings t left join public.academy_media m on m.id = t.media_id order by t.starts_at desc nulls first`);
  return json(rows);
}
