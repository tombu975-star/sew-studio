// Railway's health check. Deliberately depends on nothing external (no
// Supabase call) so a database hiccup can't make Railway think the app is down
// and restart it — it only answers "is the server up and serving?".
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true, service: "madam-studio", time: new Date().toISOString() });
}
