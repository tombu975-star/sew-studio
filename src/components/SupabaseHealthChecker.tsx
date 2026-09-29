"use client";

import { useEffect, useState } from "react";

interface HealthData {
  status: "connected" | "error" | "loading";
  provider?: string;
  hostSanitized?: string;
  databaseName?: string;
  pgVersionPreview?: string;
  latencyMs?: number;
  counts?: {
    shops: number;
    users: number;
    orders: number;
  };
  message?: string;
  error?: string;
}

export function SupabaseHealthChecker() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkHealth() {
      const start = performance.now();
      try {
        console.groupCollapsed(
          "%c[Supabase Health-Check] 🔄 Testing PostgreSQL connectivity...",
          "color: #10b981; font-weight: bold;"
        );
        console.log("Pinging /api/health/supabase endpoint...");

        const res = await fetch("/api/health/supabase", {
          cache: "no-store",
        });
        const clientLatency = Math.round(performance.now() - start);
        const data = await res.json();

        if (isMounted) {
          setHealth(data);
        }

        if (res.ok && data.status === "connected") {
          console.log(
            `%c[Supabase Health-Check] ✅ Connected to Supabase PostgreSQL`,
            "color: #10b981; font-weight: bold; font-size: 13px;"
          );
          console.table({
            Status: "CONNECTED",
            Provider: data.provider,
            Host: data.hostSanitized,
            Database: data.databaseName,
            "Server Latency": `${data.latencyMs}ms`,
            "Client Roundtrip": `${clientLatency}ms`,
            "Users in DB": data.counts?.users,
            "Orders in DB": data.counts?.orders,
            "Shops in DB": data.counts?.shops,
          });
          console.log("Full Response Details:", data);
        } else {
          console.error(
            `%c[Supabase Health-Check] ❌ Connectivity Error`,
            "color: #8E3232; font-weight: bold; font-size: 13px;",
            data
          );
        }
        console.groupEnd();
      } catch (err) {
        console.error(
          "%c[Supabase Health-Check] ❌ Fetch Error:",
          "color: #8E3232; font-weight: bold;",
          err
        );
        if (isMounted) {
          setHealth({
            status: "error",
            error: err instanceof Error ? err.message : String(err),
            message: "Network error pinging health check API",
          });
        }
      }
    }

    checkHealth();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!health) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 12,
        left: 12,
        zIndex: 9999,
        fontSize: 12,
        fontFamily: "monospace",
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 8px",
          borderRadius: 6,
          backgroundColor: health.status === "connected" ? "#064e3b" : "#7f1d1d",
          color: "#fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          cursor: "pointer",
          border: `1px solid ${health.status === "connected" ? "#10b981" : "#8E3232"}`,
        }}
        title="Click to view Supabase connection details (Also logged in F12 Console)"
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: health.status === "connected" ? "#34d399" : "#f87171",
            boxShadow:
              health.status === "connected"
                ? "0 0 6px #34d399"
                : "0 0 6px #f87171",
          }}
        />
        <span>
          Supabase: {health.status === "connected" ? `Online (${health.latencyMs}ms)` : "Offline"}
        </span>
      </div>

      {expanded && (
        <div
          style={{
            marginTop: 6,
            padding: 10,
            borderRadius: 6,
            backgroundColor: "#0f172a",
            color: "#e2e8f0",
            maxWidth: 320,
            border: "1px solid #334155",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            lineHeight: 1.4,
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: 4, color: "#38bdf8" }}>
            Supabase Postgres Diagnostics
          </div>
          <div>Provider: {health.provider || "Supabase"}</div>
          <div>Database: {health.databaseName}</div>
          <div>Server Latency: {health.latencyMs}ms</div>
          {health.counts && (
            <div style={{ marginTop: 4, color: "#94a3b8" }}>
              Users: {health.counts.users} | Orders: {health.counts.orders} | Shops: {health.counts.shops}
            </div>
          )}
          {health.error && (
            <div style={{ color: "#f87171", marginTop: 4 }}>
              Error: {health.error}
            </div>
          )}
          <div style={{ marginTop: 6, fontSize: 10, color: "#64748b" }}>
            Full diagnostics printed to browser console (F12)
          </div>
        </div>
      )}
    </div>
  );
}
