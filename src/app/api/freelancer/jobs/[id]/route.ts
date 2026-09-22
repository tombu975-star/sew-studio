import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getFreelancerAuth } from "@/lib/freelancerAuth";

const VALID_STATUSES = ["Commissioned", "In Progress", "Delivered", "Paid"];

// PATCH /api/freelancer/jobs/:id — a freelancer may only update the
// status of a job that's actually theirs, and only the status field.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getFreelancerAuth(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await db.freelanceJob.findFirst({
    where: { id, freelancerId: ctx.freelancerId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const body = await req.json();
  if (!VALID_STATUSES.includes(body?.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const updated = await db.freelanceJob.update({
    where: { id },
    data: { status: body.status },
    select: {
      id: true,
      taskDescription: true,
      cost: true,
      dueDate: true,
      status: true,
      createdAt: true,
      shop: { select: { name: true } },
    },
  });
  return NextResponse.json(updated);
}
