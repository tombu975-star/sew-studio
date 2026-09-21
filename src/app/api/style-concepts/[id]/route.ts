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
    const existing = await db.styleConcept.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true },
    });
    if (!existing) {
      return Response.json({ error: "Style concept not found" }, { status: 404 });
    }
    const body = await req.json();
    const data: Record<string, unknown> = {};
    const stringKeys = [
      "garmentType", "conceptName", "status", "occasion", "desiredLook",
      "season", "colourPreference", "silhouette", "neckline", "sleeveStyle",
      "length", "fabric", "colour", "detailing", "embellishment",
      "whyThisMayWork", "fitConsiderations", "designDirection", "imageUrl",
      "rejectionReason", "dataConfidence",
    ] as const;
    for (const k of stringKeys) {
      if (k in body) data[k] = body[k] == null ? null : String(body[k]);
    }
    if ("budget" in body) data.budget = body.budget == null ? null : Number(body.budget) || null;
    if ("matchPercent" in body) data.matchPercent = body.matchPercent == null ? null : Number(body.matchPercent) || null;
    if ("customerId" in body && body.customerId) {
      // Verify the new customer belongs to the tenant.
      const customer = await db.customer.findFirst({
        where: { id: String(body.customerId), shopId: ctx.shopId },
        select: { id: true },
      });
      if (customer) data.customerId = String(body.customerId);
    }

    const concept = await db.styleConcept.update({
      where: { id },
      data: data as Parameters<typeof db.styleConcept.update>[0]["data"],
      include: { customer: true },
    });
    return Response.json(concept);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
