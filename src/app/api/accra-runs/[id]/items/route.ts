import { money, requireWriter, serializeItem, text } from "@/lib/db/studio-modules";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireWriter();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const description = text(body.description, 200);
  if (!description) return Response.json({ error: "Describe what to buy." }, { status: 400 });
  const { data: trip } = await ctx.db.from("accra_run_trips").select("id").eq("id", id).eq("shop_id", ctx.shopId).maybeSingle();
  if (!trip) return Response.json({ error: "Trip not found." }, { status: 404 });
  const { data, error } = await ctx.db.from("accra_run_items")
    .insert({ shop_id: ctx.shopId, trip_id: id, description, planned_cost: money(body.plannedCost), order_id: typeof body.orderId === "string" ? body.orderId : null })
    .select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(serializeItem(data), { status: 201 });
}
