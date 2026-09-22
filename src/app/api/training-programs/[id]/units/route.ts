import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";

// POST /api/training-programs/[id]/units — add a unit of competency
// (curriculum module) to a program. Trainer/madam only.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (ctx.role !== "trainer" && ctx.role !== "madam") {
      return Response.json(
        { error: "Only a trainer or the studio owner can edit the curriculum." },
        { status: 403 },
      );
    }
    const { id: programId } = await params;
    const program = await db.trainingProgram.findFirst({
      where: { id: programId, shopId: ctx.shopId },
      select: { id: true },
    });
    if (!program) {
      return Response.json({ error: "Program not found" }, { status: 404 });
    }

    const body = await req.json();
    const title = String(body?.title ?? "").trim();
    if (!title) {
      return Response.json({ error: "title is required." }, { status: 400 });
    }

    const lastOrder = await db.competencyUnit.count({ where: { programId } });

    const unit = await db.competencyUnit.create({
      data: {
        shopId: ctx.shopId,
        programId,
        title,
        code: body?.code ? String(body.code) : null,
        learningOutcomes: String(body?.learningOutcomes ?? ""),
        assessmentCriteria: String(body?.assessmentCriteria ?? ""),
        nominalHours:
          body?.nominalHours != null ? Number(body.nominalHours) : null,
        order: lastOrder,
      },
    });
    return Response.json(unit, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
