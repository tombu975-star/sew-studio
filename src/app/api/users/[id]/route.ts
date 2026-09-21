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

    const { id } = await params;

    // Verify the user belongs to this tenant.
    const existing = await db.user.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true },
    });
    if (!existing) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      mentorId,
      trainingDurationWeeks,
      trainingStartedAt,
      fullName,
      phone,
      gender,
      canAccessOrders,
      canAccessBoard,
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
    if (fullName !== undefined) data.fullName = fullName;
    if (phone !== undefined) data.phone = phone || null;
    if (gender !== undefined) data.gender = gender || null;
    // Trainee access permissions (trainer/owner grants these)
    if (canAccessOrders !== undefined)
      data.canAccessOrders = Boolean(canAccessOrders);
    if (canAccessBoard !== undefined)
      data.canAccessBoard = Boolean(canAccessBoard);

    const updated = await db.user.update({ where: { id }, data });
    return Response.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
