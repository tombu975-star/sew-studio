import { NextResponse } from "next/server";
import { createRequestClient } from "@/lib/db/requestClient";

export async function POST() {
  const db = await createRequestClient();
  await db.auth.signOut();
  return NextResponse.json({ ok: true });
}
