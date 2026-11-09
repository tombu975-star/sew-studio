import { getTenant } from "@/lib/db/session";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { data: post } = await ctx.db
      .from("community_posts")
      .select("id")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!post) return Response.json({ error: "Post not found" }, { status: 404 });

    const { authorId } = await req.json().catch(() => ({}));
    if (!authorId) return Response.json({ error: "authorId is required." }, { status: 400 });

    const { data: existing } = await ctx.db
      .from("community_likes")
      .select("id")
      .eq("post_id", id)
      .eq("author_id", authorId)
      .maybeSingle();

    if (existing) {
      await ctx.db.from("community_likes").delete().eq("id", existing.id);
      return Response.json({ liked: false });
    }
    await ctx.db.from("community_likes").insert({ post_id: id, author_id: authorId });
    return Response.json({ liked: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
