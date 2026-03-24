import 'dotenv/config';
import path from 'path';
import type { PrismaClient as PrismaClientType } from '../generated/prisma';

const { PrismaClient } = require(path.resolve(__dirname, '../../src/generated/prisma')) as {
  PrismaClient: typeof PrismaClientType;
};

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientType };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}