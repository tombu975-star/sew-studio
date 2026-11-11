import { money, requireWriter, serializeItem, text } from "@/lib/db/studio-modules";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireWriter();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const { id, itemId } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if ("description" in body) { const d = text(body.description, 200); if (!d) return Response.json({ error: "Description is required." }, { status: 400 }); patch.description = d; }
  if ("obtained" in body) patch.obtained = !!body.obtained;
  if ("plannedCost" in body) patch.planned_cost = money(body.plannedCost);
  if ("actualCost" in body) patch.actual_cost = money(body.actualCost);
  const { data, error } = await ctx.db.from("accra_run_items").update(patch).eq("id", itemId).eq("trip_id", id).eq("shop_id", ctx.shopId).select("*").maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Item not found." }, { status: 404 });
  return Response.json(serializeItem(data));
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireWriter();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const { id, itemId } = await params;
  const { error } = await ctx.db.from("accra_run_items").delete().eq("id", itemId).eq("trip_id", id).eq("shop_id", ctx.shopId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
