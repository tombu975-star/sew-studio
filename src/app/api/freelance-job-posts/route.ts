import { getTenant, canManageFreelancers } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";
import { dbErrorResponse } from "@/lib/db/errors";

// GET /api/freelance-job-posts — this shop's open-job posts with their applicants.
async function get_impl() {
  const ctx = await getTenant();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageFreelancers(ctx)) return Response.json({ error: "Not allowed." }, { status: 403 });

  const pool = getPool();
  const { rows: posts } = await pool.query(
    `select id, task_description, budget, due_date, status, created_at, task_id
       from public.freelance_job_posts where shop_id = $1 order by created_at desc limit 100`,
    [ctx.shopId]
  );
  const { rows: apps } = await pool.query(
    `select a.id, a.post_id, a.message, a.proposed_cost, a.status, a.created_at,
            p.id as freelancer_id, p.full_name, p.specialty, p.skills, p.verified_at
       from public.freelance_job_applications a
       join public.freelance_job_posts jp on jp.id = a.post_id
       join public.freelancer_profiles p on p.id = a.freelancer_id
      where jp.shop_id = $1 and a.status <> 'Withdrawn'
      order by a.created_at`,
    [ctx.shopId]
  );
  return Response.json(
    posts.map((p) => ({
      id: p.id,
      taskDescription: p.task_description,
      budget: p.budget === null ? null : Number(p.budget),
      dueDate: p.due_date,
      status: p.status,
      createdAt: p.created_at,
      fromTask: !!p.task_id,
      applications: apps
        .filter((a) => a.post_id === p.id)
        .map((a) => ({
          id: a.id,
          freelancerId: a.freelancer_id,
          name: a.full_name,
          specialty: a.specialty,
          skills: a.skills,
          verified: !!a.verified_at,
          message: a.message,
          proposedCost: a.proposed_cost === null ? null : Number(a.proposed_cost),
          status: a.status,
          createdAt: a.created_at,
        })),
    }))
  );
}

// POST /api/freelance-job-posts — publish an open job freelancers can apply to.
async function post_impl(req: Request) {
  const ctx = await getTenant();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageFreelancers(ctx)) return Response.json({ error: "Not allowed." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const description = String(body?.taskDescription ?? "").trim();
  if (!description) return Response.json({ error: "Describe the task." }, { status: 400 });
  if (description.length > 2000) return Response.json({ error: "Description is too long." }, { status: 400 });
  const budget = body?.budget === "" || body?.budget == null ? null : Number(body.budget);
  if (budget !== null && (!Number.isFinite(budget) || budget < 0)) {
    return Response.json({ error: "Budget must be a positive number." }, { status: 400 });
  }
  const due = body?.dueDate ? new Date(body.dueDate) : null;
  if (due && Number.isNaN(due.getTime())) return Response.json({ error: "Invalid due date." }, { status: 400 });

  const { rows } = await getPool().query(
    `insert into public.freelance_job_posts (shop_id, task_description, budget, due_date, created_by)
     values ($1, $2, $3, $4, $5) returning id`,
    [ctx.shopId, description, budget, due ? due.toISOString() : null, ctx.userId]
  );
  return Response.json({ id: rows[0].id }, { status: 201 });
}

export async function GET() {
  try {
    return await get_impl();
  } catch (err) {
    return dbErrorResponse(err, "freelance-job-posts GET");
  }
}

export async function POST(req: Request) {
  try {
    return await post_impl(req);
  } catch (err) {
    return dbErrorResponse(err, "freelance-job-posts POST");
  }
}
