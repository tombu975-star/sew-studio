import { NextResponse } from "next/server";
import { getSystemAdminSession } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";

export const dynamic = "force-dynamic";
const SETTINGS_COLUMNS: Record<string, string> = {
  appVersion: "app_version", releaseNotes: "release_notes", brandName: "brand_name",
  loginHeading: "login_heading", loginDescription: "login_description", loginFooter: "login_footer",
  primaryColor: "primary_color", accentColor: "accent_color", backgroundColor: "background_color",
};

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSystemAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query(
      "select id, version, settings_snapshot from public.system_platform_releases where id = $1 for update",
      [id]
    );
    const target = rows[0];
    if (!target) {
      await client.query("rollback");
      return NextResponse.json({ error: "Release not found." }, { status: 404 });
    }
    const snapshot = target.settings_snapshot as Record<string, unknown>;
    for (const [key, column] of Object.entries(SETTINGS_COLUMNS)) {
      if (typeof snapshot[key] !== "string") throw new Error(`Release snapshot is missing ${key}.`);
      if (column.endsWith("_color") && !/^#[0-9A-Fa-f]{6}$/.test(snapshot[key] as string)) throw new Error("Release contains an invalid color.");
    }
    await client.query("update public.system_platform_releases set status = 'archived' where status = 'published'");
    const updates = Object.entries(SETTINGS_COLUMNS);
    await client.query(
      `update public.system_platform_settings set ${updates.map(([, column], i) => `${column} = $${i + 1}`).join(", ")}, updated_at = now(), updated_by = $${updates.length + 1} where singleton = true`,
      [...updates.map(([key]) => snapshot[key]), session.adminId]
    );
    await client.query(
      "update public.system_platform_releases set status = 'published', published_by = $2, published_at = now() where id = $1",
      [id, session.adminId]
    );
    await client.query(
      `insert into public.system_platform_audit_log (admin_id, action, entity, entity_id, details) values ($1, 'release.rolled_back', 'platform_release', $2, $3::jsonb)`,
      [session.adminId, id, JSON.stringify({ restoredVersion: target.version })]
    );
    await client.query("commit");
    return NextResponse.json({ id, version: target.version, status: "published" });
  } catch (error) {
    await client.query("rollback").catch(() => {});
    console.error("[admin/releases] rollback failed", error);
    return NextResponse.json({ error: "Could not restore this release." }, { status: 500 });
  } finally {
    client.release();
  }
}
