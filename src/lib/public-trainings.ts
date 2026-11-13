// Server-side helpers for the public Training pages and their API routes.
import { getPool } from "@/lib/db/pool";

export const TRAINING_KINDS = ["Webinar", "Class", "Training"] as const;
export const TRAINING_STATUSES = ["Scheduled", "Live", "Completed", "Cancelled"] as const;

export type PublicTraining = {
  id: string; title: string; description: string; presenter: string; kind: string;
  startsAt: string | null; durationMinutes: number; status: string;
  spotsLeft: number | null; hasReplay: boolean; onsite: boolean;
};

export const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
export function pick<T extends string>(v: unknown, list: readonly T[], fallback: T): T {
  return typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : fallback;
}
/** Only http(s) links are accepted, so a saved link can never be a script. */
export function safeUrl(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString().slice(0, 500) : null;
  } catch { return null; }
}
export const isEmail = (v: string) => v.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(v);

/** Published sessions for the website: upcoming first, plus recent past ones. Never includes links. */
export async function loadPublicTrainings(): Promise<PublicTraining[]> {
  try {
    const { rows } = await getPool().query(
      `select t.id, t.title, t.description, t.presenter, t.kind, t.starts_at, t.duration_minutes, t.status, t.capacity, t.delivery,
              (t.replay_url is not null or (t.delivery = 'onsite' and t.media_id is not null)) as has_replay,
              (select count(*)::int from public.system_training_registrations r where r.training_id = t.id) as signed_up
         from public.system_public_trainings t
        where t.published and t.status <> 'Cancelled'
          and (t.starts_at is null or t.starts_at > now() - interval '90 days')
        order by t.starts_at asc nulls last`
    );
    return rows.map((r) => ({
      id: r.id, title: r.title, description: r.description ?? "", presenter: r.presenter ?? "", kind: r.kind,
      startsAt: r.starts_at ? new Date(r.starts_at).toISOString() : null, durationMinutes: r.duration_minutes, status: r.status,
      spotsLeft: r.capacity === null ? null : Math.max(0, r.capacity - r.signed_up), hasReplay: r.has_replay, onsite: r.delivery === "onsite",
    }));
  } catch (error) {
    console.error("[public-trainings] could not load sessions", error);
    return [];
  }
}

/** A session counts as past once it is marked completed or its time plus duration has gone by. */
export function isPastSession(s: Pick<PublicTraining, "status" | "startsAt" | "durationMinutes">, now = Date.now()) {
  return s.status === "Completed" || (s.status !== "Live" && s.startsAt !== null && Date.parse(s.startsAt) < now - s.durationMinutes * 60000);
}

// Small in-memory limiter for the public sign-up route (per server instance).
const hits = new Map<string, number[]>();
export function tooManyRequests(key: string, limit = 8, windowMs = 60 * 60 * 1000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return recent.length > limit;
}
