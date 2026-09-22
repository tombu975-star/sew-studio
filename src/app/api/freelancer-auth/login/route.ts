import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Demo-only auth (matches the rest of this app): plaintext password
// compare. Sets its own cookie (fs_session = base64(freelancerId)) —
// deliberately never touches ms_session or any shop/tenant data.
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const freelancer = await db.freelancerAccount.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    });
    if (!freelancer || freelancer.password !== password) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const safeFreelancer = {
      id: freelancer.id,
      email: freelancer.email,
      fullName: freelancer.fullName,
      phone: freelancer.phone,
      specialty: freelancer.specialty,
      skills: freelancer.skills,
    };

    const token = Buffer.from(freelancer.id).toString("base64");
    const res = NextResponse.json({ freelancer: safeFreelancer });
    res.cookies.set("fs_session", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (error) {
    console.error("[freelancer-auth/login]", error);
    return NextResponse.json(
      { error: "Could not sign you in. Please try again." },
      { status: 500 }
    );
  }
}
