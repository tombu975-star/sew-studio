import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Demo-only auth: plaintext password compare against the User table.
// Sets a cookie (base64 of user id + email) to keep the session.
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user || !user.password || user.password !== password) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      gender: user.gender,
      phone: user.phone,
    };

    // Simple non-cryptographic session token (demo only).
    const token = Buffer.from(`${user.id}:${user.email}`).toString("base64");
    const res = NextResponse.json({ user: safeUser });
    res.cookies.set("ms_session", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return res;
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json(
      { error: "Could not sign you in. Please try again." },
      { status: 500 }
    );
  }
}
