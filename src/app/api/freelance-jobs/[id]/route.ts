import { db } from "@/lib/db";
import { getTenant, canManageFreelancers } from "@/lib/tenant";

const PERMISSION_ERROR = {
  error:
    "Only the studio owner, or someone granted freelancer access, can manage this.",
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canManageFreelancers(ctx)) {
      return Response.json(PERMISSION_ERROR, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.freelanceJob.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true },
    });
    if (!existing) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    const body = await req.json();
    const { taskDescription, cost, dueDate, status } = body || {};
    const updated = await db.freelanceJob.update({
      where: { id },
      data: {
        ...(taskDescription !== undefined && { taskDescription }),
        ...(cost !== undefined && { cost: cost != null ? Number(cost) : null }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null,
        }),
        ...(status !== undefined && { status }),
      },
      include: { freelancer: { select: { id: true, fullName: true } } },
    });
    return Response.json(updated);
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
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canManageFreelancers(ctx)) {
      return Response.json(PERMISSION_ERROR, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.freelanceJob.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true },
    });
    if (!existing) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }
    await db.freelanceJob.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
