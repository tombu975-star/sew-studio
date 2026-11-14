import { NextResponse } from "next/server";
import { createRequestClient } from "@/lib/db/requestClient";
import { getAppBaseUrl } from "@/lib/website-content.server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (email) {
    try {
      const db = await createRequestClient();
      const appUrl = await getAppBaseUrl(req);
      const { error } = await db.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
      });
      if (error) console.warn("[auth/forgot-password] Recovery email request failed.");
    } catch {
      // Keep the response identical so the route does not disclose account existence.
    }
  }

  return NextResponse.json({ ok: true });
}