import nodemailer from "nodemailer";

/**
 * Sends email for password resets and freelancer verification.
 *
 * Pick ONE provider by setting its variables on the Railway service:
 *
 *   1. Resend (HTTPS API)   RESEND_API_KEY, EMAIL_FROM
 *   2. SMTP (Gmail, Zoho,   SMTP_HOST, SMTP_USER, SMTP_PASS, and optionally
 *      Brevo, any host)     SMTP_PORT (465 by default), EMAIL_FROM
 *   3. Google Apps Script   GOOGLE_APPS_SCRIPT_URL, GOOGLE_APPS_SCRIPT_SECRET
 *      (the older path, still honoured as a last resort)
 *
 * If more than one is set, they are tried in the order above.
 */

export interface MailInput {
  to: string;
  subject: string;
  /** Plain-text body. Links in it become clickable in the HTML version. */
  body: string;
  type: string;
}

export interface MailResult {
  ok: boolean;
  provider: "resend" | "smtp" | "apps-script" | "none";
  error?: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
}

/** A simple branded HTML version of the plain-text body. */
export function renderHtml(subject: string, body: string): string {
  const base = appUrl();
  const logo = base
    ? `<img src="${esc(base)}/brand/sewsiness-wordmark.png" alt="Sewsiness" width="150" style="display:block;margin:0 0 20px;height:auto" />`
    : `<p style="margin:0 0 20px;font-size:20px;font-weight:700;color:#541625">Sewsiness</p>`;
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const m = p.match(/^(https?:\/\/\S+)$/);
      if (m) {
        const href = esc(m[1]);
        return `<p style="margin:22px 0"><a href="${href}" style="background:#541625;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">Open the link</a></p><p style="margin:0;font-size:12px;color:#8B7076;word-break:break-all">${href}</p>`;
      }
      return `<p style="margin:0 0 14px;line-height:1.6">${esc(p).replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f7f3f4;font-family:Arial,Helvetica,sans-serif;color:#3F2027"><div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px"><title>${esc(subject)}</title>${logo}${paragraphs}</div></body></html>`;
}

function fromAddress(): string | null {
  return process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER?.trim() || null;
}

export function emailProviderConfigured(): MailResult["provider"] {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return "smtp";
  if (process.env.GOOGLE_APPS_SCRIPT_URL) return "apps-script";
  return "none";
}

async function viaResend(m: MailInput): Promise<MailResult> {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) return { ok: false, provider: "resend", error: "EMAIL_FROM is not set" };
  const res = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [m.to], subject: m.subject, text: m.body, html: renderHtml(m.subject, m.body) }),
    signal: AbortSignal.timeout(15_000),
  });
  if (res.ok) return { ok: true, provider: "resend" };
  const detail = await res.text().catch(() => "");
  return { ok: false, provider: "resend", error: `Resend answered ${res.status}: ${detail.slice(0, 300)}` };
}

async function viaSmtp(m: MailInput): Promise<MailResult> {
  const from = fromAddress();
  if (!from) return { ok: false, provider: "smtp", error: "EMAIL_FROM is not set" };
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  try {
    await transport.sendMail({ from, to: m.to, subject: m.subject, text: m.body, html: renderHtml(m.subject, m.body) });
    return { ok: true, provider: "smtp" };
  } finally {
    transport.close();
  }
}

async function viaAppsScript(m: MailInput): Promise<MailResult> {
  const res = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: process.env.GOOGLE_APPS_SCRIPT_SECRET || "",
      shopId: "",
      channel: "email",
      recipient: m.to,
      title: m.subject,
      body: m.body,
      type: m.type,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return { ok: false, provider: "apps-script", error: `Script answered ${res.status}` };
  const json = await res.json().catch(() => null);
  return json?.ok === true
    ? { ok: true, provider: "apps-script" }
    : { ok: false, provider: "apps-script", error: "Script did not confirm delivery" };
}

/** Sends one email and says what happened. Never throws and never logs the message body or any key. */
export async function sendEmailDetailed(m: MailInput): Promise<MailResult> {
  const provider = emailProviderConfigured();
  if (provider === "none") {
    console.error(
      "[mailer] No email provider is configured. Set RESEND_API_KEY + EMAIL_FROM, or SMTP_HOST + SMTP_USER + SMTP_PASS (+ EMAIL_FROM)."
    );
    return { ok: false, provider: "none", error: "No email provider is configured" };
  }
  try {
    const result = await (provider === "resend" ? viaResend(m) : provider === "smtp" ? viaSmtp(m) : viaAppsScript(m));
    if (!result.ok) console.error(`[mailer] ${result.provider} could not send a "${m.type}" email: ${result.error}`);
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[mailer] ${provider} could not send a "${m.type}" email: ${error}`);
    return { ok: false, provider, error };
  }
}

/** Same as sendEmailDetailed, for callers that only need yes/no. */
export async function sendEmail(m: MailInput): Promise<boolean> {
  return (await sendEmailDetailed(m)).ok;
}
