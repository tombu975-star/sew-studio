import { NextRequest, NextResponse } from "next/server";
import { getSystemAdminSession } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Spreadsheets treat cells starting with = + - @ as formulas; neutralise them.
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Who signed up for a session. ?format=csv downloads a spreadsheet.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSystemAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Session not found." }, { status: 404 });
  const { rows } = await getPool().query(
    `select full_name as "fullName", email, phone, about_you as "aboutYou", created_at as "signedUpAt"
       from public.system_training_registrations where training_id = $1 order by created_at`, [id]);
  if (req.nextUrl.searchParams.get("format") === "csv") {
    const lines = ["Name,Email,Phone,About you,Signed up", ...rows.map((r) => [r.fullName, r.email, r.phone, r.aboutYou, new Date(r.signedUpAt).toISOString()].map(cell).join(","))];
    return new NextResponse("\uFEFF" + lines.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="training-signups-${id.slice(0, 8)}.csv"`, "Cache-Control": "no-store" } });
  }
  return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
}
