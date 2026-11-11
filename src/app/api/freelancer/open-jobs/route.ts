import { getFreelancerSession } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";
import { dbErrorResponse } from "@/lib/db/errors";

// GET /api/freelancer/open-jobs — open posts from every active shop, plus this
// freelancer's own application on each. Only the shop's display NAME is exposed
// (no orders, customers or contact details), same as /api/freelancer/jobs.
async function get_impl(req: Request) {
  const ctx = await getFreelancerSession();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // ?scope=applied — every request this freelancer has made, including ones whose
  // job has since been filled or closed, so they can see how each one turned out.
  if (new URL(req.url).searchParams.get("scope") === "applied") {
    const { rows } = await getPool().query(
      `select jp.id, jp.task_description, jp.budget, jp.due_date, jp.created_at, jp.status as post_status, jp.task_id,
              s.name as shop_name, a.status as my_status, a.message as my_message, a.proposed_cost as my_cost
         from public.freelance_job_applications a
         join public.freelance_job_posts jp on jp.id = a.post_id
         join public.shops s on s.id = jp.shop_id
        where a.freelancer_id = $1 and a.status <> 'Withdrawn'
        order by a.updated_at desc
        limit 100`,
      [ctx.freelancerId]
    );
    return Response.json(
      rows.map((r) => ({
        id: r.id,
        taskDescription: r.task_description,
        budget: r.budget === null ? null : Number(r.budget),
        dueDate: r.due_date,
        createdAt: r.created_at,
        postStatus: r.post_status,
        fromTask: !!r.task_id,
        shop: { name: r.shop_name },
        myApplication: { status: r.my_status, message: r.my_message, proposedCost: r.my_cost === null ? null : Number(r.my_cost) },
      }))
    );
  }

  const { rows } = await getPool().query(
    `select jp.id, jp.task_description, jp.budget, jp.due_date, jp.created_at, jp.task_id, s.name as shop_name,
            a.status as my_status, a.message as my_message, a.proposed_cost as my_cost
       from public.freelance_job_posts jp
       join public.shops s on s.id = jp.shop_id and s.suspended_at is null
       left join public.freelance_job_applications a on a.post_id = jp.id and a.freelancer_id = $1
      where jp.status = 'Open'
      order by jp.created_at desc
      limit 100`,
    [ctx.freelancerId]
  );
  return Response.json(
    rows.map((r) => ({
      id: r.id,
      taskDescription: r.task_description,
      budget: r.budget === null ? null : Number(r.budget),
      dueDate: r.due_date,
      createdAt: r.created_at,
      fromTask: !!r.task_id,
      shop: { name: r.shop_name },
      myApplication:
        r.my_status && r.my_status !== "Withdrawn"
          ? { status: r.my_status, message: r.my_message, proposedCost: r.my_cost === null ? null : Number(r.my_cost) }
          : null,
    }))
  );
}

export async function GET(req: Request) {
  try {
    return await get_impl(req);
  } catch (err) {
    return dbErrorResponse(err, "freelancer/open-jobs GET");
  }
}
