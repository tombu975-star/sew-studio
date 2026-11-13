import { json } from "@/lib/academy/http";
import { getPool } from "@/lib/db/pool";
import { getSystemAdminSession } from "@/lib/db/session";

// Host controls: pin a message, mark a question answered, or hide a message.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; mid: string }> }) {
  if (!(await getSystemAdminSession())) return json({ error: "Only the host can do this." }, 403);
  const { id, mid } = await params;
  if (!/^\d{1,12}$/.test(mid)) return json({ error: "Message not found." }, 404);
  const b = await req.json().catch(() => ({}));
  const sets: string[] = []; const vals: unknown[] = [id, mid];
  for (const [key, col] of [["pinned", "pinned"], ["answered", "answered"], ["hidden", "hidden"]] as const) {
    if (typeof b[key] === "boolean") { vals.push(b[key]); sets.push(`${col} = $${vals.length}`); }
  }
  if (!sets.length) return json({ error: "Nothing to change." }, 400);
  await getPool().query(`update public.academy_live_messages set ${sets.join(", ")} where training_id = $1 and id = $2`, vals);
  return json({ ok: true });
}
