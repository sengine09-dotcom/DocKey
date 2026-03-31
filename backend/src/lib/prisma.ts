import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import type { PrismaClient as PrismaClientType } from '@prisma/client';

const prismaClientCandidates = [
  path.resolve(__dirname, '../../../node_modules/.prisma/client'),
  path.resolve(__dirname, '../../node_modules/.prisma/client'),
];

const prismaClientModulePath = prismaClientCandidates.find((candidatePath) => fs.existsSync(candidatePath));

if (!prismaClientModulePath) {
  throw new Error('Unable to locate generated Prisma client module.');
}

const { PrismaClient } = require(prismaClientModulePath) as {
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
