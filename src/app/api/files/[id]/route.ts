import { getPool } from "@/lib/db/pool";
import { getTenant } from "@/lib/db/session";

// GET /api/files/<id> — serves an uploaded picture.
// Access rules (the UUID alone is NOT a credential):
//   1. a signed-in, active member of the shop that owns the upload; or
//   2. a customer-portal visitor presenting ?t=<portal token>, but only for
//      pictures attached to that customer's own orders.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const notFound = () => new Response("Not found", { status: 404 });

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return notFound();
  const pool = getPool();
  const { rows } = await pool.query(
    `select shop_id, content_type, bytes from public.uploads where id = $1`,
    [id]
  );
  const row = rows[0];
  if (!row) return notFound();

  let allowed = false;
  const ctx = await getTenant();
  if (ctx && ctx.shopId === row.shop_id) allowed = true;

  if (!allowed) {
    const token = new URL(req.url).searchParams.get("t");
    if (token && token.length >= 20 && token.length <= 128) {
      const { rows: hit } = await pool.query(
        `select 1
           from public.customers c
           join public.orders o on o.customer_id = c.id
          where c.portal_token = $1 and c.shop_id = $2
            and o.design_image like $3
          limit 1`,
        [token, row.shop_id, `/api/files/${id}%`]
      );
      allowed = hit.length > 0;
    }
  }
  if (!allowed) return notFound(); // don't reveal whether the file exists

  return new Response(new Uint8Array(row.bytes), {
    headers: {
      "Content-Type": row.content_type,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
