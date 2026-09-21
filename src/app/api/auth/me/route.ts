import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("cookie") || "";
    const match = token.match(/ms_session=([^;]+)/);
    if (!match) return NextResponse.json({ user: null }, { status: 200 });

    const decoded = Buffer.from(match[1], "base64").toString("utf-8");
    const [id] = decoded.split(":");
    if (!id) return NextResponse.json({ user: null }, { status: 200 });

    const user = await db.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ user: null }, { status: 200 });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        gender: user.gender,
        phone: user.phone,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
