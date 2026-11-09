import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/pool";

// GET /api/admin-auth/status — quick check that the app can reach its
// Railway Postgres database and that the schema is in place. Reports only
// yes/no answers and plain-English hints; never a connection string or secret.
export const dynamic = "force-dynamic";

export async function GET() {
  const hints: string[] = [];
  const out = { configured: !!process.env.DATABASE_URL, reachable: false, schemaReady: false, adminExists: false, hints };
  if (!out.configured) {
    hints.push("DATABASE_URL is not set. Link the Railway Postgres service to this app.");
    return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const pool = getPool();
    await pool.query("select 1");
    out.reachable = true;
    const t = await pool.query(
      `select to_regclass('public.profiles') is not null as profiles,
              to_regclass('private.credentials') is not null as creds`
    );
    out.schemaReady = !!(t.rows[0]?.profiles && t.rows[0]?.creds);
    if (!out.schemaReady) hints.push("The database is empty. Run the schema setup (npm run db:migrate).");
    else {
      const a = await pool.query(`select count(*)::int as n from system_admins`);
      out.adminExists = a.rows[0].n > 0;
      if (!out.adminExists) hints.push("No platform admin yet. Run: npm run create-admin");
    }
  } catch (e) {
    hints.push(`Could not reach the database: ${(e as Error).message}`);
  }
  return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
}
