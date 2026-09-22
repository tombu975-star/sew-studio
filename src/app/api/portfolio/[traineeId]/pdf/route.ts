import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { buildPortfolioPdf } from "@/lib/portfolio-pdf";

// GET /api/portfolio/[traineeId]/pdf
// A trainee may only download their own portfolio. Trainer/madam may
// download any trainee's in their shop. Everyone else is denied — this
// compiles completed work, scores, feedback and skills history, which is
// the same sensitive-data class as tasks/training-logs/certificates.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ traineeId: string }> },
) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { traineeId } = await params;

    const isPrivileged = ctx.role === "madam" || ctx.role === "trainer";
    if (!isPrivileged && ctx.userId !== traineeId) {
      return Response.json(
        { error: "You can only download your own portfolio." },
        { status: 403 },
      );
    }

    const shop = await db.shop.findUnique({
      where: { id: ctx.shopId },
      select: { name: true },
    });

    const trainee = await db.user.findFirst({
      where: { id: traineeId, shopId: ctx.shopId },
      include: {
        mentor: { select: { fullName: true } },
        program: { select: { name: true, level: true } },
      },
    });
    if (!trainee) {
      return Response.json({ error: "Trainee not found" }, { status: 404 });
    }

    const [completedTasks, skillLogs, certificate] = await Promise.all([
      db.task.findMany({
        where: { shopId: ctx.shopId, staffId: traineeId, status: "Done" },
        include: { competencyUnit: { select: { title: true } } },
        orderBy: { updatedAt: "desc" },
      }),
      db.trainingLog.findMany({
        where: { shopId: ctx.shopId, traineeId },
        orderBy: { date: "desc" },
      }),
      db.certificate.findFirst({
        where: { shopId: ctx.shopId, traineeId },
        include: { issuedBy: { select: { fullName: true } } },
        orderBy: { issuedAt: "desc" },
      }),
    ]);

    const pdfBytes = await buildPortfolioPdf({
      shopName: shop?.name ?? "Studio",
      traineeName: trainee.fullName,
      traineeEmail: trainee.email,
      mentorName: trainee.mentor?.fullName ?? null,
      programName: trainee.program?.name ?? null,
      programLevel: trainee.program?.level ?? null,
      trainingDurationWeeks: trainee.trainingDurationWeeks,
      trainingStartedAt: trainee.trainingStartedAt,
      completedTasks: completedTasks.map((t) => ({
        title: t.title,
        competencyUnitTitle: t.competencyUnit?.title ?? null,
        score: t.score,
        maxScore: t.maxScore,
        feedback: t.feedback,
        updatedAt: t.updatedAt,
      })),
      skillLogs: skillLogs.map((l) => ({
        skill: l.skill?.trim() || l.title,
        status: l.status,
        date: l.date,
        note: l.note,
      })),
      certificate: certificate
        ? {
            certificateNo: certificate.certificateNo,
            programName: certificate.programName,
            durationWeeks: certificate.durationWeeks,
            skillsAchieved: certificate.skillsAchieved,
            honors: certificate.honors,
            issuedAt: certificate.issuedAt,
            issuedByName: certificate.issuedBy?.fullName ?? null,
          }
        : null,
    });

    const fileName = `${trainee.fullName.replace(/[^a-z0-9]+/gi, "-")}-portfolio.pdf`;

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
