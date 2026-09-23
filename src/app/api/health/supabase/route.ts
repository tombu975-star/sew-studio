import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  try {
    // Run a query on Supabase Postgres: test connection & count tables
    const [shopCount, userCount, orderCount, pgVersion] = await Promise.all([
      db.shop.count(),
      db.user.count(),
      db.order.count(),
      // Raw query to check PostgreSQL engine version and database name
      db.$queryRawUnsafe<Array<{ current_database: string; version: string }>>(
        "SELECT current_database(), version();"
      ).catch(() => [{ current_database: "unknown", version: "unknown" }]),
    ]);

    const latencyMs = Date.now() - startTime;
    const isSupabase =
      (process.env.DATABASE_URL || "").includes("supabase.co") ||
      (process.env.DATABASE_URL || "").includes("pooler.supabase.com");

    const host = (process.env.DATABASE_URL || "")
      .replace(/:\/\/.*@/, "://***@")
      .split("?")[0];

    return NextResponse.json({
      status: "connected",
      databaseType: "PostgreSQL",
      provider: isSupabase ? "Supabase" : "PostgreSQL",
      hostSanitized: host,
      databaseName: pgVersion[0]?.current_database || "postgres",
      pgVersionPreview: pgVersion[0]?.version?.split(" ")[0] || "PostgreSQL",
      latencyMs,
      timestamp: new Date().toISOString(),
      counts: {
        shops: shopCount,
        users: userCount,
        orders: orderCount,
      },
      message: "Successfully connected to Supabase PostgreSQL instance.",
    });
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[HealthCheck] Supabase Postgres connectivity failed:", error);

    return NextResponse.json(
      {
        status: "error",
        databaseType: "PostgreSQL",
        latencyMs,
        timestamp: new Date().toISOString(),
        error: errorMessage,
        message: "Failed to connect to Supabase PostgreSQL instance.",
      },
      { status: 500 }
    );
  }
}
