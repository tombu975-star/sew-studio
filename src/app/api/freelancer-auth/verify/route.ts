import { NextResponse } from "next/server";
import { redeemFreelancerVerification } from "@/lib/freelancer-verification";
import { dbErrorResponse } from "@/lib/db/errors";

// POST /api/freelancer-auth/verify { token } — confirms the emailed link.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const token = typeof body?.token === "string" ? body.token : "";
    if (token.length < 20 || token.length > 128) {
      return NextResponse.json({ error: "This verification link is invalid." }, { status: 400 });
    }
    const id = await redeemFreelancerVerification(token);
    if (!id) {
      return NextResponse.json(
        { error: "This link is invalid, expired or already used. Sign in and request a new one." },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return dbErrorResponse(err, "freelancer-auth/verify");
  }
}
