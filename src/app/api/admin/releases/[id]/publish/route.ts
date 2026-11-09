import { NextResponse } from "next/server";
import { getSystemAdminSession } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

const SETTINGS_COLUMNS: Record<string, string> = {
  appVersion: "app_version",
  releaseNotes: "release_notes",
  brandName: "brand_name",
  loginHeading: "login_heading",
  loginDescription: "login_description",
  loginFooter: "login_footer",
  primaryColor: "primary_color",
  accentColor: "accent_color",
  backgroundColor: "background_color",
};

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSystemAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query(
      "select id, version, release_notes, settings_snapshot, status from public.system_platform_releases where id = $1 for update",
      [id]
    );
    const release = result.rows[0];
    if (!release) {
      await client.query("rollback");
      return NextResponse.json({ error: "Release not found." }, { status: 404 });
    }
    if (release.status !== "draft") {
      await client.query("rollback");
      return NextResponse.json({ error: "Only draft releases can be published." }, { status: 409 });
    }
    const snapshot = release.settings_snapshot as Record<string, unknown>;
    for (const [key, column] of Object.entries(SETTINGS_COLUMNS)) {
      if (typeof snapshot[key] !== "string") throw new Error(`Release snapshot is missing ${key}.`);
      if (column.endsWith("_color") && !/^#[0-9A-Fa-f]{6}$/.test(snapshot[key] as string)) throw new Error("Release contains an invalid color.");
    }
    await client.query("update public.system_platform_releases set status = 'archived' where status = 'published'");
    const updates = Object.entries(SETTINGS_COLUMNS);
    await client.query(
      `update public.system_platform_settings set ${updates.map(([key, column], i) => `${column} = $${i + 1}`).join(", ")}, updated_at = now(), updated_by = $${updates.length + 1} where singleton = true`,
      [...updates.map(([key]) => snapshot[key]), session.adminId]
    );
    await client.query(
      "update public.system_platform_releases set status = 'published', published_by = $2, published_at = now() where id = $1",
      [id, session.adminId]
    );
    await client.query(
      `insert into public.system_platform_audit_log (admin_id, action, entity, entity_id, details) values ($1, 'release.published', 'platform_release', $2, $3::jsonb)`,
      [session.adminId, id, JSON.stringify({ version: release.version })]
    );
    await client.query("commit");
    return NextResponse.json({ id, version: release.version, status: "published" });
  } catch (error) {
    await client.query("rollback").catch(() => {});
    console.error("[admin/releases] publish failed", error);
    return NextResponse.json({ error: "Could not publish release." }, { status: 500 });
  } finally {
    client.release();
  }
}
