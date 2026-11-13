import { requireAdmin } from "@/lib/academy/admin";
import { CHUNK_MAX, removeFile, writeChunk } from "@/lib/academy/storage";
import { UUID, json } from "@/lib/academy/http";
import { getPool } from "@/lib/db/pool";

export const dynamic = "force-dynamic";
const row = async (id: string) => (await getPool().query("select id, size_bytes, received_bytes, storage_key, status from public.academy_media where id = $1", [id])).rows[0];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin(); if ("error" in a) return a.error;
  const { id } = await params;
  const m = UUID.test(id) ? await row(id) : null;
  return m ? json({ received: Number(m.received_bytes), size: Number(m.size_bytes), status: m.status }) : json({ error: "Not found." }, 404);
}

// Step 2: send one piece at its exact offset. Answers with how many bytes are safely stored.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin(); if ("error" in a) return a.error;
  const { id } = await params;
  const m = UUID.test(id) ? await row(id) : null;
  if (!m || m.status !== "uploading") return json({ error: "Not found." }, 404);
  const offset = Number(new URL(req.url).searchParams.get("offset"));
  const received = Number(m.received_bytes), size = Number(m.size_bytes);
  if (!Number.isInteger(offset) || offset < 0) return json({ error: "Bad offset." }, 400);
  const data = Buffer.from(await req.arrayBuffer());
  if (data.length === 0 || data.length > CHUNK_MAX) return json({ error: "Bad piece size." }, 400);
  if (offset + data.length <= received) return json({ received }); // a retry of a piece we already have
  if (offset !== received) return json({ error: "Out of order.", received }, 409);
  if (offset + data.length > size) return json({ error: "More data than the file size you gave." }, 400);
  await writeChunk(m.storage_key, offset, data);
  await getPool().query("update public.academy_media set received_bytes = $2 where id = $1", [id, offset + data.length]);
  return json({ received: offset + data.length });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin(); if ("error" in a) return a.error;
  const { id } = await params;
  const m = UUID.test(id) ? await row(id) : null;
  if (!m) return json({ error: "Not found." }, 404);
  await getPool().query("delete from public.academy_media where id = $1", [id]);
  await removeFile(m.storage_key).catch(() => undefined);
  return json({ ok: true });
}
