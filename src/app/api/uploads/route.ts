import { randomUUID } from "crypto";
import { getTenant } from "@/lib/supabase/session";
import { createAdminSupabaseClient } from "@/lib/supabase/adminClient";

const BUCKET = "uploads";
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const KINDS = new Set(["avatar", "design", "general"]);

// POST /api/uploads?kind=avatar|design — multipart/form-data with a "file"
// field. Any signed-in shop member may upload; the file lands under their
// own shop's folder and the public URL is returned for saving on the record.
export async function POST(req: Request) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const kindParam = new URL(req.url).searchParams.get("kind") || "general";
    const kind = KINDS.has(kindParam) ? kindParam : "general";

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "No picture was received." }, { status: 400 });
    }
    const ext = TYPES[file.type];
    if (!ext) {
      return Response.json(
        { error: "Only JPG, PNG, WebP or GIF pictures can be uploaded." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return Response.json(
        { error: "That picture is over 5 MB. Please choose a smaller one." },
        { status: 413 }
      );
    }

    const admin = createAdminSupabaseClient();
    const path = `${ctx.shopId}/${kind}/${randomUUID()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const put = () =>
      admin.storage.from(BUCKET).upload(path, bytes, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });

    let { error } = await put();
    if (error && /bucket.*not found/i.test(error.message)) {
      // First upload on a project where the storage migration hasn't run yet.
      await admin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: MAX_BYTES,
        allowedMimeTypes: Object.keys(TYPES),
      });
      ({ error } = await put());
    }
    if (error) throw error;

    const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
    return Response.json({ url: data.publicUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
