import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getFreelancerAuth } from "@/lib/freelancerAuth";

// GET /api/freelancer/jobs — every job assigned to this freelancer,
// across every shop that has commissioned them. Deliberately a narrow
// `select` (not `include`) so it's structurally impossible for this to
// leak into Order/Customer/User data even if those relations existed —
// only the shop's display NAME is exposed, nothing else about the shop.
export async function GET(req: Request) {
  const ctx = await getFreelancerAuth(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await db.freelanceJob.findMany({
    where: { freelancerId: ctx.freelancerId },
    select: {
      id: true,
      taskDescription: true,
      cost: true,
      dueDate: true,
      status: true,
      createdAt: true,
      shop: { select: { name: true } },
      // orderId intentionally NOT selected — internal shop reference only.
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(jobs);
}
