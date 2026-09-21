import { db } from "@/lib/db";
import { getTenant, tenantWhere } from "@/lib/tenant";

// GET /api/training-logs?traineeId=ID  — logs for a trainee (or all if no filter)
export async function GET(req: Request) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const traineeId = url.searchParams.get("traineeId");
    const where = tenantWhere(ctx.shopId, traineeId ? { traineeId } : {});
    const logs = await db.trainingLog.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        trainee: { select: { id: true, fullName: true, role: true } },
        mentor: { select: { id: true, fullName: true } },
      },
    });
    return Response.json(logs);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// POST — create a training log entry
export async function POST(req: Request) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { traineeId, mentorId, skill, title, note, status, date } =
      body || {};
    if (!traineeId || !title) {
      return Response.json(
        { error: "Trainee and title are required." },
        { status: 400 }
      );
    }
    // Verify the trainee belongs to the tenant.
    const trainee = await db.user.findFirst({
      where: { id: String(traineeId), shopId: ctx.shopId },
      select: { id: true },
    });
    if (!trainee) {
      return Response.json({ error: "Trainee not found" }, { status: 404 });
    }
    // Verify the mentor (if provided) belongs to the tenant.
    let finalMentorId: string | null = null;
    if (mentorId) {
      const mentor = await db.user.findFirst({
        where: { id: String(mentorId), shopId: ctx.shopId },
        select: { id: true },
      });
      finalMentorId = mentor ? String(mentorId) : null;
    }

    const validStatus = ["Learning", "Practicing", "Proficient"].includes(
      status
    )
      ? status
      : "Learning";
    const log = await db.trainingLog.create({
      data: {
        shopId: ctx.shopId,
        traineeId,
        mentorId: finalMentorId,
        skill: skill || null,
        title: String(title),
        note: note || null,
        status: validStatus,
        date: date ? new Date(date) : new Date(),
      },
      include: {
        trainee: { select: { id: true, fullName: true, role: true } },
        mentor: { select: { id: true, fullName: true } },
      },
    });
    return Response.json(log);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
