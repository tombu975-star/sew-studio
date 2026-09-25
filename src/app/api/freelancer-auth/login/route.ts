import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/serverClient";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email).toLowerCase().trim(),
      password: String(password),
    });
    if (error || !data.user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const { data: freelancer } = await supabase
      .from("freelancer_profiles")
      .select("id, email, full_name, phone, specialty, skills")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!freelancer) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "No freelancer account found for that email." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      freelancer: {
        id: freelancer.id,
        email: freelancer.email,
        fullName: freelancer.full_name,
        phone: freelancer.phone,
        specialty: freelancer.specialty,
        skills: freelancer.skills,
      },
    });
  } catch (error) {
    console.error("[freelancer-auth/login]", error);
    return NextResponse.json(
      { error: "Could not sign you in. Please try again." },
      { status: 500 }
    );
  }
}
