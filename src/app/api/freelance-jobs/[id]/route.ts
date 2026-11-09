import { getTenant, canManageFreelancers } from "@/lib/db/session";
import type { Database } from "@/lib/db/database.types";
import { serializeFreelanceJob } from "@/lib/db/serializers";

const PERMISSION_ERROR = {
  error: "Only the studio owner, or someone granted freelancer access, can manage this.",
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant();
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canManageFreelancers(ctx)) {
      return Response.json(PERMISSION_ERROR, { status: 403 });
    }

    const { id } = await params;
    const { data: existing } = await ctx.db
      .from("freelance_jobs")
      .select("id")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!existing) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    const body = await req.json();
    const { taskDescription, cost, dueDate, status } = body || {};
    const data: Database["public"]["Tables"]["freelance_jobs"]["Update"] = {};
    if (taskDescription !== undefined) data.task_description = taskDescription;
    if (cost !== undefined) data.cost = cost != null ? Number(cost) : null;
    if (dueDate !== undefined) data.due_date = dueDate ? new Date(dueDate).toISOString() : null;
    if (status !== undefined) data.status = status;

    const { data: updated, error } = await ctx.db
      .from("freelance_jobs")
      .update(data)
      .eq("id", id)
      .select("*, freelancer:freelancer_profiles(id, full_name)")
      .single();
    if (error) throw error;

    return Response.json(serializeFreelanceJob(updated));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant();
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canManageFreelancers(ctx)) {
      return Response.json(PERMISSION_ERROR, { status: 403 });
    }

    const { id } = await params;
    const { data: existing } = await ctx.db
      .from("freelance_jobs")
      .select("id")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!existing) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }
    await ctx.db.from("freelance_jobs").delete().eq("id", id);
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
