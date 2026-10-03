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
      // Log the real reason on the server (visible in your host's logs) so a
      // failing sign-in can be diagnosed; show the visitor a safe message.
      const code = (error as { code?: string } | null)?.code ?? "";
      const msg = error?.message ?? "";
      console.error("[admin-auth/login] sign-in failed:", code || "(no code)", msg);

      if (code === "email_not_confirmed" || /not confirmed/i.test(msg)) {
        return NextResponse.json(
          { error: "This account's email isn't confirmed yet. Run: npm run create-admin -- <email> <password>" },
          { status: 401 }
        );
      }
      if (code === "over_request_rate_limit" || error?.status === 429) {
        return NextResponse.json(
          { error: "Too many attempts. Please wait a minute and try again." },
          { status: 429 }
        );
      }
      if (code === "invalid_credentials" || /invalid login credentials/i.test(msg)) {
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }
      // Anything else is not a wrong password: the sign-in service itself
      // failed (wrong project URL/keys, auth disabled, network…).
      return NextResponse.json(
        { error: "Could not reach the sign-in service. Check the Supabase URL and keys, then try again." },
        { status: 502 }
      );
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
