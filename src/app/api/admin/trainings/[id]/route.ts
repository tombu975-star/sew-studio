import { NextResponse } from "next/server";
import { getSystemAdminSession } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";
import { TRAINING_KINDS, TRAINING_STATUSES, clean, pick, safeUrl } from "@/lib/public-trainings";

type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await getSystemAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Session not found." }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const set: string[] = []; const vals: unknown[] = [];
  const add = (col: string, v: unknown) => { vals.push(v); set.push(`${col} = $${vals.length}`); };
  if ("title" in b) { const t = clean(b.title, 150); if (!t) return NextResponse.json({ error: "Give the session a title." }, { status: 400 }); add("title", t); }
  if ("description" in b) add("description", clean(b.description, 2000) || null);
  if ("presenter" in b) add("presenter", clean(b.presenter, 100) || null);
  if ("kind" in b) add("kind", pick(b.kind, TRAINING_KINDS, "Webinar"));
  if ("status" in b) add("status", pick(b.status, TRAINING_STATUSES, "Scheduled"));
  if ("published" in b) add("published", !!b.published);
  if ("capacity" in b) add("capacity", Number(b.capacity) > 0 ? Math.round(Number(b.capacity)) : null);
  if ("durationMinutes" in b) add("duration_minutes", Math.min(1440, Math.max(5, Math.round(Number(b.durationMinutes)) || 60)));
  if ("startsAt" in b) add("starts_at", typeof b.startsAt === "string" && !Number.isNaN(Date.parse(b.startsAt)) ? new Date(b.startsAt).toISOString() : null);
  for (const [field, col, label] of [["meetingUrl", "meeting_url", "join"], ["replayUrl", "replay_url", "replay"]] as const) {
    if (field in b) {
      if (b[field] && !safeUrl(b[field])) return NextResponse.json({ error: `The ${label} link must start with https://` }, { status: 400 });
      add(col, safeUrl(b[field]));
    }
  }
  if (!set.length) return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  vals.push(id);
  const res = await getPool().query(`update public.system_public_trainings set ${set.join(", ")} where id = $${vals.length} returning id`, vals);
  if (!res.rowCount) return NextResponse.json({ error: "Session not found." }, { status: 404 });
  await getPool().query(`insert into public.system_platform_audit_log (admin_id, action, entity, details) values ($1, 'training.updated', 'public_training', $2::jsonb)`, [session.adminId, JSON.stringify({ id })]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSystemAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Session not found." }, { status: 404 });
  await getPool().query("delete from public.system_public_trainings where id = $1", [id]);
  await getPool().query(`insert into public.system_platform_audit_log (admin_id, action, entity, details) values ($1, 'training.deleted', 'public_training', $2::jsonb)`, [session.adminId, JSON.stringify({ id })]);
  return NextResponse.json({ ok: true });
}
