import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";

// Toggle like on a post for the given author (idempotent).
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

    const { authorId } = await req.json().catch(() => ({}));
    if (!authorId) {
      return Response.json({ error: "authorId is required." }, { status: 400 });
    }
    const existing = await db.communityLike.findUnique({
      where: { postId_authorId: { postId: id, authorId } },
    });
    if (existing) {
      await db.communityLike.delete({ where: { id: existing.id } });
      return Response.json({ liked: false });
    }
    await db.communityLike.create({ data: { postId: id, authorId } });
    return Response.json({ liked: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
