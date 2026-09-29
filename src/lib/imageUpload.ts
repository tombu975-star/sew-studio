// Client-side picture upload: downscale + re-encode large photos in the
// browser (keeps phone photos well under server/hosting body-size limits),
// then POST to /api/uploads and get back a public URL to save on the record.

const MAX_EDGE = 1600;

async function shrink(file: File): Promise<File | Blob> {
  // Animated GIFs and already-small files are sent as-is.
  if (file.type === "image/gif" || file.size < 300 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export async function uploadImage(
  file: File,
  kind: "avatar" | "design" | "general" = "general"
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose a picture file.");
  const body = await shrink(file);
  const form = new FormData();
  form.append("file", body, body instanceof File ? body.name : "photo.jpg");
  const res = await fetch(`/api/uploads?kind=${kind}`, {
    method: "POST",
    body: form,
    credentials: "same-origin",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) throw new Error(json.error || "Upload failed. Please try again.");
  return json.url as string;
}
