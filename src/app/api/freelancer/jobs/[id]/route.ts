import { NextResponse } from "next/server";
import { getFreelancerSession } from "@/lib/supabase/session";

const VALID_STATUSES = ["Commissioned", "In Progress", "Delivered", "Paid"];

// PATCH /api/freelancer/jobs/:id — a freelancer may only update the
// status of a job that's actually theirs, and only the status field.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getFreelancerSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { data: existing } = await ctx.supabase
    .from("freelance_jobs")
    .select("id")
    .eq("id", id)
    .eq("freelancer_id", ctx.freelancerId)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const body = await req.json();
  if (!VALID_STATUSES.includes(body?.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const { data: updated, error } = await ctx.supabase
    .from("freelance_jobs")
    .update({ status: body.status })
    .eq("id", id)
    .select("id, task_description, cost, due_date, status, created_at, shop:shops(name)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    id: updated.id,
    taskDescription: updated.task_description,
    cost: updated.cost,
    dueDate: updated.due_date,
    status: updated.status,
    createdAt: updated.created_at,
    shop: updated.shop ? { name: updated.shop.name } : null,
  });
}
