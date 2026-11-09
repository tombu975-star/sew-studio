import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/serverClient";
import {
  clearRailwaySessionCookie,
  getRailwaySessionCookieToken,
  isRailwayAuthEnabled,
  revokeRailwaySession,
} from "@/lib/railway-auth";

export async function POST() {
  if (isRailwayAuthEnabled()) {
    const token = await getRailwaySessionCookieToken();
    try {
      if (token) await revokeRailwaySession(token);
    } finally {
      await clearRailwaySessionCookie();
    }
    return NextResponse.json({ ok: true });
  }

  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
