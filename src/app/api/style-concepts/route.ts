import { db } from "@/lib/db";
import { getTenant, tenantWhere } from "@/lib/tenant";

export async function GET(req: Request) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const customerId = url.searchParams.get("customerId");
    const where = tenantWhere(ctx.shopId, customerId ? { customerId } : {});
    const concepts = await db.styleConcept.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    });
    return Response.json(concepts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    // Verify the parent customer belongs to the tenant.
    const customer = await db.customer.findFirst({
      where: { id: String(body.customerId), shopId: ctx.shopId },
      select: { id: true },
    });
    if (!customer) {
      return Response.json(
        { error: "Customer not found in this shop" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {
      shopId: ctx.shopId,
      customerId: String(body.customerId),
      garmentType: String(body.garmentDesign ?? body.garmentType ?? "").trim(),
      conceptName: String(body.conceptName ?? "").trim(),
      status: body.status ? String(body.status) : "Suggested",
    };
    if (body.occasion) data.occasion = String(body.occasion);
    if (body.desiredLook) data.desiredLook = String(body.desiredLook);
    if (body.season) data.season = String(body.season);
    if (body.budget != null) data.budget = Number(body.budget) || null;
    if (body.colourPreference) data.colourPreference = String(body.colourPreference);
    if (body.silhouette) data.silhouette = String(body.silhouette);
    if (body.neckline) data.neckline = String(body.neckline);
    if (body.sleeveStyle) data.sleeveStyle = String(body.sleeveStyle);
    if (body.length) data.length = String(body.length);
    if (body.fabric) data.fabric = String(body.fabric);
    if (body.colour) data.colour = String(body.colour);
    if (body.detailing) data.detailing = String(body.detailing);
    if (body.embellishment) data.embellishment = String(body.embellishment);
    if (body.whyThisMayWork) data.whyThisMayWork = String(body.whyThisMayWork);
    if (body.fitConsiderations) data.fitConsiderations = String(body.fitConsiderations);
    if (body.matchPercent != null) data.matchPercent = Number(body.matchPercent) || null;
    if (body.designDirection) data.designDirection = String(body.designDirection);
    if (body.imageUrl) data.imageUrl = String(body.imageUrl);
    if (body.rejectionReason) data.rejectionReason = String(body.rejectionReason);
    if (body.dataConfidence) data.dataConfidence = String(body.dataConfidence);

    const concept = await db.styleConcept.create({
      data: data as Parameters<typeof db.styleConcept.create>[0]["data"],
      include: { customer: true },
    });
    return Response.json(concept, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
