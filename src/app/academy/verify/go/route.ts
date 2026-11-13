import { NextResponse } from "next/server";
export function GET(req: Request) {
  const code = (new URL(req.url).searchParams.get("code") ?? "").trim().toUpperCase();
  return NextResponse.redirect(new URL(/^SEW-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code) ? `/academy/verify/${code}` : "/academy/verify", req.url));
}
