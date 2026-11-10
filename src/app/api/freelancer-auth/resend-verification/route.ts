import { NextResponse } from "next/server";
import { getFreelancerSession } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";
import { sendFreelancerVerification } from "@/lib/freelancer-verification";
import { dbErrorResponse } from "@/lib/db/errors";

// POST /api/freelancer-auth/resend-verification — emails a fresh link (1/minute).
export async function POST(req: Request) {
  try {
    const ctx = await getFreelancerSession();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { rows } = await getPool().query(
      `select email, full_name, verified_at from public.freelancer_profiles where id = $1`,
      [ctx.freelancerId]
    );
    const p = rows[0];
    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (p.verified_at) return NextResponse.json({ ok: true, alreadyVerified: true });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const res = await sendFreelancerVerification({ freelancerId: ctx.freelancerId, email: p.email, name: p.full_name, appUrl });
    if (res.tooSoon) {
      return NextResponse.json({ error: "A link was just sent. Please wait a minute before requesting another." }, { status: 429 });
    }
    return NextResponse.json({ ok: true, emailSent: res.sent });
  } catch (err) {
    return dbErrorResponse(err, "freelancer-auth/resend-verification");
  }
}
