import { getTenant, canManageFreelancers } from "@/lib/supabase/session";
import { serializeFreelanceJob } from "@/lib/supabase/serializers";

// GET /api/freelance-jobs — this shop's freelance jobs (its own
// bookkeeping view — includes orderId, unlike the freelancer-facing API).
export async function GET() {
  try {
    const ctx = await getTenant();
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: jobs, error } = await ctx.supabase
      .from("freelance_jobs")
      .select("*, freelancer:freelancer_profiles(id, full_name)")
      .eq("shop_id", ctx.shopId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return Response.json(jobs.map(serializeFreelanceJob));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// POST /api/freelance-jobs — commission a job from a freelancer this
// shop has already linked (can't assign work to a freelancer you
// haven't commissioned).
export async function POST(req: Request) {
  try {
    const ctx = await getTenant();
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canManageFreelancers(ctx)) {
      return Response.json(
        {
          error:
            "Only the studio owner, or someone granted freelancer access, can assign freelance jobs.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { freelancerId, taskDescription, cost, dueDate, orderId, status } = body || {};
    if (!freelancerId || !taskDescription) {
      return Response.json(
        { error: "A freelancer and task description are required." },
        { status: 400 }
      );
    }

    // Must be a freelancer this shop has actually linked.
    const { data: link } = await ctx.supabase
      .from("freelancer_shop_links")
      .select("id")
      .eq("shop_id", ctx.shopId)
      .eq("freelancer_id", String(freelancerId))
      .maybeSingle();
    if (!link) {
      return Response.json(
        { error: "That freelancer isn't linked to your shop yet." },
        { status: 400 }
      );
    }

    // orderId, if given, must belong to this shop too.
    let finalOrderId: string | null = null;
    if (orderId) {
      const { data: order } = await ctx.supabase
        .from("orders")
        .select("id")
        .eq("id", String(orderId))
        .eq("shop_id", ctx.shopId)
        .maybeSingle();
      if (order) finalOrderId = order.id;
    }

    const { data: job, error } = await ctx.supabase
      .from("freelance_jobs")
      .insert({
        shop_id: ctx.shopId,
        freelancer_id: String(freelancerId),
        task_description: String(taskDescription).trim(),
        cost: cost != null ? Number(cost) : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        order_id: finalOrderId,
        status: status || "Commissioned",
      })
      .select("*, freelancer:freelancer_profiles(id, full_name)")
      .single();
    if (error) throw error;

    return Response.json(serializeFreelanceJob(job));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
