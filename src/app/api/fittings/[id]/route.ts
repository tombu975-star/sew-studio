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
    const body = await req.json();
    // Verify ownership via the parent order.
    const existing = await db.fitting.findFirst({
      where: { id, order: { shopId: ctx.shopId } },
      select: { id: true },
    });
    if (!existing) {
      return Response.json({ error: "Fitting not found" }, { status: 404 });
    }
    const data: Record<string, unknown> = {};
    if ("date" in body && body.date) data.date = new Date(body.date);
    if ("status" in body && body.status) data.status = String(body.status);
    if ("notes" in body) data.notes = body.notes ? String(body.notes) : null;
    const fitting = await db.fitting.update({
      where: { id },
      data: data as Parameters<typeof db.fitting.update>[0]["data"],
    });
    return Response.json(fitting);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
