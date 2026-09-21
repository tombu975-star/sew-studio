import { db } from "@/lib/db";

// GET /api/training-logs?traineeId=ID  — logs for a trainee (or all if no filter)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const traineeId = url.searchParams.get("traineeId");
    const where = traineeId ? { traineeId } : undefined;
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
    const body = await req.json();
    const { traineeId, mentorId, skill, title, note, status, date } =
      body || {};
    if (!traineeId || !title) {
      return Response.json(
        { error: "Trainee and title are required." },
        { status: 400 }
      );
    }
    const validStatus = ["Learning", "Practicing", "Proficient"].includes(
      status
    )
      ? status
      : "Learning";
    const log = await db.trainingLog.create({
      data: {
        traineeId,
        mentorId: mentorId || null,
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
