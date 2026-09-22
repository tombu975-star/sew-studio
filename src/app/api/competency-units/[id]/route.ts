import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";

export async function PATCH(
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
    const { id } = await params;
    const existing = await db.competencyUnit.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true },
    });
    if (!existing) {
      return Response.json({ error: "Unit not found" }, { status: 404 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.code !== undefined) data.code = body.code ? String(body.code) : null;
    if (body.learningOutcomes !== undefined)
      data.learningOutcomes = String(body.learningOutcomes);
    if (body.assessmentCriteria !== undefined)
      data.assessmentCriteria = String(body.assessmentCriteria);
    if (body.nominalHours !== undefined)
      data.nominalHours = body.nominalHours != null ? Number(body.nominalHours) : null;
    if (body.order !== undefined) data.order = Number(body.order);

    const updated = await db.competencyUnit.update({ where: { id }, data });
    return Response.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
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
    const { id } = await params;
    const existing = await db.competencyUnit.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true },
    });
    if (!existing) {
      return Response.json({ error: "Unit not found" }, { status: 404 });
    }
    // Tasks that referenced this unit just lose the reference (SetNull),
    // their history/grades are untouched.
    await db.competencyUnit.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
