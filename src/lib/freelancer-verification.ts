import { createHash } from "crypto";
import { getPool } from "@/lib/db/pool";
import { sendEmail } from "@/lib/mailer";
import { generateUrlToken } from "@/lib/security";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const TTL_HOURS = 24;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Creates a one-time verification link and emails it. Older unused links are
 * invalidated. Returns whether the email channel confirmed delivery; when no
 * email channel is configured (local dev) the link is printed to the server log.
 */
export async function sendFreelancerVerification(opts: {
  freelancerId: string;
  email: string;
  name: string;
  appUrl: string;
}): Promise<{ sent: boolean; tooSoon?: boolean }> {
  const pool = getPool();
  const { rows: recent } = await pool.query(
    `select 1 from private.freelancer_verifications
      where freelancer_id = $1 and created_at > now() - ($2 || ' seconds')::interval limit 1`,
    [opts.freelancerId, String(RESEND_COOLDOWN_SECONDS)]
  );
  if (recent.length) return { sent: false, tooSoon: true };

  await pool.query(
    `update private.freelancer_verifications set used_at = now() where freelancer_id = $1 and used_at is null`,
    [opts.freelancerId]
  );
  const token = generateUrlToken();
  await pool.query(
    `insert into private.freelancer_verifications (token_hash, freelancer_id, expires_at)
     values ($1, $2, now() + ($3 || ' hours')::interval)`,
    [sha256(token), opts.freelancerId, String(TTL_HOURS)]
  );

  const link = `${opts.appUrl.replace(/\/$/, "")}/freelancer/verify?token=${token}`;
  const sent = await sendEmail({
    to: opts.email,
    subject: "Verify your Sewsiness freelancer account",
    body: `Hi ${opts.name.split(" ")[0] || "there"},\n\nConfirm your email to get your Verified badge and start applying for jobs:\n\n${link}\n\nThis link works once and expires in ${TTL_HOURS} hours. If you didn't create this account, you can ignore this message.`,
    type: "freelancer_verification",
  });
  if (!sent) {
    console.warn("[freelancer-verification] No email channel configured or delivery failed.");
    if (process.env.NODE_ENV !== "production") console.warn(`[freelancer-verification] DEV link for ${opts.email}: ${link}`);
  }
  return { sent };
}

/** Redeems a link. Returns the freelancer id, or null if invalid/expired/used. */
export async function redeemFreelancerVerification(token: string): Promise<string | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    `update private.freelancer_verifications set used_at = now()
      where token_hash = $1 and used_at is null and expires_at > now()
      returning freelancer_id`,
    [sha256(token)]
  );
  if (!rows[0]) return null;
  await pool.query(
    `update public.freelancer_profiles set verified_at = coalesce(verified_at, now()) where id = $1`,
    [rows[0].freelancer_id]
  );
  return rows[0].freelancer_id;
}
