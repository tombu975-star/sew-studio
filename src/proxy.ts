import { NextResponse } from "next/server";

// Sessions are looked up server-side from the database on each API call, so
// there is nothing to refresh here. Kept as a pass-through so the matcher and
// file layout stay the same.
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
