import { api } from "@/lib/api";

const CHUNK = 4 * 1024 * 1024;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sends a file to this platform in 4 MB pieces. A dropped connection retries and carries on from where it stopped. */
export async function uploadFile(file: File, kind: "video" | "captions" | "image", onProgress: (fraction: number) => void): Promise<string> {
  const { id } = await api<{ id: string }>("/api/admin/academy/media", { method: "POST", body: JSON.stringify({ filename: file.name, kind, size: file.size }) });
  let offset = 0, failures = 0;
  while (offset < file.size) {
    const end = Math.min(file.size, offset + CHUNK);
    try {
      const res = await fetch(`/api/admin/academy/media/${id}?offset=${offset}`, { method: "PUT", body: file.slice(offset, end), credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { offset = end; failures = 0; onProgress(offset / file.size); continue; }
      if (res.status === 409 && typeof data.received === "number") { offset = data.received; continue; }
      throw new Error(data.error || `Upload failed (${res.status}).`);
    } catch (e) {
      if (++failures > 6) throw e instanceof Error ? e : new Error("Upload failed.");
      await wait(1000 * failures);
    }
  }
  await api(`/api/admin/academy/media/${id}/complete`, { method: "POST" });
  return id;
}

/** Reads a video's length in seconds from the file on the admin's own computer. */
export function videoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video"), url = URL.createObjectURL(file);
    v.preload = "metadata";
    v.onloadedmetadata = () => { resolve(Math.round(v.duration) || 0); URL.revokeObjectURL(url); };
    v.onerror = () => { resolve(0); URL.revokeObjectURL(url); };
    v.src = url;
  });
}
