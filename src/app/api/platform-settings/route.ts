import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

const PUBLIC_FIELDS = `
  app_version as "appVersion",
  release_notes as "releaseNotes",
  brand_name as "brandName",
  login_heading as "loginHeading",
  login_description as "loginDescription",
  login_footer as "loginFooter",
  primary_color as "primaryColor",
  accent_color as "accentColor",
  background_color as "backgroundColor"
`;

// Login branding and theme are intentionally readable before authentication.
// This endpoint only returns presentation metadata; all writes require a
// separately authenticated platform-admin session.
export async function GET() {
  try {
    const { rows } = await getPool().query(
      `select ${PUBLIC_FIELDS} from public.system_platform_settings where singleton = true`
    );
    if (!rows[0]) return NextResponse.json({ error: "Platform settings are not initialized." }, { status: 503 });
    return NextResponse.json(rows[0], { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[platform-settings] failed to load public settings", error);
    return NextResponse.json({ error: "Could not load platform settings." }, { status: 503 });
  }
}
