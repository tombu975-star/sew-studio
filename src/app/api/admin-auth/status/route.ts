import { NextResponse } from "next/server";
import { diagnoseSupabase } from "@/lib/supabaseDiagnostics";

// GET /api/admin-auth/status — open it in a browser to see why sign-in can't
// reach Supabase. Shows only yes/no answers, the public project address and
// hints; never any key. Delete this file once sign-in works if you prefer.
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await diagnoseSupabase({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
