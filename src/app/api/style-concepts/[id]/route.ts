import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const existing = await db.styleConcept.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Style concept not found" }, { status: 404 });
    }
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
    if ("customerId" in body && body.customerId) data.customerId = String(body.customerId);

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
