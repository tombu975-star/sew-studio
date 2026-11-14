import { NextResponse } from "next/server";
import { getSystemAdminSession } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";
import { MAX_SITE_IMAGE_BYTES, sniffImageType } from "@/lib/site-images";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const session = await getSystemAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { rows } = await getPool().query(
      `select id, name, size_bytes as "size", created_at as "createdAt" from public.system_site_images order by created_at desc limit 200`
    );
    return NextResponse.json({ images: rows.map((r) => ({ ...r, url: `/api/site-images/${r.id}` })) }, { headers: noStore });
  } catch (error) {
    console.error("[admin/site-images] list failed", error);
    return NextResponse.json({ error: "Could not load the picture library." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSystemAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No picture was received." }, { status: 400 });
  if (file.size > MAX_SITE_IMAGE_BYTES) return NextResponse.json({ error: "That picture is over 5 MB. Choose a smaller one." }, { status: 413 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return NextResponse.json({ error: "Only JPG, PNG, WebP or GIF pictures can be uploaded." }, { status: 400 });
  const name = (file.name || "picture").replace(/[\r\n]/g, " ").slice(0, 120);
  try {
    const { rows } = await getPool().query(
      `insert into public.system_site_images (name, content_type, bytes, size_bytes, created_by)
       values ($1, $2, $3, $4, $5) returning id`,
      [name, type, bytes, bytes.length, session.adminId]
    );
    return NextResponse.json({ id: rows[0].id, name, url: `/api/site-images/${rows[0].id}`, size: bytes.length }, { headers: noStore });
  } catch (error) {
    console.error("[admin/site-images] upload failed", error);
    return NextResponse.json({ error: "Could not save the picture." }, { status: 500 });
  }
}
