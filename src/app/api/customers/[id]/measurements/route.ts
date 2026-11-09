import { getTenant } from "@/lib/db/session";
import { serializeMeasurementSet, serializeUser } from "@/lib/db/serializers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const { data: customer } = await ctx.db
      .from("customers")
      .select("id")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!customer) return Response.json({ error: "Customer not found" }, { status: 404 });

    const { data: measurements, error } = await ctx.db
      .from("measurement_sets")
      .select("*, staff:profiles(*)")
      .eq("customer_id", id)
      .eq("shop_id", ctx.shopId)
      .order("date_taken", { ascending: false });
    if (error) throw error;

    return Response.json(
      measurements.map((m) => ({
        ...serializeMeasurementSet(m),
        staff: m.staff ? serializeUser(m.staff) : null,
      }))
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
