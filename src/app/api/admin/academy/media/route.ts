import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/academy/admin";
import { json, text } from "@/lib/academy/http";
import { MEDIA_LIMITS, resolveType } from "@/lib/academy/storage";
import { getPool } from "@/lib/db/pool";

// Step 1 of an upload: register the file. The browser then sends it in small pieces so a weak connection can resume.
export async function POST(req: Request) {
  const a = await requireAdmin(); if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const filename = text(b.filename, 200).replace(/[\\/]/g, "_");
  const type = resolveType(text(b.kind, 20), filename);
  const size = Math.round(Number(b.size));
  if (!type) return json({ error: "That file type is not supported here. Use MP4 or WebM for video, VTT for captions, JPG, PNG or WebP for pictures." }, 400);
  if (!Number.isFinite(size) || size <= 0) return json({ error: "The file is empty." }, 400);
  if (size > MEDIA_LIMITS[type.kind]) return json({ error: `That file is too large. The limit for this type is ${Math.round(MEDIA_LIMITS[type.kind] / 1024 ** 2)} MB.` }, 413);
  const id = randomUUID();
  await getPool().query(
    `insert into public.academy_media (id, kind, filename, content_type, size_bytes, storage_key, created_by) values ($1, $2, $3, $4, $5, $6, $7)`,
    [id, type.kind, filename, type.contentType, size, `${id}${type.ext}`, a.session.adminId]);
  return json({ id }, 201);
}
