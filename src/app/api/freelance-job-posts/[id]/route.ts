import { getTenant, canManageFreelancers } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";
import { dbErrorResponse } from "@/lib/db/errors";

// PATCH /api/freelance-job-posts/[id]
//   { action: "accept", applicationId } — commissions that freelancer: creates the
//        freelance job, adds them to the roster, marks the post Filled and
//        declines the other applicants (one transaction).
//   { action: "decline", applicationId }
//   { action: "close" } — stop taking applications.
async function patch_impl(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenant();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageFreelancers(ctx)) return Response.json({ error: "Not allowed." }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const action = body?.action;
  const applicationId = typeof body?.applicationId === "string" ? body.applicationId : "";
  const pool = getPool();

  const { rows: owned } = await pool.query(
    `select id, status from public.freelance_job_posts where id = $1 and shop_id = $2`,
    [id, ctx.shopId]
  ).catch(() => ({ rows: [] as { id: string; status: string }[] }));
  if (!owned.length) return Response.json({ error: "Post not found." }, { status: 404 });

  if (action === "close") {
    await pool.query(
      `update public.freelance_job_posts set status = 'Closed', updated_at = now() where id = $1 and status = 'Open'`,
      [id]
    );
    return Response.json({ ok: true });
  }

  if (action === "decline") {
    await pool.query(
      `update public.freelance_job_applications set status = 'Declined', updated_at = now()
        where id = $1 and post_id = $2 and status = 'Pending'`,
      [applicationId, id]
    );
    return Response.json({ ok: true });
  }

  if (action === "accept") {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const { rows: post } = await client.query(
        `select task_description, budget, due_date from public.freelance_job_posts
          where id = $1 and shop_id = $2 and status = 'Open' for update`,
        [id, ctx.shopId]
      );
      if (!post.length) {
        await client.query("rollback");
        return Response.json({ error: "This post is no longer open." }, { status: 409 });
      }
      const { rows: app } = await client.query(
        `select freelancer_id, proposed_cost from public.freelance_job_applications
          where id = $1 and post_id = $2 and status = 'Pending' for update`,
        [applicationId, id]
      );
      if (!app.length) {
        await client.query("rollback");
        return Response.json({ error: "Application not found." }, { status: 404 });
      }
      const freelancerId = app[0].freelancer_id;
      const cost = app[0].proposed_cost ?? post[0].budget;

      await client.query(
        `update public.freelance_job_applications set status = 'Accepted', updated_at = now() where id = $1`,
        [applicationId]
      );
      await client.query(
        `update public.freelance_job_applications set status = 'Declined', updated_at = now()
          where post_id = $1 and id <> $2 and status = 'Pending'`,
        [id, applicationId]
      );
      await client.query(
        `update public.freelance_job_posts set status = 'Filled', updated_at = now() where id = $1`,
        [id]
      );
      await client.query(
        `insert into public.freelancer_shop_links (shop_id, freelancer_id) values ($1, $2)
         on conflict (shop_id, freelancer_id) do nothing`,
        [ctx.shopId, freelancerId]
      );
      await client.query(
        `insert into public.freelance_jobs (shop_id, freelancer_id, task_description, cost, due_date, status)
         values ($1, $2, $3, $4, $5, 'Commissioned')`,
        [ctx.shopId, freelancerId, post[0].task_description, cost, post[0].due_date]
      );
      await client.query("commit");
      return Response.json({ ok: true });
    } catch (e) {
      await client.query("rollback").catch(() => {});
      return dbErrorResponse(e, "freelance-job-posts accept");
    } finally {
      client.release();
    }
  }

  return Response.json({ error: "Unknown action." }, { status: 400 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await patch_impl(req, { params });
  } catch (err) {
    return dbErrorResponse(err, "freelance-job-posts/[id] PATCH");
  }
}
