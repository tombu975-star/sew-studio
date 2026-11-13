import { NextResponse } from "next/server";
import { safeNext, startSession, verifyLinkToken } from "@/lib/academy/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const learnerId = await verifyLinkToken(url.searchParams.get("t") ?? "");
  const dest = new URL(learnerId ? safeNext(url.searchParams.get("next")) : "/academy/sign-in?expired=1", url);
  if (learnerId) await startSession(learnerId);
  return NextResponse.redirect(dest);
}
