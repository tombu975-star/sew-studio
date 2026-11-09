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
    console.error("[admin/platform-settings] failed to load settings", error);
    return NextResponse.json({ error: "Could not load platform settings." }, { status: 500 });
  }
}

const TEXT_LIMITS = {
  appVersion: 32,
  releaseNotes: 2000,
  brandName: 80,
  loginHeading: 100,
  loginDescription: 300,
  loginFooter: 180,
} as const;
const COLOR_FIELDS = {
  primaryColor: "primary_color",
  accentColor: "accent_color",
  backgroundColor: "background_color",
} as const;

export async function PATCH(request: Request) {
  const session = await getSystemAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "A settings object is required." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const values: Record<string, string> = {};

  for (const [field, limit] of Object.entries(TEXT_LIMITS)) {
    if (!(field in input)) continue;
    if (typeof input[field] !== "string") {
      return NextResponse.json({ error: `${field} must be text.` }, { status: 400 });
    }
    const value = input[field].trim();
    if (!value || value.length > limit) {
      return NextResponse.json({ error: `${field} must contain 1–${limit} characters.` }, { status: 400 });
    }
    values[field] = value;
  }
  for (const [field, column] of Object.entries(COLOR_FIELDS)) {
    if (!(field in input)) continue;
    const value = input[field];
    if (typeof value !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(value)) {
      return NextResponse.json({ error: `${field} must be a six-digit hex color.` }, { status: 400 });
    }
    values[column] = value.toUpperCase();
  }
  if (Object.keys(values).length === 0) {
    return NextResponse.json({ error: "No valid platform settings were provided." }, { status: 400 });
  }

  const columns = Object.keys(values);
  const assignments = columns.map((column, index) => `${column} = $${index + 1}`).join(", ");
  const params = [...Object.values(values), session.adminId];
  try {
    const { rows } = await getPool().query(
      `update public.system_platform_settings
       set ${assignments}, updated_at = now(), updated_by = $${params.length}
       where singleton = true
       returning ${SETTINGS_FIELDS}`,
      params
    );
    if (!rows[0]) return NextResponse.json({ error: "Platform settings are not initialized." }, { status: 503 });
    return NextResponse.json(rows[0], { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin/platform-settings] failed to update settings", error);
    return NextResponse.json({ error: "Could not save platform settings." }, { status: 500 });
  }
}
