import { db } from "@/lib/db";

export async function GET() {
  try {
    const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });
    return Response.json(users);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
