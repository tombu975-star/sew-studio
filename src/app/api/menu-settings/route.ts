import { NextResponse } from "next/server";
import { MENU_DEFINITIONS } from "@/lib/menu-config";
import { getTenant } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";

// Which tools are switched on by the platform administrator. A studio's plan does
// not hide tools: tools outside the plan stay open to view and only pause new entries.
export async function GET() {
  const tenant = await getTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rows } = await getPool().query(
      "select menu_key, enabled from public.system_menu_settings"
    );
    const enabled = new Map<string, boolean>(rows.map((row) => [row.menu_key, row.enabled]));
    return NextResponse.json(
      Object.fromEntries(MENU_DEFINITIONS.map(({ key }) => [key, enabled.get(key) ?? true]))
    );
  } catch (error) {
    console.error("[menu-settings] failed to load menu settings", error);
    return NextResponse.json({ error: "Could not load menu settings." }, { status: 500 });
  }
}
