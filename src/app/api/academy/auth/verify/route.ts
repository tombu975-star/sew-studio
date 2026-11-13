import { isEmail, startSession, verifyCode } from "@/lib/academy/auth";
import { clientIp, json, text } from "@/lib/academy/http";
import { tooManyRequests } from "@/lib/public-trainings";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const email = text(b.email, 254).toLowerCase();
  const code = text(b.code, 12).replace(/\s/g, "");
  if (!isEmail(email) || !/^\d{6}$/.test(code)) return json({ error: "Enter the 6-digit code from your email." }, 400);
  if (tooManyRequests(`ac-vf:${clientIp(req)}`, 30)) return json({ error: "Too many attempts. Please wait a little and try again." }, 429);
  const learnerId = await verifyCode(email, code);
  if (!learnerId) return json({ error: "That code is not right or has expired. Ask for a new one." }, 401);
  await startSession(learnerId);
  return json({ ok: true });
}
