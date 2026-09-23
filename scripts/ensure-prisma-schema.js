/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file if available, prioritizing .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
if (fs.existsSync(schemaPath)) {
  let schema = fs.readFileSync(schemaPath, 'utf8');
  const dbUrl = (process.env.DATABASE_URL || '').trim();
  const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');
  // This project is deployed against Supabase Postgres. Silently falling
  // back to a local SQLite file whenever DATABASE_URL happens to be unset
  // (e.g. a local `bun install` run without a .env) previously caused the
  // committed schema.prisma to regress to sqlite and get pushed to git,
  // breaking login/register in production. SQLite is now opt-in only, via
  // USE_SQLITE_LOCAL=1 — everything else requires a real DATABASE_URL.
  const allowSqliteFallback = process.env.USE_SQLITE_LOCAL === '1';

  if (!isPostgres && !allowSqliteFallback) {
    console.error(
      '[prisma] DATABASE_URL is not set to a postgres:// URL.\n' +
      '  This project targets Supabase Postgres — refusing to write a sqlite datasource.\n' +
      '  Set DATABASE_URL in your .env, or set USE_SQLITE_LOCAL=1 to explicitly opt into local SQLite.'
    );
    process.exit(1);
  }

  const newDatasource = isPostgres
    ? `datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}`
    : `datasource db {\n  provider = "sqlite"\n  url      = "file:../db/custom.db"\n}`;

  const updatedSchema = schema.replace(/datasource db\s*\{[\s\S]*?\}/, newDatasource);
  if (updatedSchema !== schema) {
    fs.writeFileSync(schemaPath, updatedSchema, 'utf8');
    console.log(`[prisma] Adjusted datasource provider to ${isPostgres ? 'postgresql (Supabase)' : 'sqlite (local, USE_SQLITE_LOCAL=1)'}`);
  }
}
