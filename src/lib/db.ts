import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const noOp = {
  findMany: async () => [],
  findFirst: async () => null,
  findUnique: async () => null,
  create: async (d: any) => d?.data ?? {},
  update: async (d: any) => d?.data ?? {},
  delete: async () => ({}),
  deleteMany: async () => ({ count: 0 }),
  count: async () => 0,
  aggregate: async () => ({ _sum: {}, _avg: {}, _count: 0 }),
  groupBy: async () => [],
  upsert: async (d: any) => d?.create ?? {},
};

let prismaClient: any;
try {
  prismaClient =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: ['error', 'warn'],
    });
} catch {
  console.warn('[AI Studio] Database not connected — using mock');
  prismaClient = new Proxy({}, {
    get: () => new Proxy(noOp, {
      get: (target: any, prop: string) => target[prop] ?? (async () => null),
    }),
  });
}

export const db: PrismaClient = prismaClient;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
