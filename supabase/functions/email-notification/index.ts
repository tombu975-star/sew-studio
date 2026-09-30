import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Email notification queue API.
 *
 * An external sender (e.g. a Google Apps Script) polls this function:
 *   get_pending → claims due jobs (marks them PROCESSING so two pollers never
 *                 send the same email twice) and returns them
 *   mark_sent   → the email went out
 *   mark_failed → it didn't; retried up to MAX_ATTEMPTS with a growing delay
 * Other code can enqueue an email with `create`.
 *
 * Auth: every call needs the shared secret in the `x-notification-secret`
 * header. Deploy with `--no-verify-jwt` (or verify_jwt = false in
 * supabase/config.toml) because callers authenticate with that secret, not a
 * Supabase user token.
 */

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MINUTES = 5; // multiplied by the attempt number
const STALE_LOCK_MINUTES = 10; // a claimed job not reported back is retried

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const NOTIFICATION_SECRET = Deno.env.get("NOTIFICATION_SECRET") ?? "";

// Newer projects expose SUPABASE_SECRET_KEYS (JSON); the classic name is
// SUPABASE_SERVICE_ROLE_KEY. Accept either instead of crashing on boot.
function resolveServiceKey(): string {
  const classic = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (classic) return classic;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.default) return String(parsed.default);
    } catch {
      /* fall through */
    }
  }
  throw new Error("No Supabase service key found (SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEYS).");
}

const supabase = createClient(SUPABASE_URL, resolveServiceKey());

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** Compare secrets without leaking how many leading characters matched. */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clip = (v: unknown, max: number) => String(v ?? "").slice(0, max);

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ success: false, error: "POST required" }, 405);

  const secret = req.headers.get("x-notification-secret");
  if (!NOTIFICATION_SECRET || !secret || !safeEqual(secret, NOTIFICATION_SECRET)) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  try {
    const body = await req.json();
    const action = body?.action;
    const nowIso = new Date().toISOString();

    /* ── GET PENDING: claim due jobs so only this caller sends them ── */
    if (action === "get_pending") {
      const limit = Math.min(Math.max(Number(body.limit || 20), 1), 50);
      const staleBefore = new Date(Date.now() - STALE_LOCK_MINUTES * 60_000).toISOString();
      const dueFilter =
        `and(status.eq.PENDING,scheduled_for.lte.${nowIso}),` +
        `and(status.eq.PROCESSING,locked_at.lt.${staleBefore})`;

      const { data: due, error: dueError } = await supabase
        .from("notification_jobs")
        .select("id")
        .or(dueFilter)
        .order("scheduled_for", { ascending: true })
        .limit(limit);
      if (dueError) throw dueError;
      if (!due?.length) return json({ success: true, jobs: [] });

      // The status condition makes the claim atomic per row: if another poller
      // got there first, that row simply isn't returned to us.
      const { data: claimed, error: claimError } = await supabase
        .from("notification_jobs")
        .update({ status: "PROCESSING", locked_at: nowIso, updated_at: nowIso })
        .in("id", due.map((j) => j.id))
        .or(dueFilter)
        .select("*");
      if (claimError) throw claimError;

      return json({ success: true, jobs: claimed ?? [] });
    }

    /* ── MARK SENT ── */
    if (action === "mark_sent") {
      const jobId = body.job_id;
      if (!jobId) return json({ success: false, error: "job_id required" }, 400);

      const { data: job, error } = await supabase
        .from("notification_jobs")
        .update({ status: "SENT", sent_at: nowIso, locked_at: null, updated_at: nowIso })
        .eq("id", jobId)
        .in("status", ["PENDING", "PROCESSING"])
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!job) return json({ success: false, error: "Job not found or already finished" }, 404);

      await supabase.from("notification_logs").insert({
        notification_job_id: jobId,
        provider: "google_apps_script",
        recipient_email: job.recipient_email,
        subject: job.subject,
        status: "SENT",
        sent_at: nowIso,
      });
      return json({ success: true });
    }

    /* ── MARK FAILED: retry later, give up after MAX_ATTEMPTS ── */
    if (action === "mark_failed") {
      const jobId = body.job_id;
      const errorMessage = clip(body.error || "Unknown email error", 1000);
      if (!jobId) return json({ success: false, error: "job_id required" }, 400);

      const { data: current } = await supabase
        .from("notification_jobs")
        .select("attempts, status")
        .eq("id", jobId)
        .maybeSingle();
      if (!current || current.status === "SENT") {
        return json({ success: false, error: "Job not found or already sent" }, 404);
      }

      const attempts = Number(current.attempts || 0) + 1;
      const giveUp = attempts >= MAX_ATTEMPTS;
      await supabase
        .from("notification_jobs")
        .update({
          status: giveUp ? "FAILED" : "PENDING",
          attempts,
          error_message: errorMessage,
          locked_at: null,
          scheduled_for: giveUp
            ? undefined
            : new Date(Date.now() + attempts * RETRY_DELAY_MINUTES * 60_000).toISOString(),
          updated_at: nowIso,
        })
        .eq("id", jobId);

      await supabase.from("notification_logs").insert({
        notification_job_id: jobId,
        provider: "google_apps_script",
        status: "FAILED",
        error_message: errorMessage,
      });
      return json({ success: true, will_retry: !giveUp });
    }

    /* ── CREATE ── */
    if (action === "create") {
      const n = body.notification;
      const email = String(n?.recipient_email ?? "").trim();
      if (!EMAIL_RE.test(email)) {
        return json({ success: false, error: "A valid recipient_email is required" }, 400);
      }
      if (!n?.subject || !n?.message) {
        return json({ success: false, error: "subject and message are required" }, 400);
      }

      const { data, error } = await supabase
        .from("notification_jobs")
        .insert({
          shop_id: n.shop_id || null,
          notification_type: clip(n.notification_type || "general", 80),
          recipient_email: email,
          recipient_name: n.recipient_name ? clip(n.recipient_name, 200) : null,
          subject: clip(n.subject, 300),
          message: clip(n.message, 20000),
          reference_type: n.reference_type ? clip(n.reference_type, 80) : null,
          reference_id: n.reference_id ? clip(n.reference_id, 80) : null,
          scheduled_for: n.scheduled_for || nowIso,
          status: "PENDING",
        })
        .select()
        .single();
      if (error) throw error;
      return json({ success: true, job: data });
    }

    return json({ success: false, error: "Unknown action" }, 400);
  } catch (error) {
    console.error(error);
    return json({ success: false, error: error instanceof Error ? error.message : "Server error" }, 500);
  }
});
