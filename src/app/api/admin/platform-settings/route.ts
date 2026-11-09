import { NextResponse } from "next/server";
import { getSystemAdminSession } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

const SETTINGS_FIELDS = `
  app_version as "appVersion",
  release_notes as "releaseNotes",
  brand_name as "brandName",
  login_heading as "loginHeading",
  login_description as "loginDescription",
  login_footer as "loginFooter",
  primary_color as "primaryColor",
  accent_color as "accentColor",
  background_color as "backgroundColor",
  updated_at as "updatedAt"
`;
const TEXT_FIELDS = {
  appVersion: { column: "app_version", limit: 32 },
  releaseNotes: { column: "release_notes", limit: 2000 },
  brandName: { column: "brand_name", limit: 80 },
  loginHeading: { column: "login_heading", limit: 100 },
  loginDescription: { column: "login_description", limit: 300 },
  loginFooter: { column: "login_footer", limit: 180 },
} as const;
const COLOR_FIELDS = {
  primaryColor: "primary_color",
  accentColor: "accent_color",
  backgroundColor: "background_color",
} as const;

export async function GET() {
  const session = await getSystemAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { rows } = await getPool().query(
      `select ${SETTINGS_FIELDS} from public.system_platform_settings where singleton = true`
    );
    if (!rows[0]) return NextResponse.json({ error: "Platform settings are not initialized." }, { status: 503 });
    return NextResponse.json(rows[0], { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin/platform-settings] load failed", error);
    return NextResponse.json({ error: "Could not load platform settings." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSystemAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "A settings object is required." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const values: Record<string, string> = {};
  for (const [field, config] of Object.entries(TEXT_FIELDS)) {
    if (!(field in input)) continue;
    if (typeof input[field] !== "string") return NextResponse.json({ error: `${field} must be text.` }, { status: 400 });
    const value = input[field].trim();
    if ((!value && field !== "releaseNotes") || value.length > config.limit) {
      return NextResponse.json({ error: `${field} must be ${field === "releaseNotes" ? "at most" : "1–"}${config.limit} characters.` }, { status: 400 });
    }
    values[config.column] = value;
  }
  for (const [field, column] of Object.entries(COLOR_FIELDS)) {
    if (!(field in input)) continue;
    const value = input[field];
    if (typeof value !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(value)) {
      return NextResponse.json({ error: `${field} must be a six-digit hex color.` }, { status: 400 });
    }
    values[column] = value.toUpperCase();
  }
  if (!Object.keys(values).length) return NextResponse.json({ error: "No valid settings were provided." }, { status: 400 });

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const old = await client.query(`select ${SETTINGS_FIELDS} from public.system_platform_settings where singleton = true for update`);
    if (!old.rows[0]) throw new Error("Platform settings are not initialized.");
    const columns = Object.keys(values);
    const assignments = columns.map((column, i) => `${column} = $${i + 1}`).join(", ");
    const updated = await client.query(
      `update public.system_platform_settings set ${assignments}, updated_at = now(), updated_by = $${columns.length + 1} where singleton = true returning ${SETTINGS_FIELDS}`,
      [...Object.values(values), session.adminId]
    );
    const changed = Object.keys(values).map((column) => ({
      field: column,
      from: old.rows[0][Object.entries(TEXT_FIELDS).find(([, v]) => v.column === column)?.[0] ?? Object.entries(COLOR_FIELDS).find(([, v]) => v === column)?.[0] ?? column],
      to: values[column],
    }));
    await client.query(
      `insert into public.system_platform_audit_log (admin_id, action, entity, details) values ($1, 'settings.updated', 'platform_settings', $2::jsonb)`,
      [session.adminId, JSON.stringify({ changed })]
    );
    await client.query("commit");
    return NextResponse.json(updated.rows[0], { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await client.query("rollback").catch(() => {});
    console.error("[admin/platform-settings] update failed", error);
    return NextResponse.json({ error: "Could not save platform settings." }, { status: 500 });
  } finally {
    client.release();
  }
}
