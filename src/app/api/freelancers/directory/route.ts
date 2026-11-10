import { getTenant, canManageFreelancers } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";
import { dbErrorResponse } from "@/lib/db/errors";

// GET /api/freelancers/directory — every registered freelancer, with ONLY
// public-profile fields (name, specialty, skills). Email/phone stay hidden
// until the shop links the freelancer. Owner or freelancer-access members only.
async function get_impl(req: Request) {
  const ctx = await getTenant();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageFreelancers(ctx)) return Response.json({ error: "Not allowed." }, { status: 403 });

  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 80);
  const { rows } = await getPool().query(
    `select p.id, p.full_name, p.specialty, p.skills, (l.id is not null) as linked
       from public.freelancer_profiles p
       left join public.freelancer_shop_links l on l.freelancer_id = p.id and l.shop_id = $1
      where p.verified_at is not null and ($2::text = '' or p.full_name ilike '%' || $2::text || '%' or p.specialty ilike '%' || $2::text || '%' or p.skills ilike '%' || $2::text || '%')
      order by p.full_name
      limit 200`,
    [ctx.shopId, q]
  );
  return Response.json(
    rows.map((r) => ({ id: r.id, name: r.full_name, specialty: r.specialty, skills: r.skills, linked: r.linked, verified: true }))
  );
}

// POST /api/freelancers/directory { freelancerId } — add a registered freelancer to this shop's roster.
async function post_impl(req: Request) {
  const ctx = await getTenant();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageFreelancers(ctx)) return Response.json({ error: "Not allowed." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const freelancerId = typeof body?.freelancerId === "string" ? body.freelancerId : "";
  const { rowCount } = await getPool().query(
    `insert into public.freelancer_shop_links (shop_id, freelancer_id)
     select $1, id from public.freelancer_profiles where id = $2 and verified_at is not null
     on conflict (shop_id, freelancer_id) do nothing`,
    [ctx.shopId, freelancerId]
  ).catch(() => ({ rowCount: 0 }));
  const { rows } = await getPool().query(
    `select 1 from public.freelancer_shop_links where shop_id = $1 and freelancer_id = $2`,
    [ctx.shopId, freelancerId]
  ).catch(() => ({ rows: [] as unknown[] }));
  if (!rows.length) return Response.json({ error: "Freelancer not found or not yet verified." }, { status: 404 });
  return Response.json({ ok: true, added: (rowCount ?? 0) > 0 });
}

export async function GET(req: Request) {
  try {
    return await get_impl(req);
  } catch (err) {
    return dbErrorResponse(err, "freelancers/directory GET");
  }
}

export async function POST(req: Request) {
  try {
    return await post_impl(req);
  } catch (err) {
    return dbErrorResponse(err, "freelancers/directory POST");
  }
}
