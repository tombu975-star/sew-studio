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
      if (code === "user_banned" || /banned/i.test(msg)) {
        return NextResponse.json({ error: "This account has been disabled." }, { status: 403 });
      }
      if (code === "invalid_credentials" || /invalid login credentials/i.test(msg)) {
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }

      // Everything below is NOT a wrong password: the request to Supabase
      // itself failed. Say what kind of failure, and point at the status page.
      const name = (error as { name?: string } | null)?.name ?? "";
      const detail = code || name || "unknown error";
      const status = error?.status;
      let reason: string;
      if (code === "email_provider_disabled" || /email.*(disabled|not enabled)/i.test(msg)) {
        reason = "Email sign-in is switched off in your Supabase project (Authentication → Providers → Email).";
      } else if (code === "invalid_api_key" || /invalid api key|apikey/i.test(msg) || status === 401 || status === 403) {
        reason = "Supabase rejected the API key this site uses (wrong key, or one from a different project).";
      } else if (name === "AuthRetryableFetchError" || !status || status >= 500) {
        reason = "The site couldn't connect to Supabase (wrong URL, or the project is paused).";
      } else {
        reason = "Supabase returned an unexpected error.";
      }
      return NextResponse.json(
        { error: `${reason} [${detail}] Open /api/admin-auth/status on this site for exact steps.` },
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
