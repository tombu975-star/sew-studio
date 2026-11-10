import { getTenant } from "@/lib/db/session";
import { ensurePortalToken } from "@/lib/notify";
import { generatePortalToken } from "@/lib/security";

// POST /api/customers/[id]/portal-token — generate (or return existing) portal token
// so the owner can share a tracking link with the customer.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { data: customer } = await ctx.db
      .from("customers")
      .select("id, name")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!customer) return Response.json({ error: "Customer not found" }, { status: 404 });

    const token = await ensurePortalToken(ctx.db, id);
    return Response.json({ token, url: `/portal?token=${token}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/customers/[id]/portal-token — revoke the current link. The old
// URL stops working immediately; the next POST issues a fresh token.
// PUT    /api/customers/[id]/portal-token — rotate: revoke and issue a new token.
async function revoke(id: string, rotate: boolean) {
  const ctx = await getTenant();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "madam" && ctx.role !== "staff") {
    return Response.json({ error: "Not allowed." }, { status: 403 });
  }
  const { data: customer } = await ctx.db
    .from("customers")
    .select("id")
    .eq("id", id)
    .eq("shop_id", ctx.shopId)
    .maybeSingle();
  if (!customer) return Response.json({ error: "Customer not found" }, { status: 404 });
  const token = rotate ? generatePortalToken() : null;
  const { error } = await ctx.db.from("customers").update({ portal_token: token }).eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(rotate ? { token, url: `/portal?token=${token}` } : { ok: true });
}

export async function PUT(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return revoke((await params).id, true);
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return revoke((await params).id, false);
}
