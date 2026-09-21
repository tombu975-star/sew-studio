import { db } from "@/lib/db";

// Add a comment to a post.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
