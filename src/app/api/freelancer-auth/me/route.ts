import { NextResponse } from "next/server";
import { getFreelancerSession } from "@/lib/supabase/session";

export async function GET() {
  const ctx = await getFreelancerSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: freelancer } = await ctx.supabase
    .from("freelancer_profiles")
    .select("id, email, full_name, phone, specialty, skills")
    .eq("id", ctx.freelancerId)
    .maybeSingle();
  if (!freelancer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: freelancer.id,
    email: freelancer.email,
    fullName: freelancer.full_name,
    phone: freelancer.phone,
    specialty: freelancer.specialty,
    skills: freelancer.skills,
  });
}
