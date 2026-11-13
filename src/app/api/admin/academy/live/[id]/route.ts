import { audit, requireAdmin } from "@/lib/academy/admin";
import { UUID, json } from "@/lib/academy/http";
import { getPool } from "@/lib/db/pool";

// Choose how a public session is delivered, and attach its video and captions.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin(); if ("error" in a) return a.error;
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "Not found." }, 404);
  const b = await req.json().catch(() => ({}));
  const sets: string[] = []; const vals: unknown[] = [id];
  const put = (col: string, v: unknown) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
  if (b.delivery === "onsite" || b.delivery === "external") put("delivery", b.delivery);
  for (const [key, col] of [["mediaId", "media_id"], ["captionsMediaId", "captions_media_id"]] as const) {
    if (key in b) { if (b[key] !== null && !(typeof b[key] === "string" && UUID.test(b[key]))) return json({ error: "Invalid file." }, 400); put(col, b[key]); }
  }
  if (!sets.length) return json({ error: "Nothing to change." }, 400);
  await getPool().query(`update public.system_public_trainings set ${sets.join(", ")} where id = $1`, vals);
  await audit(a.session.adminId, "academy.live.updated", { id, fields: Object.keys(b) });
  return json({ ok: true });
}
