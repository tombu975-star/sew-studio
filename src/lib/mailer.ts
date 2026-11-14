import nodemailer from "nodemailer";
import { getSettings } from "@/lib/integration-settings";
import { getAppBaseUrl } from "@/lib/website-content.server";

/**
 * Sends email for password resets and freelancer verification.
 *
 * Settings are read from what a platform admin saved in /admin/integrations,
 * then from the Railway service variables below. Pick ONE provider:
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

const EMAIL_KEYS = [
  "email_from", "resend_api_key", "resend_api_url",
  "smtp_host", "smtp_port", "smtp_secure", "smtp_user", "smtp_pass",
  "apps_script_url", "apps_script_secret",
] as const;
type EmailConfig = Record<(typeof EMAIL_KEYS)[number], string>;

const emailConfig = (): Promise<EmailConfig> => getSettings(EMAIL_KEYS);

/** A simple branded HTML version of the plain-text body. `base` is the public app address (for the logo). */
export function renderHtml(subject: string, body: string, base = ""): string {
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
        return `<p style="margin:22px 0"><a href="${href}" style="background:#541625;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">Open the link</a></p><p style="margin:0;font-size:12px;color:#6F565D;word-break:break-all">${href}</p>`;
      }
      return `<p style="margin:0 0 14px;line-height:1.6">${esc(p).replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f7f3f4;font-family:Arial,Helvetica,sans-serif;color:#3F2027"><div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px"><title>${esc(subject)}</title>${logo}${paragraphs}</div></body></html>`;
}

function fromAddress(c: EmailConfig): string | null {
  return c.email_from || c.smtp_user || null;
}

function pickProvider(c: EmailConfig): MailResult["provider"] {
  if (c.resend_api_key) return "resend";
  if (c.smtp_host && c.smtp_user && c.smtp_pass) return "smtp";
  if (c.apps_script_url) return "apps-script";
  return "none";
}

export async function emailProviderConfigured(): Promise<MailResult["provider"]> {
  return pickProvider(await emailConfig());
}

async function viaResend(m: MailInput, c: EmailConfig, base: string): Promise<MailResult> {
  const from = c.email_from;
  if (!from) return { ok: false, provider: "resend", error: "The sender address (From) is not set" };
  const res = await fetch(c.resend_api_url || "https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${c.resend_api_key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [m.to], subject: m.subject, text: m.body, html: renderHtml(m.subject, m.body, base) }),
    signal: AbortSignal.timeout(15_000),
  });
  if (res.ok) return { ok: true, provider: "resend" };
  const detail = await res.text().catch(() => "");
  return { ok: false, provider: "resend", error: `Resend answered ${res.status}: ${detail.slice(0, 300)}` };
}

async function viaSmtp(m: MailInput, c: EmailConfig, base: string): Promise<MailResult> {
  const from = fromAddress(c);
  if (!from) return { ok: false, provider: "smtp", error: "The sender address (From) is not set" };
  const port = Number(c.smtp_port || 465);
  const secure = c.smtp_secure ? c.smtp_secure === "true" : port === 465;
  const transport = nodemailer.createTransport({
    host: c.smtp_host,
    port,
    secure,
    auth: { user: c.smtp_user, pass: c.smtp_pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  try {
    await transport.sendMail({ from, to: m.to, subject: m.subject, text: m.body, html: renderHtml(m.subject, m.body, base) });
    return { ok: true, provider: "smtp" };
  } finally {
    transport.close();
  }
}

async function viaAppsScript(m: MailInput, c: EmailConfig): Promise<MailResult> {
  const res = await fetch(c.apps_script_url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: c.apps_script_secret,
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
  const config = await emailConfig();
  const provider = pickProvider(config);
  if (provider === "none") {
    console.error(
      "[mailer] No email provider is configured. Add one in the admin portal (Integrations), or set RESEND_API_KEY + EMAIL_FROM, or SMTP_HOST + SMTP_USER + SMTP_PASS (+ EMAIL_FROM)."
    );
    return { ok: false, provider: "none", error: "No email provider is configured" };
  }
  try {
    const base = await getAppBaseUrl();
    const result = await (provider === "resend" ? viaResend(m, config, base) : provider === "smtp" ? viaSmtp(m, config, base) : viaAppsScript(m, config));
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
