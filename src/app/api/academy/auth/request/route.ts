import { isEmail, requestSignIn, safeNext } from "@/lib/academy/auth";
import { clientIp, json, text } from "@/lib/academy/http";
import { tooManyRequests } from "@/lib/public-trainings";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (text(b.website, 50)) return json({ ok: true }); // honeypot
  const email = text(b.email, 254).toLowerCase();
  if (!isEmail(email)) return json({ error: "Please enter a valid email address." }, 400);
  if (tooManyRequests(`ac-ip:${clientIp(req)}`, 12) || tooManyRequests(`ac-em:${email}`, 5)) {
    return json({ error: "Too many attempts. Please wait a little and try again." }, 429);
  }
  try { await requestSignIn(email, text(b.name, 120), safeNext(b.next)); }
  catch (e) { console.error("[academy] sign-in request failed", e); return json({ error: "We could not send your code. Please try again." }, 500); }
  // Same answer whether or not the address is new, so it cannot be used to find who has an account.
  return json({ ok: true });
}
