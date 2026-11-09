import { NextResponse } from "next/server";
import { getSystemAdminSession } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";
import { MENU_DEFINITIONS, type MenuKey } from "@/lib/menu-config";

export async function GET() {
  const session = await getSystemAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rows } = await getPool().query(
      "select menu_key, enabled from public.system_menu_settings"
    );
    const enabled = new Map<string, boolean>(rows.map((row) => [row.menu_key, row.enabled]));
    return NextResponse.json(
      MENU_DEFINITIONS.map((menu) => ({ ...menu, enabled: enabled.get(menu.key) ?? true }))
    );
  } catch (error) {
    console.error("[admin/menus] failed to load menu settings", error);
    return NextResponse.json({ error: "Could not load menu settings." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSystemAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body !== "object" ||
    !MENU_DEFINITIONS.some((menu) => menu.key === body.key) ||
    typeof body.enabled !== "boolean"
  ) {
    return NextResponse.json({ error: "A valid menu key and enabled state are required." }, { status: 400 });
  }

  try {
    const { rows } = await getPool().query(
      `insert into public.system_menu_settings (menu_key, enabled, updated_at, updated_by)
       values ($1, $2, now(), $3)
       on conflict (menu_key) do update
         set enabled = excluded.enabled, updated_at = now(), updated_by = excluded.updated_by
       returning menu_key, enabled`,
      [body.key as MenuKey, body.enabled, session.adminId]
    );
    return NextResponse.json({ key: rows[0].menu_key, enabled: rows[0].enabled });
  } catch (error) {
    console.error("[admin/menus] failed to update menu setting", error);
    return NextResponse.json({ error: "Could not update menu setting." }, { status: 500 });
  }
}
