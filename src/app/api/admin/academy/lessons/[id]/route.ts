import { requireAdmin } from "@/lib/academy/admin";
import { UUID, json } from "@/lib/academy/http";
import { lessonValues } from "@/lib/academy/lesson-input";
import { getPool } from "@/lib/db/pool";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin(); if ("error" in a) return a.error;
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "Not found." }, 404);
  const r = lessonValues(await req.json().catch(() => ({})), true);
  if ("error" in r) return json({ error: r.error }, 400);
  const cols = Object.keys(r.values);
  if (!cols.length) return json({ error: "Nothing to change." }, 400);
  await getPool().query(`update public.academy_lessons set ${cols.map((c, i) => `${c} = $${i + 2}`).join(", ")} where id = $1`, [id, ...Object.values(r.values)]);
  return json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin(); if ("error" in a) return a.error;
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "Not found." }, 404);
  await getPool().query("delete from public.academy_lessons where id = $1", [id]);
  return json({ ok: true });
}
