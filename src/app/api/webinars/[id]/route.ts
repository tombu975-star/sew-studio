import {
  WEBINAR_AUDIENCES, WEBINAR_KINDS, WEBINAR_STATUSES,
  clean, pick, requireScheduler, safeUrl, serializeWebinar,
} from "@/lib/db/webinars";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireScheduler();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if ("title" in b) { const t = clean(b.title, 150); if (!t) return Response.json({ error: "Give the session a title." }, { status: 400 }); patch.title = t; }
  if ("description" in b) patch.description = clean(b.description, 2000) || null;
  if ("presenter" in b) patch.presenter = clean(b.presenter, 100) || null;
  if ("kind" in b) patch.kind = pick(b.kind, WEBINAR_KINDS, "Webinar");
  if ("status" in b) patch.status = pick(b.status, WEBINAR_STATUSES, "Scheduled");
  if ("audience" in b) patch.audience = pick(b.audience, WEBINAR_AUDIENCES, "Everyone");
  if ("startsAt" in b) patch.starts_at = typeof b.startsAt === "string" && !Number.isNaN(Date.parse(b.startsAt)) ? new Date(b.startsAt).toISOString() : null;
  if ("durationMinutes" in b) patch.duration_minutes = Math.min(1440, Math.max(5, Math.round(Number(b.durationMinutes)) || 60));
  for (const [field, column, label] of [["meetingUrl", "meeting_url", "meeting"], ["registrationUrl", "registration_url", "registration or replay"]] as const) {
    if (field in b) {
      if (b[field] && !safeUrl(b[field])) return Response.json({ error: `The ${label} link must start with https://` }, { status: 400 });
      patch[column] = safeUrl(b[field]);
    }
  }
  const { data, error } = await ctx.db.from("webinars").update(patch).eq("id", id).eq("shop_id", ctx.shopId).select("*").maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Session not found." }, { status: 404 });
  return Response.json(serializeWebinar(data));
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireScheduler();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const { id } = await params;
  const { error } = await ctx.db.from("webinars").delete().eq("id", id).eq("shop_id", ctx.shopId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
