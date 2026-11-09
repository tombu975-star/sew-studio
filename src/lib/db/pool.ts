import { Pool } from "pg";

// One pool per server process. Cached on globalThis so Next's dev reloads
// don't open a new pool every time a file changes.
const g = globalThis as unknown as { __sewPool?: Pool };

export function getPool(): Pool {
  if (!g.__sewPool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set. Link the Railway Postgres service to this app.");
    }
    g.__sewPool = new Pool({
      connectionString: url,
      max: Number(process.env.DB_POOL_MAX || 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    g.__sewPool.on("error", (err) => console.error("[db] idle client error", err.message));
  }
  return g.__sewPool;
}
