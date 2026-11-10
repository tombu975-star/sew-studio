import { getFreelancerSession } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";

// GET /api/freelancer/open-jobs — open posts from every active shop, plus this
// freelancer's own application on each. Only the shop's display NAME is exposed
// (no orders, customers or contact details), same as /api/freelancer/jobs.
export async function GET() {
  const ctx = await getFreelancerSession();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await getPool().query(
    `select jp.id, jp.task_description, jp.budget, jp.due_date, jp.created_at, s.name as shop_name,
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
      shop: { name: r.shop_name },
      myApplication:
        r.my_status && r.my_status !== "Withdrawn"
          ? { status: r.my_status, message: r.my_message, proposedCost: r.my_cost === null ? null : Number(r.my_cost) }
          : null,
    }))
  );
}
