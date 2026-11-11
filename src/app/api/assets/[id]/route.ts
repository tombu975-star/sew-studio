import { ASSET_CONDITIONS, ASSET_STATUSES, dateOrNull, money, requireWriter, serializeAsset, text } from "@/lib/db/studio-modules";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireWriter();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if ("name" in b) { const n = text(b.name, 120); if (!n) return Response.json({ error: "Name is required." }, { status: 400 }); patch.name = n; }
  if ("condition" in b && ASSET_CONDITIONS.includes(b.condition)) patch.condition = b.condition;
  if ("status" in b && ASSET_STATUSES.includes(b.status)) patch.status = b.status;
  if ("location" in b) patch.location = text(b.location, 120) || null;
  if ("lastServiceDate" in b) patch.last_service_date = dateOrNull(b.lastServiceDate);
  if ("nextServiceDue" in b) patch.next_service_due = dateOrNull(b.nextServiceDue);
  if ("purchaseCost" in b) patch.purchase_cost = b.purchaseCost === "" || b.purchaseCost == null ? null : money(b.purchaseCost);
  const { data, error } = await ctx.db.from("assets").update(patch).eq("id", id).eq("shop_id", ctx.shopId).select("*").maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Item not found." }, { status: 404 });
  return Response.json(serializeAsset(data));
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireWriter();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const { id } = await params;
  const { error } = await ctx.db.from("assets").delete().eq("id", id).eq("shop_id", ctx.shopId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
