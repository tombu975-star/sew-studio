import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const program = await db.trainingProgram.findFirst({
      where: { id, shopId: ctx.shopId },
      include: {
        units: { orderBy: { order: "asc" } },
        createdBy: { select: { id: true, fullName: true } },
        trainees: { select: { id: true, fullName: true } },
      },
    });
    if (!program) {
      return Response.json({ error: "Program not found" }, { status: 404 });
    }
    return Response.json(program);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

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
        { error: "Only a trainer or the studio owner can edit a training program." },
        { status: 403 },
      );
    }
    const { id } = await params;
    const existing = await db.trainingProgram.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true },
    });
    if (!existing) {
      return Response.json({ error: "Program not found" }, { status: 404 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.level !== undefined) data.level = String(body.level).trim();
    if (body.durationWeeks !== undefined)
      data.durationWeeks = Number(body.durationWeeks);
    if (body.description !== undefined)
      data.description = body.description ? String(body.description) : null;

    const updated = await db.trainingProgram.update({
      where: { id },
      data,
      include: { units: { orderBy: { order: "asc" } } },
    });
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
        { error: "Only a trainer or the studio owner can delete a training program." },
        { status: 403 },
      );
    }
    const { id } = await params;
    const existing = await db.trainingProgram.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true },
    });
    if (!existing) {
      return Response.json({ error: "Program not found" }, { status: 404 });
    }
    // Enrolled trainees fall back to no program (their tasks/history are
    // untouched — see the SetNull relations in schema.prisma).
    await db.trainingProgram.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
