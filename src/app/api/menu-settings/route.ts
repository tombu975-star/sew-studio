import { NextResponse } from "next/server";
import { MENU_DEFINITIONS } from "@/lib/menu-config";
import { getTenant } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";
import { getPlanEntitlements } from "@/lib/plans";

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
    const { data: shop, error } = await tenant.db
      .from("shops")
      .select("plan, trial_ends_at")
      .eq("id", tenant.shopId)
      .single();
    if (error || !shop) throw error ?? new Error("Could not load studio plan.");
    const plan = getPlanEntitlements(shop.plan, shop.trial_ends_at);
    return NextResponse.json(
      Object.fromEntries(
        MENU_DEFINITIONS.map(({ key }) => [
          key,
          (enabled.get(key) ?? true) && plan.features.includes(key),
        ])
      )
    );
  } catch (error) {
    console.error("[menu-settings] failed to load menu settings", error);
    return NextResponse.json({ error: "Could not load menu settings." }, { status: 500 });
  }
}
