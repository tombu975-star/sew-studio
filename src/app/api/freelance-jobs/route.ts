import { db } from "@/lib/db";
import { getTenant, tenantWhere, canManageFreelancers } from "@/lib/tenant";

// GET /api/freelance-jobs — this shop's freelance jobs (its own
// bookkeeping view — includes orderId, unlike the freelancer-facing API).
export async function GET(req: Request) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobs = await db.freelanceJob.findMany({
      where: tenantWhere(ctx.shopId),
      orderBy: { createdAt: "desc" },
      include: { freelancer: { select: { id: true, fullName: true } } },
    });
    return Response.json(jobs);
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
    const ctx = await getTenant(req);
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
    const { freelancerId, taskDescription, cost, dueDate, orderId, status } =
      body || {};
    if (!freelancerId || !taskDescription) {
      return Response.json(
        { error: "A freelancer and task description are required." },
        { status: 400 }
      );
    }

    // Must be a freelancer this shop has actually linked.
    const link = await db.freelancerShopLink.findUnique({
      where: {
        shopId_freelancerId: { shopId: ctx.shopId, freelancerId: String(freelancerId) },
      },
    });
    if (!link) {
      return Response.json(
        { error: "That freelancer isn't linked to your shop yet." },
        { status: 400 }
      );
    }

    // orderId, if given, must belong to this shop too.
    let finalOrderId: string | null = null;
    if (orderId) {
      const order = await db.order.findFirst({
        where: { id: String(orderId), shopId: ctx.shopId },
        select: { id: true },
      });
      if (order) finalOrderId = order.id;
    }

    const job = await db.freelanceJob.create({
      data: {
        shopId: ctx.shopId,
        freelancerId: String(freelancerId),
        taskDescription: String(taskDescription).trim(),
        cost: cost != null ? Number(cost) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        orderId: finalOrderId,
        status: status || "Commissioned",
      },
      include: { freelancer: { select: { id: true, fullName: true } } },
    });
    return Response.json(job);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
