import { NextResponse } from "next/server";
import { createRequestClient } from "@/lib/db/requestClient";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8) {
    return NextResponse.json({ error: "Use a password with at least 8 characters." }, { status: 400 });
  }

  try {
    const db = await createRequestClient();
    const { data: authData } = await db.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: "This reset link has expired. Request a new one." }, { status: 401 });
    }

    const { error } = await db.auth.updateUser({ password });
    if (error) {
      return NextResponse.json({ error: "Could not update your password. Request a new reset link." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not update your password. Request a new reset link." }, { status: 500 });
  }
}