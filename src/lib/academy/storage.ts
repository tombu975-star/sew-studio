// On-platform file storage for Academy media (videos, captions, covers).
// Files live on the server's disk under MEDIA_DIR. On Railway, attach a Volume
// and set MEDIA_DIR to its mount path (for example /data/media) so uploads
// survive redeploys.
import fs from "node:fs";
import path from "node:path";

export const MEDIA_DIR = path.resolve(/* turbopackIgnore: true */ process.env.MEDIA_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), ".data", "media"));

export const MEDIA_LIMITS = { video: 2 * 1024 ** 3, captions: 1024 ** 2, image: 8 * 1024 ** 2, document: 25 * 1024 ** 2 } as const;
export type MediaKind = keyof typeof MEDIA_LIMITS;
export const CHUNK_MAX = 8 * 1024 ** 2;

const TYPES: Record<MediaKind, Record<string, string>> = {
  video: { ".mp4": "video/mp4", ".m4v": "video/mp4", ".webm": "video/webm" },
  captions: { ".vtt": "text/vtt" },
  image: { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" },
  document: { ".pdf": "application/pdf" },
};

/** The content type is decided here from the file extension, never taken from the browser. */
export function resolveType(kind: string, filename: string): { kind: MediaKind; ext: string; contentType: string } | null {
  if (!(kind in TYPES)) return null;
  const ext = path.extname(filename).toLowerCase();
  const contentType = TYPES[kind as MediaKind][ext];
  return contentType ? { kind: kind as MediaKind, ext, contentType } : null;
}

export function filePath(storageKey: string): string {
  const full = path.resolve(MEDIA_DIR, storageKey);
  if (!full.startsWith(MEDIA_DIR + path.sep)) throw new Error("Invalid storage key");
  return full;
}

export async function ensureDir() { await fs.promises.mkdir(MEDIA_DIR, { recursive: true }); }

/** Writes one chunk at an exact byte offset, so an interrupted upload can resume. */
export async function writeChunk(storageKey: string, offset: number, data: Buffer) {
  await ensureDir();
  const handle = await fs.promises.open(filePath(storageKey), offset === 0 ? "w" : "r+");
  try { await handle.write(data, 0, data.length, offset); } finally { await handle.close(); }
}

/** Checks the first bytes of a finished file against its declared type. */
export async function looksLikeType(storageKey: string, kind: MediaKind, ext: string): Promise<boolean> {
  const handle = await fs.promises.open(filePath(storageKey), "r");
  try {
    const buf = Buffer.alloc(16);
    const { bytesRead } = await handle.read(buf, 0, 16, 0);
    if (bytesRead < 4) return false;
    if (kind === "video") return ext === ".webm" ? buf.readUInt32BE(0) === 0x1a45dfa3 : buf.subarray(4, 8).toString("ascii") === "ftyp";
    if (kind === "captions") return buf.toString("utf8").replace(/^\uFEFF/, "").startsWith("WEBVTT");
    if (kind === "document") return buf.subarray(0, 4).toString("ascii") === "%PDF";
    if (ext === ".png") return buf.subarray(1, 4).toString("ascii") === "PNG";
    if (ext === ".webp") return buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP";
    return buf[0] === 0xff && buf[1] === 0xd8;
  } finally { await handle.close(); }
}

export async function removeFile(storageKey: string) { await fs.promises.rm(filePath(storageKey), { force: true }); }

/** Serves a stored file with HTTP Range support, which video seeking needs. */
export async function serveFile(req: Request, storageKey: string, contentType: string, cache: string): Promise<Response> {
  let size: number;
  try { size = (await fs.promises.stat(filePath(storageKey))).size; } catch { return new Response("Not found", { status: 404 }); }
  const base: Record<string, string> = { "Content-Type": contentType, "Accept-Ranges": "bytes", "Cache-Control": cache, "X-Content-Type-Options": "nosniff" };
  const range = req.headers.get("range");
  let start = 0, end = size - 1, status = 200;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!m || (m[1] === "" && m[2] === "")) return new Response(null, { status: 416, headers: { ...base, "Content-Range": `bytes */${size}` } });
    if (m[1] === "") { start = Math.max(0, size - Number(m[2])); }
    else { start = Number(m[1]); if (m[2] !== "") end = Math.min(end, Number(m[2])); }
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { ...base, "Content-Range": `bytes */${size}` } });
    status = 206;
    base["Content-Range"] = `bytes ${start}-${end}/${size}`;
  }
  base["Content-Length"] = String(end - start + 1);
  const stream = fs.createReadStream(filePath(storageKey), { start, end });
  const web = new ReadableStream({
    start(controller) {
      stream.on("data", (c) => { try { controller.enqueue(new Uint8Array(c as Buffer)); } catch { stream.destroy(); } });
      stream.on("end", () => { try { controller.close(); } catch {} });
      stream.on("error", (e) => { try { controller.error(e); } catch {} });
    },
    cancel() { stream.destroy(); },
  });
  return new Response(web, { status, headers: base });
}
