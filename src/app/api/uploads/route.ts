import { getTenant } from "@/lib/db/session";
import { createAdminClient } from "@/lib/db/adminClient";

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

    const admin = createAdminClient();
    const bytes = Buffer.from(await file.arrayBuffer());
    const { data, error } = await admin
      .from("uploads")
      .insert({ shop_id: ctx.shopId, kind, content_type: file.type, bytes })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("Upload failed");
    return Response.json({ url: `/api/files/${data.id}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
