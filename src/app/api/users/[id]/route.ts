import { db } from "@/lib/db";

// PATCH — update a user (used by trainer/owner to set mentor + training duration on trainees)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { mentorId, trainingDurationWeeks, trainingStartedAt, fullName, phone, gender } =
      body || {};

    const data: Record<string, unknown> = {};
    if (mentorId !== undefined) data.mentorId = mentorId || null;
    if (trainingDurationWeeks !== undefined)
      data.trainingDurationWeeks = trainingDurationWeeks
        ? Number(trainingDurationWeeks)
        : null;
    if (trainingStartedAt !== undefined)
      data.trainingStartedAt = trainingStartedAt
        ? new Date(trainingStartedAt)
        : null;
    if (fullName !== undefined) data.fullName = fullName;
    if (phone !== undefined) data.phone = phone || null;
    if (gender !== undefined) data.gender = gender || null;

    const updated = await db.user.update({ where: { id }, data });
    return Response.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
