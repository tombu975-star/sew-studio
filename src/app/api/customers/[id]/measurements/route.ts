import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify the customer belongs to the tenant before returning measurements.
    const customer = await db.customer.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true },
    });
    if (!customer) {
      return Response.json({ error: "Customer not found" }, { status: 404 });
    }

    const measurements = await db.measurementSet.findMany({
      where: { customerId: id, shopId: ctx.shopId },
      include: { staff: true },
      orderBy: { dateTaken: "desc" },
    });
    return Response.json(measurements);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
