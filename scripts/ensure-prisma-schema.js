/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file if available
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    if (!process.env[k]) {
      process.env[k] = envConfig[k];
    }
  }
}

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
if (fs.existsSync(schemaPath)) {
  let schema = fs.readFileSync(schemaPath, 'utf8');
  const dbUrl = (process.env.DATABASE_URL || '').trim();
  const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

  const newDatasource = isPostgres
    ? `datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}`
    : `datasource db {\n  provider = "sqlite"\n  url      = "file:../db/custom.db"\n}`;

  const updatedSchema = schema.replace(/datasource db\s*\{[\s\S]*?\}/, newDatasource);
  if (updatedSchema !== schema) {
    fs.writeFileSync(schemaPath, updatedSchema, 'utf8');
    console.log(`[prisma] Adjusted datasource provider to ${isPostgres ? 'postgresql (Supabase)' : 'sqlite (local)'}`);
  }
}
