import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/adminClient";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  try {
    const admin = createAdminSupabaseClient();

    const [shopsRes, usersRes, ordersRes] = await Promise.all([
      admin.from("shops").select("id", { count: "exact", head: true }),
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("orders").select("id", { count: "exact", head: true }),
    ]);
    for (const res of [shopsRes, usersRes, ordersRes]) {
      if (res.error) throw res.error;
    }

    const latencyMs = Date.now() - startTime;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const hostSanitized = url.replace(/^https?:\/\//, "");

    return NextResponse.json({
      status: "connected",
      databaseType: "PostgreSQL (via Supabase PostgREST)",
      provider: "Supabase",
      hostSanitized,
      latencyMs,
      timestamp: new Date().toISOString(),
      counts: {
        shops: shopsRes.count ?? 0,
        users: usersRes.count ?? 0,
        orders: ordersRes.count ?? 0,
      },
      message: "Successfully connected to the Supabase project.",
    });
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[HealthCheck] Supabase connectivity failed:", error);

    return NextResponse.json(
      {
        status: "error",
        databaseType: "PostgreSQL (via Supabase PostgREST)",
        latencyMs,
        timestamp: new Date().toISOString(),
        error: errorMessage,
        message: "Failed to connect to the Supabase project.",
      },
      { status: 500 }
    );
  }
}
