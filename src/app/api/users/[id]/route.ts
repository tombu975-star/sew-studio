import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";

// PATCH — update a user (used by trainer/owner to set mentor + training duration on trainees)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (ctx.role !== "madam" && ctx.role !== "trainer") {
      return Response.json(
        { error: "Only the studio owner or a trainer can edit member profiles." },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verify the user belongs to this tenant.
    const existing = await db.user.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true, role: true, mentorId: true },
    });
    if (!existing) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    if (
      ctx.role === "trainer" &&
      !(existing.role === "trainee" && existing.mentorId === ctx.userId)
    ) {
      return Response.json(
        { error: "You can only edit trainees you mentor." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      mentorId,
      trainingDurationWeeks,
      trainingStartedAt,
      programId,
      fullName,
      phone,
      gender,
      canAccessOrders,
      canAccessBoard,
      canManageFreelancers,
    } = body || {};

    const data: Record<string, unknown> = {};
    if (mentorId !== undefined) {
      if (mentorId) {
        // Verify mentor belongs to the same tenant.
        const mentor = await db.user.findFirst({
          where: { id: String(mentorId), shopId: ctx.shopId },
          select: { id: true },
        });
        data.mentorId = mentor ? String(mentorId) : null;
      } else {
        data.mentorId = null;
      }
    }
    if (trainingDurationWeeks !== undefined)
      data.trainingDurationWeeks = trainingDurationWeeks
        ? Number(trainingDurationWeeks)
        : null;
    if (trainingStartedAt !== undefined)
      data.trainingStartedAt = trainingStartedAt
        ? new Date(trainingStartedAt)
        : null;
    if (programId !== undefined) {
      if (programId) {
        // Verify the program belongs to the same tenant.
        const program = await db.trainingProgram.findFirst({
          where: { id: String(programId), shopId: ctx.shopId },
          select: { id: true },
        });
        data.programId = program ? String(programId) : null;
      } else {
        data.programId = null;
      }
    }
    if (fullName !== undefined) data.fullName = fullName;
    if (phone !== undefined) data.phone = phone || null;
    if (gender !== undefined) data.gender = gender || null;
    // Trainee access permissions (trainer/owner grants these)
    if (canAccessOrders !== undefined)
      data.canAccessOrders = Boolean(canAccessOrders);
    if (canAccessBoard !== undefined)
      data.canAccessBoard = Boolean(canAccessBoard);
    // Freelancer management is a financial/business-relationship
    // permission — only the owner grants it, even for fields a trainer
    // is otherwise allowed to edit on their own mentee.
    if (canManageFreelancers !== undefined && ctx.role !== "madam") {
      return Response.json(
        { error: "Only the studio owner can grant freelancer access." },
        { status: 403 }
      );
    }
    if (canManageFreelancers !== undefined)
      data.canManageFreelancers = Boolean(canManageFreelancers);

    const updated = await db.user.update({ where: { id }, data });
    return Response.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
