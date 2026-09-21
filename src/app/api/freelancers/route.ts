import { db } from "@/lib/db";

export async function GET() {
  try {
    const freelancers = await db.freelancer.findMany({
      orderBy: { createdAt: "desc" },
    });
    return Response.json(freelancers);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, specialty, skills, phone, email, rate, status, notes } =
      body || {};
    if (!name) {
      return Response.json({ error: "Name is required." }, { status: 400 });
    }
    const freelancer = await db.freelancer.create({
      data: {
        name: String(name).trim(),
        specialty: specialty || null,
        skills: skills || null,
        phone: phone || null,
        email: email || null,
        rate: rate ? Number(rate) : null,
        status: status || "Available",
        notes: notes || null,
      },
    });
    return Response.json(freelancer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
