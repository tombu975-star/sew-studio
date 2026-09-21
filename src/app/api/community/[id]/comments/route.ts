import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";

// Add a comment to a post.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    // Verify the parent post belongs to the tenant.
    const post = await db.communityPost.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true },
    });
    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    const { authorId, authorName, body } = await req.json().catch(() => ({}));
    if (!authorName || !body) {
      return Response.json(
        { error: "Author and comment are required." },
        { status: 400 }
      );
    }
    const comment = await db.communityComment.create({
      data: {
        postId: id,
        authorId: authorId || null,
        authorName,
        body: String(body),
      },
    });
    return Response.json(comment);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
