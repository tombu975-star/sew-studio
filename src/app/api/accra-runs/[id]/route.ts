import { dateOrNull, requireWriter, serializeTrip, text } from "@/lib/db/studio-modules";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireWriter();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if ("status" in body) {
    if (body.status !== "Planned" && body.status !== "Logged") return Response.json({ error: "Invalid status." }, { status: 400 });
    patch.status = body.status;
  }
  if ("notes" in body) patch.notes = text(body.notes, 1000) || null;
  if ("tripDate" in body) { const d = dateOrNull(body.tripDate); if (!d) return Response.json({ error: "Invalid date." }, { status: 400 }); patch.trip_date = d; }
  const { data, error } = await ctx.db.from("accra_run_trips").update(patch).eq("id", id).eq("shop_id", ctx.shopId).select("*").maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Trip not found." }, { status: 404 });
  return Response.json(serializeTrip(data));
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireWriter();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const { id } = await params;
  const { error } = await ctx.db.from("accra_run_trips").delete().eq("id", id).eq("shop_id", ctx.shopId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
