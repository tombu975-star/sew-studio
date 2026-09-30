import { getTenant } from "@/lib/supabase/session";
import { serializeCommunityPost, serializeCommunityComment } from "@/lib/supabase/serializers";

// Aliased embeds are required here — PostgREST resolves an embed by the
// actual related table name (or an explicit `alias:table` pair), and
// "comments"/"likes" aren't real table names (they're community_comments /
// community_likes). Without the alias this 500s with "could not find a
// relationship" on every load of the Community feed.
const POST_SELECT = "*, comments:community_comments(*), likes:community_likes(count)";

export async function GET() {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { data: posts, error } = await ctx.supabase
      .from("community_posts")
      .select(POST_SELECT)
      .eq("shop_id", ctx.shopId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;

    return Response.json(
      posts.map((p) => {
        const serialized = serializeCommunityPost(p);
        serialized.comments = [...(p.comments ?? [])]
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map(serializeCommunityComment);
        return serialized;
      })
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { authorId, authorName, authorRole, type, title, body: text, imageUrl } = body || {};
    if (!authorName || !text) {
      return Response.json({ error: "Author and content are required." }, { status: 400 });
    }
    const validTypes = ["update", "question", "inspiration", "announcement", "showcase"];
    const finalType = validTypes.includes(type) ? type : "update";

    const { data: post, error } = await ctx.supabase
      .from("community_posts")
      .insert({
        shop_id: ctx.shopId,
        author_id: authorId || null,
        author_name: authorName,
        author_role: authorRole || null,
        type: finalType,
        title: title || null,
        body: String(text),
        image_url: imageUrl || null,
      })
      .select(POST_SELECT)
      .single();
    if (error) throw error;

    return Response.json(serializeCommunityPost(post));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
