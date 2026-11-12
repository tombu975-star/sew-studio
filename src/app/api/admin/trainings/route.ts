import { NextResponse } from "next/server";
import { getSystemAdminSession } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";
import { TRAINING_KINDS, TRAINING_STATUSES, clean, pick, safeUrl } from "@/lib/public-trainings";

export const dynamic = "force-dynamic";

const ROW = `select t.id, t.title, t.description, t.presenter, t.kind, t.starts_at as "startsAt", t.duration_minutes as "durationMinutes",
  t.meeting_url as "meetingUrl", t.replay_url as "replayUrl", t.status, t.capacity, t.published,
  (select count(*)::int from public.system_training_registrations r where r.training_id = t.id) as "signedUp"
  from public.system_public_trainings t`;

export async function GET() {
  const session = await getSystemAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { rows } = await getPool().query(`${ROW} order by t.starts_at desc nulls first`);
  return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const session = await getSystemAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const title = clean(b.title, 150);
  if (!title) return NextResponse.json({ error: "Give the session a title." }, { status: 400 });
  if (b.meetingUrl && !safeUrl(b.meetingUrl)) return NextResponse.json({ error: "The join link must start with https://" }, { status: 400 });
  if (b.replayUrl && !safeUrl(b.replayUrl)) return NextResponse.json({ error: "The replay link must start with https://" }, { status: 400 });
  const startsAt = typeof b.startsAt === "string" && !Number.isNaN(Date.parse(b.startsAt)) ? new Date(b.startsAt).toISOString() : null;
  const capacity = Number(b.capacity) > 0 ? Math.round(Number(b.capacity)) : null;
  const { rows } = await getPool().query(
    `insert into public.system_public_trainings (title, description, presenter, kind, starts_at, duration_minutes, meeting_url, replay_url, status, capacity, published)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`,
    [title, clean(b.description, 2000) || null, clean(b.presenter, 100) || null, pick(b.kind, TRAINING_KINDS, "Webinar"), startsAt,
     Math.min(1440, Math.max(5, Math.round(Number(b.durationMinutes)) || 60)), safeUrl(b.meetingUrl), safeUrl(b.replayUrl),
     pick(b.status, TRAINING_STATUSES, "Scheduled"), capacity, b.published !== false]);
  await getPool().query(`insert into public.system_platform_audit_log (admin_id, action, entity, details) values ($1, 'training.created', 'public_training', $2::jsonb)`,
    [session.adminId, JSON.stringify({ id: rows[0].id, title })]);
  return NextResponse.json({ id: rows[0].id }, { status: 201 });
}
