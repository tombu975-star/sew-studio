import { NextResponse } from "next/server";
import { getSystemAdminSession } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSystemAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { rows } = await getPool().query(
      `select id, version, release_notes as "releaseNotes", status,
              created_at as "createdAt", published_at as "publishedAt"
       from public.system_platform_releases order by created_at desc limit 50`
    );
    return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin/releases] list failed", error);
    return NextResponse.json({ error: "Could not load releases." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSystemAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const version = typeof body?.version === "string" ? body.version.trim() : "";
  const releaseNotes = typeof body?.releaseNotes === "string" ? body.releaseNotes.trim() : "";
  if (!version || version.length > 32 || releaseNotes.length > 2000) {
    return NextResponse.json({ error: "Provide a version (up to 32 characters) and release notes up to 2,000 characters." }, { status: 400 });
  }
  try {
    const { rows } = await getPool().query(
      `with settings as (
         select jsonb_build_object(
           'appVersion', app_version, 'releaseNotes', release_notes,
           'brandName', brand_name, 'loginHeading', login_heading,
           'loginDescription', login_description, 'loginFooter', login_footer,
           'primaryColor', primary_color, 'accentColor', accent_color,
           'backgroundColor', background_color
         ) as snapshot from public.system_platform_settings where singleton = true
       ), created as (
         insert into public.system_platform_releases (version, release_notes, settings_snapshot, created_by)
         select $1, $2, snapshot, $3 from settings returning id, version, release_notes, status, created_at
       ), audit as (
         insert into public.system_platform_audit_log (admin_id, action, entity, entity_id, details)
         select $3, 'release.draft_created', 'platform_release', id, jsonb_build_object('version', version)
         from created returning id
       )
       select id, version, release_notes as "releaseNotes", status, created_at as "createdAt" from created`,
      [version, releaseNotes, session.adminId]
    );
    if (!rows[0]) return NextResponse.json({ error: "Platform settings are not initialized." }, { status: 503 });
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("[admin/releases] draft creation failed", error);
    return NextResponse.json({ error: "Could not create release draft." }, { status: 500 });
  }
}
