import { getTenant } from "@/lib/db/session";
import { dateOrNull, money, text } from "@/lib/db/studio-modules";
import { serializeQuote } from "@/lib/db/quotes";

// Quotes are priced and sent by the studio owner; other roles cannot see them.
export async function GET() {
  const ctx = await getTenant();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "madam") return Response.json({ error: "Only the studio owner can view quotes." }, { status: 403 });
  const { data, error } = await ctx.db.from("quotes").select("*").eq("shop_id", ctx.shopId).order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json((data ?? []).map(serializeQuote));
}

export async function POST(req: Request) {
  const ctx = await getTenant();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "madam") return Response.json({ error: "Only the studio owner can save quotes." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const garment = text(body.garment, 200);
  if (!garment) return Response.json({ error: "Add a garment to the quote." }, { status: 400 });
  const total = money(body.total);
  if (total <= 0) return Response.json({ error: "The quote total must be more than zero." }, { status: 400 });
  let customerId: string | null = null;
  if (body.customerId) {
    const { data: c } = await ctx.db.from("customers").select("id").eq("id", String(body.customerId)).eq("shop_id", ctx.shopId).maybeSingle();
    if (!c) return Response.json({ error: "Customer not found." }, { status: 404 });
    customerId = c.id;
  }
  const inputs = body.inputs && typeof body.inputs === "object" && !Array.isArray(body.inputs) ? body.inputs : {};
  const { data, error } = await ctx.db.from("quotes").insert({
    shop_id: ctx.shopId, customer_id: customerId, customer_name: text(body.customerName, 120) || null,
    garment, inputs, total, deposit: money(body.deposit), valid_until: dateOrNull(body.validUntil), notes: text(body.notes, 1000) || null,
  }).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(serializeQuote(data), { status: 201 });
}
