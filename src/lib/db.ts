import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// Ensure .env is read directly if DATABASE_URL was overridden or not correctly formatted
if (typeof window === 'undefined') {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
      if (match && match[1] && (match[1].startsWith('postgres://') || match[1].startsWith('postgresql://') || match[1].startsWith('file:'))) {
        process.env.DATABASE_URL = match[1].trim();
      }
    }
  } catch (e) {
    // ignore
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prismaClient: PrismaClient;
try {
  prismaClient =
    globalForPrisma.prisma ??
    new PrismaClient({
      datasources: process.env.DATABASE_URL
        ? {
            db: {
              url: process.env.DATABASE_URL,
            },
          }
        : undefined,
      log: ['error', 'warn'],
    });
} catch (e) {
  console.error('[AI Studio] PrismaClient initialization error:', e);
  throw e;
}

export const db: PrismaClient = prismaClient;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
