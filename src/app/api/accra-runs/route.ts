import { getTenant } from "@/lib/db/session";
import { dateOrNull, requireWriter, serializeTrip, text } from "@/lib/db/studio-modules";

export async function GET() {
  const ctx = await getTenant();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await ctx.db.from("accra_run_trips").select("*, items:accra_run_items(*)").eq("shop_id", ctx.shopId).order("trip_date", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json((data ?? []).map(serializeTrip));
}

export async function POST(req: Request) {
  const auth = await requireWriter();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const body = await req.json().catch(() => ({}));
  const { data, error } = await ctx.db.from("accra_run_trips")
    .insert({ shop_id: ctx.shopId, trip_date: dateOrNull(body.tripDate) ?? new Date().toISOString().slice(0, 10), notes: text(body.notes, 1000) || null, shopper_id: ctx.userId })
    .select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(serializeTrip(data), { status: 201 });
}
