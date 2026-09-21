import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }
    const data: Record<string, unknown> = {};
    if ("title" in body && body.title) data.title = String(body.title);
    if ("status" in body && body.status) data.status = String(body.status);
    if ("priority" in body && body.priority) data.priority = String(body.priority);
    if ("notes" in body) data.notes = body.notes ? String(body.notes) : null;
    if ("orderId" in body) data.orderId = body.orderId ? String(body.orderId) : null;
    if ("staffId" in body) data.staffId = body.staffId ? String(body.staffId) : null;
    if ("dueDate" in body) {
      data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }
    // Grading (school-portal style)
    if ("maxScore" in body)
      data.maxScore = body.maxScore != null ? Number(body.maxScore) : null;
    if ("score" in body)
      data.score = body.score != null ? Number(body.score) : null;
    if ("feedback" in body)
      data.feedback = body.feedback ? String(body.feedback) : null;
    if ("gradedById" in body) {
      data.gradedById = body.gradedById ? String(body.gradedById) : null;
      data.gradedAt = body.gradedById ? new Date() : null;
    }
    const task = await db.task.update({
      where: { id },
      data: data as Parameters<typeof db.task.update>[0]["data"],
      include: {
        order: { include: { customer: true } },
        staff: true,
        gradedBy: { select: { id: true, fullName: true } },
      },
    });
    return Response.json(task);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
