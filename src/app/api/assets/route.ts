import { getTenant } from "@/lib/db/session";
import { ASSET_CATEGORIES, ASSET_CONDITIONS, ASSET_STATUSES, dateOrNull, money, requireWriter, serializeAsset, text } from "@/lib/db/studio-modules";

export async function GET() {
  const ctx = await getTenant();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await ctx.db.from("assets").select("*").eq("shop_id", ctx.shopId).order("name");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json((data ?? []).map(serializeAsset));
}

export async function POST(req: Request) {
  const auth = await requireWriter();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const b = await req.json().catch(() => ({}));
  const name = text(b.name, 120);
  if (!name) return Response.json({ error: "Name is required." }, { status: 400 });
  const pick = (v: unknown, list: string[], d: string) => (typeof v === "string" && list.includes(v) ? v : d);
  const { data, error } = await ctx.db.from("assets").insert({
    shop_id: ctx.shopId, name, category: pick(b.category, ASSET_CATEGORIES, "Machine"),
    purchase_date: dateOrNull(b.purchaseDate), purchase_cost: b.purchaseCost === "" || b.purchaseCost == null ? null : money(b.purchaseCost),
    condition: pick(b.condition, ASSET_CONDITIONS, "Good"), status: pick(b.status, ASSET_STATUSES, "In Use"),
    location: text(b.location, 120) || null, last_service_date: dateOrNull(b.lastServiceDate), next_service_due: dateOrNull(b.nextServiceDue),
  }).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(serializeAsset(data), { status: 201 });
}
