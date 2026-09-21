import { db } from "@/lib/db";

// Toggle like on a post for the given author (idempotent).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
