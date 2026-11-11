import { NextRequest, NextResponse } from "next/server";
import { getTenant } from "@/lib/db/session";

// GET /api/export/customers | /api/export/orders  →  CSV download.
// Read-only, so it keeps working when a studio is view-only (unpaid trial / outside plan).

const CUSTOMER_COLUMNS: [string, string][] = [
  ["Name", "name"], ["Phone", "phone"], ["WhatsApp", "whatsapp"], ["Email", "email"],
  ["Gender", "gender"], ["City", "city"], ["Country", "country"], ["Customer type", "customer_type"],
  ["Status", "status"], ["Entry source", "entry_source"], ["Referred by", "referred_by"],
  ["Notes", "notes"], ["Created", "created_at"],
];

// Cells starting with = + - @ are treated as formulas by spreadsheets; neutralise them.
function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
const row = (values: unknown[]) => values.map(cell).join(",");

export async function GET(_req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const ctx = await getTenant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "madam" && ctx.role !== "trainer") {
    return NextResponse.json({ error: "Only the studio owner or a trainer can export data." }, { status: 403 });
  }

  let lines: string[];
  if (kind === "customers") {
    const { data, error } = await ctx.db.from("customers").select("*").eq("shop_id", ctx.shopId).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    lines = [row(CUSTOMER_COLUMNS.map(([h]) => h)), ...(data ?? []).map((c: Record<string, unknown>) => row(CUSTOMER_COLUMNS.map(([, k]) => c[k])))];
  } else if (kind === "orders") {
    const { data, error } = await ctx.db
      .from("orders")
      .select("*, customer:customers(name, phone), payments(amount)")
      .eq("shop_id", ctx.shopId)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const header = ["Customer", "Phone", "Garment", "Status", "Priority", "Order date", "Delivery date", "Selling price", "Paid", "Balance", "Fabric cost", "Labour cost", "Other cost", "Mark-up %", "Notes"];
    lines = [row(header), ...(data ?? []).map((o: Record<string, any>) => {
      const paid = Array.isArray(o.payments) ? o.payments.reduce((n: number, p: { amount: number }) => n + Number(p.amount || 0), 0) : 0;
      return row([o.customer?.name, o.customer?.phone, o.garment_design, o.status, o.priority, o.order_date, o.delivery_date,
        o.selling_price, paid, Number(o.selling_price || 0) - paid, o.fabric_cost, o.labour_cost, o.other_cost, o.markup_percent, o.notes]);
    })];
  } else {
    return NextResponse.json({ error: "Unknown export." }, { status: 404 });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sewsiness-${kind}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
