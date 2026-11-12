// Shared helpers for the Webinars & Training API.
import { getTenant } from "@/lib/db/session";

export const WEBINAR_KINDS = ["Webinar", "Class", "Training"] as const;
export const WEBINAR_STATUSES = ["Scheduled", "Live", "Completed", "Cancelled"] as const;
export const WEBINAR_AUDIENCES = ["Everyone", "Staff", "Trainers", "Trainees"] as const;

/** Which audiences a role may see. The owner sees everything. */
export const VISIBLE_AUDIENCES: Record<string, readonly string[]> = {
  madam: WEBINAR_AUDIENCES,
  staff: ["Everyone", "Staff"],
  trainer: ["Everyone", "Trainers", "Trainees"],
  trainee: ["Everyone", "Trainees"],
};

/** Only http(s) links are accepted, so a saved link can never be a script. */
export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString().slice(0, 500) : null;
  } catch {
    return null;
  }
}

export function pick<T extends string>(value: unknown, list: readonly T[], fallback: T): T {
  return typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : fallback;
}

export const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function serializeWebinar(w: Record<string, any>) {
  return {
    id: w.id as string, title: w.title as string, description: (w.description ?? "") as string,
    presenter: (w.presenter ?? "") as string, kind: w.kind as string, startsAt: (w.starts_at ?? null) as string | null,
    durationMinutes: Number(w.duration_minutes), meetingUrl: (w.meeting_url ?? "") as string,
    registrationUrl: (w.registration_url ?? "") as string, status: w.status as string, audience: w.audience as string,
  };
}

/** Owner and trainer can schedule and edit sessions; everyone else can view them. */
export async function requireScheduler(): Promise<
  { ctx: NonNullable<Awaited<ReturnType<typeof getTenant>>> } | { error: Response }
> {
  const ctx = await getTenant();
  if (!ctx) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  if (ctx.role !== "madam" && ctx.role !== "trainer") {
    return { error: Response.json({ error: "Only the studio owner or a trainer can schedule sessions." }, { status: 403 }) };
  }
  return { ctx };
}
