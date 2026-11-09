/**
 * Sends a plain email through the same Google Apps Script web app the app
 * already uses for customer notifications (GOOGLE_APPS_SCRIPT_URL). Returns
 * true if the script confirmed delivery, false if it failed, and false with
 * a warning if no script is configured.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  body: string;
  type: string;
}): Promise<boolean> {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!url) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.GOOGLE_APPS_SCRIPT_SECRET || "",
        shopId: "",
        channel: "email",
        recipient: opts.to,
        title: opts.subject,
        body: opts.body,
        type: opts.type,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    if (!res.ok) return false;
    const json = await res.json().catch(() => null);
    return json?.ok === true;
  } catch (err) {
    console.error("[mailer] send failed", err);
    return false;
  }
}
