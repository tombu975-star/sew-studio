import { getTenant } from "@/lib/db/session";
import {
  VISIBLE_AUDIENCES, WEBINAR_AUDIENCES, WEBINAR_KINDS, WEBINAR_STATUSES,
  clean, pick, requireScheduler, safeUrl, serializeWebinar,
} from "@/lib/db/webinars";

export async function GET() {
  const ctx = await getTenant();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await ctx.db.from("webinars").select("*").eq("shop_id", ctx.shopId).order("starts_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const allowed = VISIBLE_AUDIENCES[ctx.role] ?? ["Everyone"];
  return Response.json((data ?? []).filter((w: { audience: string }) => allowed.includes(w.audience)).map(serializeWebinar));
}

export async function POST(req: Request) {
  const auth = await requireScheduler();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const b = await req.json().catch(() => ({}));
  const title = clean(b.title, 150);
  if (!title) return Response.json({ error: "Give the session a title." }, { status: 400 });
  const startsAt = typeof b.startsAt === "string" && !Number.isNaN(Date.parse(b.startsAt)) ? new Date(b.startsAt).toISOString() : null;
  if (b.meetingUrl && !safeUrl(b.meetingUrl)) return Response.json({ error: "The meeting link must start with https://" }, { status: 400 });
  if (b.registrationUrl && !safeUrl(b.registrationUrl)) return Response.json({ error: "The registration or replay link must start with https://" }, { status: 400 });
  const { data, error } = await ctx.db.from("webinars").insert({
    shop_id: ctx.shopId, title, description: clean(b.description, 2000) || null, presenter: clean(b.presenter, 100) || null,
    kind: pick(b.kind, WEBINAR_KINDS, "Webinar"), starts_at: startsAt,
    duration_minutes: Math.min(1440, Math.max(5, Math.round(Number(b.durationMinutes)) || 60)),
    meeting_url: safeUrl(b.meetingUrl), registration_url: safeUrl(b.registrationUrl),
    status: pick(b.status, WEBINAR_STATUSES, "Scheduled"), audience: pick(b.audience, WEBINAR_AUDIENCES, "Everyone"),
    created_by: ctx.userId,
  }).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(serializeWebinar(data), { status: 201 });
}
