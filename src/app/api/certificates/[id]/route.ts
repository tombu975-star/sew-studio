import { getTenant } from "@/lib/db/session";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { data: existing } = await ctx.db
      .from("certificates")
      .select("id")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!existing) return Response.json({ error: "Certificate not found" }, { status: 404 });

    await ctx.db.from("certificates").delete().eq("id", id);
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
