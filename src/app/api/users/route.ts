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

// Create a new studio member (staff / trainer / trainee / madam).
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, email, role, gender, phone, password } = body || {};
    if (!fullName || !email) {
      return Response.json(
        { error: "Name and email are required." },
        { status: 400 }
      );
    }
    const validRoles = ["madam", "staff", "trainer", "trainee"];
    const finalRole = validRoles.includes(role) ? role : "staff";

    const existing = await db.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    });
    if (existing) {
      return Response.json(
        { error: "A member with that email already exists." },
        { status: 409 }
      );
    }

    const user = await db.user.create({
      data: {
        fullName: String(fullName).trim(),
        email: String(email).toLowerCase().trim(),
        role: finalRole,
        gender: gender || null,
        phone: phone || null,
        password: password || "atelier2025",
      },
    });
    return Response.json(user);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
