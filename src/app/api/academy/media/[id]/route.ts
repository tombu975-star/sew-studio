import { mediaAccess } from "@/lib/academy/access";
import { UUID } from "@/lib/academy/http";
import { serveFile } from "@/lib/academy/storage";
import { getPool } from "@/lib/db/pool";

export const dynamic = "force-dynamic";
const notFound = () => new Response("Not found", { status: 404 });

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return notFound();
  const { rows } = await getPool().query("select id, kind, content_type, storage_key, status from public.academy_media where id = $1 and status = 'ready'", [id]);
  if (!rows[0]) return notFound();
  const access = await mediaAccess(rows[0]);
  if (!access.allowed) return notFound(); // do not reveal whether the file exists
  return serveFile(req, rows[0].storage_key, rows[0].content_type, access.cache);
}
