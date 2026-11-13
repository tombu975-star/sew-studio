import { requireAdmin } from "@/lib/academy/admin";
import { looksLikeType, removeFile, resolveType } from "@/lib/academy/storage";
import { UUID, json } from "@/lib/academy/http";
import { getPool } from "@/lib/db/pool";

// Step 3: once every piece is in, check the file really is what it says, then make it available.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin(); if ("error" in a) return a.error;
  const { id } = await params;
  const { rows } = UUID.test(id) ? await getPool().query("select * from public.academy_media where id = $1", [id]) : { rows: [] as any[] };
  const m = rows[0];
  if (!m) return json({ error: "Not found." }, 404);
  if (Number(m.received_bytes) !== Number(m.size_bytes)) return json({ error: "The upload is not finished yet.", received: Number(m.received_bytes) }, 409);
  const type = resolveType(m.kind, m.filename);
  if (!type || !(await looksLikeType(m.storage_key, type.kind, type.ext).catch(() => false))) {
    await getPool().query("delete from public.academy_media where id = $1", [id]);
    await removeFile(m.storage_key).catch(() => undefined);
    return json({ error: "That file does not look like a valid " + m.kind + " file, so it was not kept." }, 400);
  }
  await getPool().query("update public.academy_media set status = 'ready' where id = $1", [id]);
  return json({ ok: true, id });
}
