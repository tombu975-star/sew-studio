import { NextResponse } from "next/server";
import { getSystemAdminSession } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";
import { resolveWebsiteContent, websiteContentSchema } from "@/lib/website-content";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSystemAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { rows } = await getPool().query(
      `select content, updated_at as "updatedAt" from public.system_website_content where singleton = true`
    );
    return NextResponse.json(
      { content: resolveWebsiteContent(rows[0]?.content), updatedAt: rows[0]?.updatedAt ?? null },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[admin/website-content] load failed", error);
    return NextResponse.json({ error: "Could not load website content." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSystemAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = websiteContentSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.join(" › ") || "content";
    return NextResponse.json({ error: `${where}: ${issue?.message ?? "Invalid value"}` }, { status: 400 });
  }
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query(
      `insert into public.system_website_content (singleton, content, updated_at, updated_by)
       values (true, $1::jsonb, now(), $2)
       on conflict (singleton) do update
         set content = excluded.content, updated_at = now(), updated_by = excluded.updated_by
       returning updated_at as "updatedAt"`,
      [JSON.stringify(parsed.data), session.adminId]
    );
    await client.query(
      `insert into public.system_platform_audit_log (admin_id, action, entity, details)
       values ($1, 'website.updated', 'website_content', '{}'::jsonb)`,
      [session.adminId]
    );
    await client.query("commit");
    return NextResponse.json({ content: parsed.data, updatedAt: rows[0].updatedAt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await client.query("rollback").catch(() => {});
    console.error("[admin/website-content] save failed", error);
    return NextResponse.json({ error: "Could not save website content." }, { status: 500 });
  } finally {
    client.release();
  }
}

// Restore the built-in defaults.
export async function DELETE() {
  const session = await getSystemAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await getPool().query(
      `update public.system_website_content set content = '{}'::jsonb, updated_at = now(), updated_by = $1 where singleton = true`,
      [session.adminId]
    );
    await getPool().query(
      `insert into public.system_platform_audit_log (admin_id, action, entity, details)
       values ($1, 'website.reset', 'website_content', '{}'::jsonb)`,
      [session.adminId]
    );
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin/website-content] reset failed", error);
    return NextResponse.json({ error: "Could not reset website content." }, { status: 500 });
  }
}
