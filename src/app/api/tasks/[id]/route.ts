import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    // Verify ownership.
    const existing = await db.task.findFirst({
      where: { id, shopId: ctx.shopId },
      select: {
        id: true,
        staffId: true,
        staff: { select: { role: true, mentorId: true } },
      },
    });
    if (!existing) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }
    // Staff/trainees may only edit tasks assigned to them. Trainer/madam
    // oversee the whole shop and can edit any task.
    const isPrivileged = ctx.role === "trainer" || ctx.role === "madam";
    if (!isPrivileged && existing.staffId !== ctx.userId) {
      return Response.json(
        { error: "You can only update tasks assigned to you." },
        { status: 403 },
      );
    }
    const data: Record<string, unknown> = {};
    if ("title" in body && body.title) data.title = String(body.title);
    if ("status" in body && body.status) data.status = String(body.status);
    if ("priority" in body && body.priority) data.priority = String(body.priority);
    if ("notes" in body) data.notes = body.notes ? String(body.notes) : null;
    if ("orderId" in body) {
      if (body.orderId) {
        // Verify parent order belongs to tenant.
        const order = await db.order.findFirst({
          where: { id: String(body.orderId), shopId: ctx.shopId },
          select: { id: true },
        });
        data.orderId = order ? String(body.orderId) : null;
      } else {
        data.orderId = null;
      }
    }
    if ("staffId" in body) {
      if (body.staffId) {
        const staff = await db.user.findFirst({
          where: { id: String(body.staffId), shopId: ctx.shopId },
          select: { id: true, role: true, mentorId: true },
        });
        const allowed =
          !!staff &&
          (ctx.role !== "trainer" ||
            (staff.role === "trainee" && staff.mentorId === ctx.userId));
        data.staffId = allowed ? String(body.staffId) : null;
      } else {
        data.staffId = null;
      }
    }
    if ("dueDate" in body) {
      data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }
    // Grading (school-portal style) — only trainers/owners may set these,
    // enforced here (not just hidden in the UI), since this is graded work
    // that determines a trainee's record.
    const isGradingAttempt =
      "maxScore" in body ||
      "score" in body ||
      "feedback" in body ||
      "gradedById" in body;
    if (isGradingAttempt && ctx.role !== "trainer" && ctx.role !== "madam") {
      return Response.json(
        { error: "Only trainers or the studio owner can grade assignments." },
        { status: 403 }
      );
    }
    if (isGradingAttempt && ctx.role === "trainer") {
      const isOwnMentee =
        existing.staff?.role === "trainee" &&
        existing.staff?.mentorId === ctx.userId;
      if (!isOwnMentee) {
        return Response.json(
          { error: "You can only grade trainees you mentor." },
          { status: 403 }
        );
      }
    }
    if ("maxScore" in body)
      data.maxScore = body.maxScore != null ? Number(body.maxScore) : null;
    if ("score" in body)
      data.score = body.score != null ? Number(body.score) : null;
    if ("feedback" in body)
      data.feedback = body.feedback ? String(body.feedback) : null;
    if ("gradedById" in body) {
      // Always grade as the actual caller, never a spoofed id from the client.
      data.gradedById = ctx.userId;
      data.gradedAt = new Date();
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
