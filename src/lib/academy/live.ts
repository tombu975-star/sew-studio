import { getPool } from "@/lib/db/pool";

export type Phase = "upcoming" | "live" | "replay";

/** upcoming until the start time, live while the session runs, then replay. */
export function sessionPhase(s: { status: string; startsAt: string | null; durationMinutes: number }, now = Date.now()): Phase {
  const start = s.startsAt ? Date.parse(s.startsAt) : null;
  if (s.status === "Completed") return "replay";
  if (s.status === "Live") return "live";
  if (start === null) return "upcoming";
  if (now >= start + s.durationMinutes * 60000) return "replay";
  return now >= start ? "live" : "upcoming";
}

export type LiveSession = {
  id: string; title: string; description: string; presenter: string; kind: string; startsAt: string | null;
  durationMinutes: number; status: string; delivery: "external" | "onsite"; mediaId: string | null; captionsMediaId: string | null; phase: Phase;
};

export async function loadLiveSession(id: string): Promise<LiveSession | null> {
  const { rows } = await getPool().query(
    `select id, title, coalesce(description, '') as description, coalesce(presenter, '') as presenter, kind, starts_at, duration_minutes,
            status, delivery, media_id, captions_media_id
       from public.system_public_trainings where id = $1 and published and status <> 'Cancelled'`, [id]);
  const r = rows[0];
  if (!r) return null;
  const s = { id: r.id, title: r.title, description: r.description, presenter: r.presenter, kind: r.kind,
    startsAt: r.starts_at ? new Date(r.starts_at).toISOString() : null, durationMinutes: r.duration_minutes, status: r.status,
    delivery: r.delivery, mediaId: r.media_id, captionsMediaId: r.captions_media_id };
  return { ...s, phase: sessionPhase(s) };
}
