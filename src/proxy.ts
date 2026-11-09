import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPool } from "@/lib/db/pool";
import { menuForApiPath, menuForPagePath } from "@/lib/menu-config";

// Sessions are looked up server-side from the database on each API call, so
// there is nothing to refresh here. Kept as a pass-through so the matcher and
// file layout stay the same.
export async function proxy(request: NextRequest) {
  const menuKey =
    menuForApiPath(request.nextUrl.pathname) ?? menuForPagePath(request.nextUrl.pathname);
  if (menuKey) {
    try {
      const { rows } = await getPool().query(
        "select enabled from public.system_menu_settings where menu_key = $1",
        [menuKey]
      );
      if (rows[0]?.enabled === false) {
        return NextResponse.json(
          { error: "This feature is currently disabled by the platform administrator." },
          { status: 404 }
        );
      }
    } catch (error) {
      console.error("[proxy] could not verify system menu status", error);
      return NextResponse.json({ error: "Feature availability could not be verified." }, { status: 503 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
