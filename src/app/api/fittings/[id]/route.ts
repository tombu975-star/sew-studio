import { getTenant } from "@/lib/supabase/session";
import { serializeFitting } from "@/lib/supabase/serializers";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant();
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Verify ownership via the parent order.
    const { data: existing } = await ctx.supabase
      .from("fittings")
      .select("id, order:orders!inner(shop_id)")
      .eq("id", id)
      .eq("order.shop_id", ctx.shopId)
      .maybeSingle();
    if (!existing) {
      return Response.json({ error: "Fitting not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if ("date" in body && body.date) data.date = new Date(body.date).toISOString();
    if ("status" in body && body.status) data.status = String(body.status);
    if ("notes" in body) data.notes = body.notes ? String(body.notes) : null;

    const { data: fitting, error } = await ctx.supabase
      .from("fittings")
      .update(data)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;

    return Response.json(serializeFitting(fitting));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/fittings/[id] → { ok: true }  (owner only)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant();
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (ctx.role !== "madam") {
      return Response.json(
        { error: "Only the studio owner can delete a fitting." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { data: existing } = await ctx.supabase
      .from("fittings")
      .select("id, order:orders!inner(shop_id)")
      .eq("id", id)
      .eq("order.shop_id", ctx.shopId)
      .maybeSingle();
    if (!existing) {
      return Response.json({ error: "Fitting not found" }, { status: 404 });
    }

    const { error } = await ctx.supabase.from("fittings").delete().eq("id", id);
    if (error) throw error;

    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
