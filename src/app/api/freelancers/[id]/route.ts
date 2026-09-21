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
    const existing = await db.freelancer.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true },
    });
    if (!existing) {
      return Response.json({ error: "Freelancer not found" }, { status: 404 });
    }
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
    const existing = await db.freelancer.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true },
    });
    if (!existing) {
      return Response.json({ error: "Freelancer not found" }, { status: 404 });
    }
    await db.freelancer.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
