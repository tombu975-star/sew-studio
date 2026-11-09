import { NextResponse } from "next/server";
import { getFreelancerSession } from "@/lib/db/session";

// GET /api/freelancer/jobs — every job assigned to this freelancer,
// across every shop that has commissioned them. Deliberately a narrow
// `select` so it's structurally impossible for this to leak into
// Order/Customer/User data — only the shop's display NAME is exposed,
// nothing else about the shop.
export async function GET() {
  const ctx = await getFreelancerSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: jobs, error } = await ctx.db
    .from("freelance_jobs")
    .select("id, task_description, cost, due_date, status, created_at, shop:shops(name)")
    // order_id intentionally NOT selected — internal shop reference only.
    .eq("freelancer_id", ctx.freelancerId)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    jobs.map((j) => ({
      id: j.id,
      taskDescription: j.task_description,
      cost: j.cost,
      dueDate: j.due_date,
      status: j.status,
      createdAt: j.created_at,
      shop: j.shop ? { name: j.shop.name } : null,
    }))
  );
}
