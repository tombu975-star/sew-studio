import { NextResponse } from "next/server";
import { getSystemAdminSession } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";

export const dynamic = "force-dynamic";
export async function GET() {
  const session = await getSystemAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { rows } = await getPool().query(
      `select l.id, l.action, l.entity, l.entity_id as "entityId", l.details,
              l.created_at as "createdAt", a.email as "adminEmail", a.full_name as "adminName"
       from public.system_platform_audit_log l
       left join public.system_admins a on a.id = l.admin_id
       order by l.created_at desc limit 100`
    );
    return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin/audit-log] list failed", error);
    return NextResponse.json({ error: "Could not load the audit log." }, { status: 500 });
  }
}
