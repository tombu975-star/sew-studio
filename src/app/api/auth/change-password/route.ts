import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/serverClient";

// POST /api/auth/change-password — for a user who is already signed in and
// knows their current password (distinct from the forgot/reset-password
// email flow, which is for when they don't). Re-verifies the current
// password with a fresh sign-in before allowing the change, so a session
// left open on a shared device can't be used to silently take over the
// account.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword) {
    return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Use a new password with at least 8 characters." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) {
      return NextResponse.json({ error: "Your current password is incorrect." }, { status: 401 });
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return NextResponse.json({ error: "Could not update your password. Try again." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not update your password. Try again." }, { status: 500 });
  }
}
