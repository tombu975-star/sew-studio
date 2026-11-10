import { getFreelancerSession } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";

// POST   /api/freelancer/open-jobs/[id]/apply { message?, proposedCost? } — apply (or update a pending application)
// DELETE /api/freelancer/open-jobs/[id]/apply — withdraw a pending application
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getFreelancerSession();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const message = String(body?.message ?? "").trim().slice(0, 1000) || null;
  const cost = body?.proposedCost === "" || body?.proposedCost == null ? null : Number(body.proposedCost);
  if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
    return Response.json({ error: "Your price must be a positive number." }, { status: 400 });
  }

  const pool = getPool();
  const { rows: open } = await pool
    .query(
      `select 1 from public.freelance_job_posts jp join public.shops s on s.id = jp.shop_id
        where jp.id = $1 and jp.status = 'Open' and s.suspended_at is null`,
      [id]
    )
    .catch(() => ({ rows: [] as unknown[] }));
  if (!open.length) return Response.json({ error: "This job is no longer open." }, { status: 404 });

  const { rowCount } = await pool.query(
    `insert into public.freelance_job_applications (post_id, freelancer_id, message, proposed_cost)
     values ($1, $2, $3, $4)
     on conflict (post_id, freelancer_id) do update
       set message = excluded.message, proposed_cost = excluded.proposed_cost,
           status = 'Pending', updated_at = now()
       where public.freelance_job_applications.status in ('Pending', 'Withdrawn')`,
    [id, ctx.freelancerId, message, cost]
  );
  if (!rowCount) return Response.json({ error: "This application has already been decided." }, { status: 409 });
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getFreelancerSession();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await getPool().query(
    `update public.freelance_job_applications set status = 'Withdrawn', updated_at = now()
      where post_id = $1 and freelancer_id = $2 and status = 'Pending'`,
    [id, ctx.freelancerId]
  );
  return Response.json({ ok: true });
}
