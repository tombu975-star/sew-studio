import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const measurements = await db.measurementSet.findMany({
      where: { customerId: id },
      include: { staff: true },
      orderBy: { dateTaken: "desc" },
    });
    return Response.json(measurements);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
