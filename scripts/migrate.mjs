#!/usr/bin/env node
/**
 * Applies db/migrations/*.sql, in order, to the database in DATABASE_URL.
 * Each file runs once; applied files are recorded in private.schema_migrations.
 * Safe to run on every deploy (Railway runs it as the pre-deploy command).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");

export async function migrate(connectionString = process.env.DATABASE_URL, log = console.log) {
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query("select pg_advisory_lock(727001)"); // one migrator at a time
    await client.query(`
      create schema if not exists private;
      revoke all on schema private from public;
      create table if not exists private.schema_migrations (
        name text primary key, applied_at timestamptz not null default now())`);
    const done = new Set((await client.query("select name from private.schema_migrations")).rows.map((r) => r.name));
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    let ran = 0;
    for (const f of files) {
      if (done.has(f)) continue;
      log(`Applying ${f}`);
      try {
        await client.query(fs.readFileSync(path.join(dir, f), "utf8"));
      } catch (e) {
        await client.query("rollback").catch(() => {});
        throw new Error(`${f} failed: ${e.message}`);
      }
      await client.query("insert into private.schema_migrations (name) values ($1)", [f]);
      ran++;
    }
    log(ran ? `Applied ${ran} migration(s).` : "Database is up to date.");
  } finally {
    await client.query("select pg_advisory_unlock(727001)").catch(() => {});
    await client.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  migrate().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
