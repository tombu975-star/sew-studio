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
    // Verify ownership.
    const existing = await db.trainingLog.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true },
    });
    if (!existing) {
      return Response.json({ error: "Training log not found" }, { status: 404 });
    }
    const body = await req.json();
    const { skill, title, note, status, mentorId } = body || {};
    const validStatus = ["Learning", "Practicing", "Proficient"].includes(
      status
    )
      ? status
      : undefined;
    // Verify the mentor (if being set) belongs to the tenant.
    let finalMentorId: string | null | undefined = undefined;
    if (mentorId !== undefined) {
      if (mentorId) {
        const mentor = await db.user.findFirst({
          where: { id: String(mentorId), shopId: ctx.shopId },
          select: { id: true },
        });
        finalMentorId = mentor ? String(mentorId) : null;
      } else {
        finalMentorId = null;
      }
    }
    const updated = await db.trainingLog.update({
      where: { id },
      data: {
        ...(skill !== undefined && { skill }),
        ...(title !== undefined && { title }),
        ...(note !== undefined && { note }),
        ...(validStatus !== undefined && { status: validStatus }),
        ...(finalMentorId !== undefined && { mentorId: finalMentorId }),
      },
      include: {
        trainee: { select: { id: true, fullName: true, role: true } },
        mentor: { select: { id: true, fullName: true } },
      },
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

    const { id } = await params;
    // Verify ownership.
    const existing = await db.trainingLog.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true },
    });
    if (!existing) {
      return Response.json({ error: "Training log not found" }, { status: 404 });
    }
    await db.trainingLog.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
