import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db/pool";
import { sendEmail } from "@/lib/mailer";
import { SITE } from "@/lib/site-config";
import { clean, isEmail, isPastSession, tooManyRequests } from "@/lib/public-trainings";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Free sign-up for people without an account. Returns the join link (or the replay link for a past session).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Session not found." }, { status: 404 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (tooManyRequests(`reg:${ip}`)) return NextResponse.json({ error: "Too many sign-ups from this connection. Please try again later." }, { status: 429 });

  const b = await req.json().catch(() => ({}));
  if (clean(b.website, 100)) return NextResponse.json({ ok: true }); // honeypot: bots fill hidden fields
  const fullName = clean(b.fullName, 120);
  const email = clean(b.email, 254).toLowerCase();
  const phone = clean(b.phone, 30);
  if (fullName.length < 2) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!isEmail(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (phone && !/^[+\d][\d\s()-]{5,}$/.test(phone)) return NextResponse.json({ error: "Please enter a valid phone number, or leave it blank." }, { status: 400 });

  const pool = getPool();
  const { rows } = await pool.query(
    `select t.*, (select count(*)::int from public.system_training_registrations r where r.training_id = t.id) as signed_up
       from public.system_public_trainings t where t.id = $1 and t.published and t.status <> 'Cancelled'`, [id]);
  const t = rows[0];
  if (!t) return NextResponse.json({ error: "This session is not open for sign-up." }, { status: 404 });

  const past = isPastSession({ status: t.status, startsAt: t.starts_at ? new Date(t.starts_at).toISOString() : null, durationMinutes: t.duration_minutes });
  const onsite = t.delivery === "onsite";
  if (past && !t.replay_url && !(onsite && t.media_id)) return NextResponse.json({ error: "This session has finished." }, { status: 410 });

  const insert = await pool.query(
    `insert into public.system_training_registrations (training_id, full_name, email, phone, about_you)
     select $1, $2, $3, $4, $5
      where $6::int is null or (select count(*) from public.system_training_registrations where training_id = $1) < $6::int
     on conflict (training_id, lower(email)) do nothing
     returning id`,
    [id, fullName, email, phone || null, clean(b.aboutYou, 120) || null, t.capacity]);
  const alreadyIn = insert.rowCount === 0 && (await pool.query(
    "select 1 from public.system_training_registrations where training_id = $1 and lower(email) = $2", [id, email])).rowCount! > 0;
  if (insert.rowCount === 0 && !alreadyIn) return NextResponse.json({ error: "Sorry, this session is full." }, { status: 409 });

  const base = (process.env.NEXT_PUBLIC_APP_URL || SITE.appUrl).replace(/\/$/, "");
  const link: string | null = onsite ? `${base}/academy/live/${id}` : past ? t.replay_url : t.meeting_url;
  const when = t.starts_at ? new Date(t.starts_at).toUTCString().replace("GMT", "UTC") : "date to be announced";
  if (!alreadyIn) {
    void sendEmail({
      to: email, type: "training-registration",
      subject: `You are signed up: ${t.title}`,
      body: `Hello ${fullName},\n\nYou are signed up for "${t.title}" (${when}).\n\n${link ? `${past ? "Watch the replay" : "Join here"}: ${link}${onsite ? "\n(You will sign in with a code we email you. No password needed.)" : ""}\n\n` : "We will send the joining link before the session starts.\n\n"}See you there,\nThe Sewsiness team`,
    }).catch(() => undefined);
  }
  return NextResponse.json({ ok: true, alreadyRegistered: alreadyIn, title: t.title, startsAt: t.starts_at, link, linkKind: past ? "replay" : "join" });
}
