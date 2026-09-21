import { db } from "@/lib/db";

export async function GET() {
  try {
    const posts = await db.communityPost.findMany({
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      include: {
        comments: { orderBy: { createdAt: "asc" } },
        _count: { select: { likes: true } },
      },
    });
    return Response.json(posts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { authorId, authorName, authorRole, type, title, body: text, imageUrl } =
      body || {};
    if (!authorName || !text) {
      return Response.json(
        { error: "Author and content are required." },
        { status: 400 }
      );
    }
    const validTypes = [
      "update",
      "question",
      "inspiration",
      "announcement",
      "showcase",
    ];
    const finalType = validTypes.includes(type) ? type : "update";
    const post = await db.communityPost.create({
      data: {
        authorId: authorId || null,
        authorName,
        authorRole: authorRole || null,
        type: finalType,
        title: title || null,
        body: String(text),
        imageUrl: imageUrl || null,
      },
      include: {
        comments: { orderBy: { createdAt: "asc" } },
        _count: { select: { likes: true } },
      },
    });
    return Response.json(post);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
