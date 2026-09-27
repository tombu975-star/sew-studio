import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/serverClient";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (email) {
    try {
      const supabase = await createServerSupabaseClient();
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/$/, "");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
      });
      if (error) console.warn("[auth/forgot-password] Recovery email request failed.");
    } catch {
      // Keep the response identical so the route does not disclose account existence.
    }
  }

  return NextResponse.json({ ok: true });
}