import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";

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
    const existing = await db.certificate.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true },
    });
    if (!existing) {
      return Response.json({ error: "Certificate not found" }, { status: 404 });
    }
    await db.certificate.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
