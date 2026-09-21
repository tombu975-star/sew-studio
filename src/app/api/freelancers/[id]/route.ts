import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, specialty, skills, phone, email, rate, status, notes } =
      body || {};
    const updated = await db.freelancer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(specialty !== undefined && { specialty }),
        ...(skills !== undefined && { skills }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(rate !== undefined && { rate: rate ? Number(rate) : null }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
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
    await db.freelancer.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
