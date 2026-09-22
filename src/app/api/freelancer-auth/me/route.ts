import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getFreelancerAuth } from "@/lib/freelancerAuth";

export async function GET(req: Request) {
  const ctx = await getFreelancerAuth(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const freelancer = await db.freelancerAccount.findUnique({
    where: { id: ctx.freelancerId },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      specialty: true,
      skills: true,
    },
  });
  if (!freelancer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(freelancer);
}
