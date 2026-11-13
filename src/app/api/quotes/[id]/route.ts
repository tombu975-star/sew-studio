import { getTenant } from "@/lib/db/session";
import { dateOrNull, text } from "@/lib/db/studio-modules";
import { serializeQuote } from "@/lib/db/quotes";

type Ctx = { params: Promise<{ id: string }> };
const STATUSES = ["Draft", "Sent", "Accepted", "Declined"];

async function owner() {
  const ctx = await getTenant();
  if (!ctx) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  if (ctx.role !== "madam") return { error: Response.json({ error: "Only the studio owner can change quotes." }, { status: 403 }) };
  return { ctx };
}

export async function PATCH(req: Request, { params }: Ctx) {
  const a = await owner();
  if ("error" in a) return a.error;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if ("status" in body) {
    if (!STATUSES.includes(body.status)) return Response.json({ error: "Invalid status." }, { status: 400 });
    patch.status = body.status;
  }
  if ("validUntil" in body) patch.valid_until = dateOrNull(body.validUntil);
  if ("notes" in body) patch.notes = text(body.notes, 1000) || null;
  if (!Object.keys(patch).length) return Response.json({ error: "Nothing to update." }, { status: 400 });
  const { data, error } = await a.ctx.db.from("quotes").update(patch).eq("id", id).eq("shop_id", a.ctx.shopId).select("*").maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Quote not found." }, { status: 404 });
  return Response.json(serializeQuote(data));
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const a = await owner();
  if ("error" in a) return a.error;
  const { id } = await params;
  const { error } = await a.ctx.db.from("quotes").delete().eq("id", id).eq("shop_id", a.ctx.shopId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
