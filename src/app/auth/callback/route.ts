import { NextResponse, type NextRequest } from "next/server";
import { createRequestClient } from "@/lib/db/requestClient";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/";
  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const code = url.searchParams.get("code");

  if (code) {
    const db = await createRequestClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, url.origin));
  }

  return NextResponse.redirect(new URL("/reset-password?error=invalid_link", url.origin));
}