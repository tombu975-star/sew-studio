import { NextResponse } from "next/server";
import { getSystemAdminSession } from "@/lib/supabase/session";

export async function GET() {
  const ctx = await getSystemAdminSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: admin } = await ctx.supabase
    .from("system_admins")
    .select("id, email, full_name")
    .eq("id", ctx.adminId)
    .maybeSingle();
  if (!admin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ id: admin.id, email: admin.email, fullName: admin.full_name });
}
