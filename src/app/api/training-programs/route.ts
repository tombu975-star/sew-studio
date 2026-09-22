import { db } from "@/lib/db";
import { getTenant, tenantWhere } from "@/lib/tenant";

// GET /api/training-programs — list this shop's curriculum.
// Everyone in the shop can view (a trainee needs to see the curriculum
// they're enrolled in), but only trainer/madam can create or edit one.
export async function GET(req: Request) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const programs = await db.trainingProgram.findMany({
      where: tenantWhere(ctx.shopId),
      include: {
        units: { orderBy: { order: "asc" } },
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { trainees: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return Response.json(programs);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// POST /api/training-programs — create a program (trainer/madam only),
// optionally with an initial list of competency units.
export async function POST(req: Request) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (ctx.role !== "trainer" && ctx.role !== "madam") {
      return Response.json(
        { error: "Only a trainer or the studio owner can create a training program." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const level = String(body?.level ?? "").trim();
    const durationWeeks = Number(body?.durationWeeks);
    if (!name || !level || !durationWeeks || durationWeeks <= 0) {
      return Response.json(
        { error: "name, level and a positive durationWeeks are required." },
        { status: 400 },
      );
    }

    const units = Array.isArray(body?.units) ? body.units : [];

    const program = await db.trainingProgram.create({
      data: {
        shopId: ctx.shopId,
        name,
        level,
        durationWeeks,
        description: body?.description ? String(body.description) : null,
        createdById: ctx.userId,
        units: {
          create: units.map(
            (
              u: {
                title?: string;
                code?: string;
                learningOutcomes?: string;
                assessmentCriteria?: string;
                nominalHours?: number;
              },
              i: number,
            ) => ({
              shopId: ctx.shopId,
              title: String(u.title ?? "").trim(),
              code: u.code ? String(u.code) : null,
              learningOutcomes: String(u.learningOutcomes ?? ""),
              assessmentCriteria: String(u.assessmentCriteria ?? ""),
              nominalHours: u.nominalHours != null ? Number(u.nominalHours) : null,
              order: i,
            }),
          ),
        },
      },
      include: { units: { orderBy: { order: "asc" } } },
    });

    return Response.json(program, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
