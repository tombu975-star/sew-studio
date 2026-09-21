import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { skill, title, note, status, mentorId } = body || {};
    const validStatus = ["Learning", "Practicing", "Proficient"].includes(
      status
    )
      ? status
      : undefined;
    const updated = await db.trainingLog.update({
      where: { id },
      data: {
        ...(skill !== undefined && { skill }),
        ...(title !== undefined && { title }),
        ...(note !== undefined && { note }),
        ...(validStatus !== undefined && { status: validStatus }),
        ...(mentorId !== undefined && { mentorId: mentorId || null }),
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
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.trainingLog.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
