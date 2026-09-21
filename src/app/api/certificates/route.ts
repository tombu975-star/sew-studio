import { db } from "@/lib/db";

// GET /api/certificates?traineeId=ID — certificates for a trainee (or all if no filter)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const traineeId = url.searchParams.get("traineeId");
    const where = traineeId ? { traineeId } : undefined;
    const certs = await db.certificate.findMany({
      where,
      orderBy: { issuedAt: "desc" },
      include: {
        trainee: { select: { id: true, fullName: true, email: true, gender: true } },
        issuedBy: { select: { id: true, fullName: true } },
      },
    });
    return Response.json(certs);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// POST — issue a certificate to a trainee
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      traineeId,
      issuedById,
      programName,
      durationWeeks,
      skillsAchieved,
      honors,
    } = body || {};
    if (!traineeId || !issuedById) {
      return Response.json(
        { error: "Trainee and issuer are required." },
        { status: 400 }
      );
    }
    // Prevent duplicate certificates for the same trainee
    const existing = await db.certificate.findFirst({ where: { traineeId } });
    if (existing) {
      return Response.json(
        { error: "This trainee already has a certificate." },
        { status: 409 }
      );
    }
    const certNo = `MS-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const cert = await db.certificate.create({
      data: {
        traineeId,
        issuedById,
        programName: programName || "Atelier Apprenticeship Programme",
        durationWeeks: Number(durationWeeks) || 12,
        skillsAchieved: skillsAchieved || "",
        honors: honors || null,
        certificateNo: certNo,
      },
      include: {
        trainee: { select: { id: true, fullName: true, email: true, gender: true } },
        issuedBy: { select: { id: true, fullName: true } },
      },
    });
    return Response.json(cert);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
