import { NextResponse } from "next/server";
import { getSystemAdminSession } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSystemAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    // Refuse while a page still uses it, so a delete can never leave a broken picture on the site.
    const used = await getPool().query("select 1 from public.system_website_content where content::text like $1", [`%${id}%`]);
    if (used.rowCount) return NextResponse.json({ error: "This picture is still used on the website. Choose a different picture there, save, then delete it." }, { status: 409 });
    await getPool().query("delete from public.system_site_images where id = $1", [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/site-images] delete failed", error);
    return NextResponse.json({ error: "Could not delete the picture." }, { status: 500 });
  }
}
