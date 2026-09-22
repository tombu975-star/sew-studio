import { db } from "@/lib/db";
import { getTenant, tenantWhere } from "@/lib/tenant";

export async function GET(req: Request) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await db.user.findMany({
      where: tenantWhere(ctx.shopId),
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        gender: true,
        phone: true,
        shopId: true,
        mentorId: true,
        trainingDurationWeeks: true,
        trainingStartedAt: true,
        canAccessOrders: true,
        canAccessBoard: true,
        createdAt: true,
        updatedAt: true,
        // password intentionally excluded — never send it to the client
      },
    });
    return Response.json(users);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// Create a new studio member (staff / trainer / trainee / madam).
export async function POST(req: Request) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (ctx.role !== "madam" && ctx.role !== "trainer") {
      return Response.json(
        { error: "Only the studio owner or a trainer can add members." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { fullName, email, role, gender, phone, password, mentorId } =
      body || {};
    if (!fullName || !email) {
      return Response.json(
        { error: "Name and email are required." },
        { status: 400 }
      );
    }
    const validRoles = ["madam", "staff", "trainer", "trainee"];
    let finalRole = validRoles.includes(role) ? role : "staff";
    if (ctx.role === "trainer") {
      // Trainers may only add trainees — not staff, trainers, or owners.
      finalRole = "trainee";
    }

    const existing = await db.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    });
    if (existing) {
      return Response.json(
        { error: "A member with that email already exists." },
        { status: 409 }
      );
    }

    // A mentor can only be assigned when creating a trainee, and must be a
    // trainer/madam in the same shop — otherwise grading permission checks
    // (which require trainee.mentorId === grading trainer's id) can never
    // be satisfied for members added this way.
    let finalMentorId: string | null = null;
    if (finalRole === "trainee" && mentorId) {
      const mentor = await db.user.findFirst({
        where: {
          id: String(mentorId),
          shopId: ctx.shopId,
          role: { in: ["trainer", "madam"] },
        },
        select: { id: true },
      });
      finalMentorId = mentor ? String(mentorId) : null;
    }

    const user = await db.user.create({
      data: {
        shopId: ctx.shopId,
        fullName: String(fullName).trim(),
        email: String(email).toLowerCase().trim(),
        role: finalRole,
        gender: gender || null,
        phone: phone || null,
        password: password || "atelier2025",
        mentorId: finalMentorId,
      },
    });
    return Response.json(user);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
