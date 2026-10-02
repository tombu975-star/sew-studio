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

    const { data: admin } = await supabase
      .from("system_admins")
      .select("id, email, full_name")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!admin) {
      // This login works for shop members and freelancers too — a correct
      // password for one of those doesn't make them a system admin.
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "No system admin account found for that email." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      admin: { id: admin.id, email: admin.email, fullName: admin.full_name },
    });
  } catch (error) {
    console.error("[admin-auth/login]", error);
    return NextResponse.json(
      { error: "Could not sign you in. Please try again." },
      { status: 500 }
    );
  }
}
