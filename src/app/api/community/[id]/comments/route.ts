import { getTenant } from "@/lib/db/session";
import { serializeCommunityComment } from "@/lib/db/serializers";

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

    const { authorId, authorName, body } = await req.json().catch(() => ({}));
    if (!authorName || !body) {
      return Response.json({ error: "Author and comment are required." }, { status: 400 });
    }

    const { data: comment, error } = await ctx.db
      .from("community_comments")
      .insert({ post_id: id, author_id: authorId || null, author_name: authorName, body: String(body) })
      .select("*")
      .single();
    if (error) throw error;

    return Response.json(serializeCommunityComment(comment));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
