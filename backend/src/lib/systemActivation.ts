import { ulid } from 'ulid';
import { prisma } from './prisma';

type SystemActivationRow = {
  id: string;
  adminToken: string;
  adminEmail: string | null;
  activatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

let systemActivationTableReady = false;

const isMissingSystemActivationTableError = (error: any) => {
  const prismaCode = String(error?.code || error?.meta?.code || '').trim();
  const message = String(error?.message || '').toLowerCase();
  return prismaCode === '1146' || message.includes("systemactivation") && message.includes("doesn't exist");
};

const createSystemActivationTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS SystemActivation (
      id CHAR(26) NOT NULL,
      adminToken VARCHAR(191) NOT NULL,
      adminEmail VARCHAR(191) NULL,
      activatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE INDEX tblSystemActivation_adminToken_key (adminToken),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);
};

const withSystemActivationTable = async <T>(operation: () => Promise<T>) => {
  await ensureSystemActivationTableExists();

  try {
    return await operation();
  } catch (error: any) {
    if (!isMissingSystemActivationTableError(error)) {
      throw error;
    }

    systemActivationTableReady = false;
    await ensureSystemActivationTableExists(true);
    return operation();
  }
};

export const ensureSystemActivationTableExists = async (force = false) => {
  if (systemActivationTableReady && !force) {
    return;
  }

  await createSystemActivationTable();
  systemActivationTableReady = true;
};

export const getStoredSystemActivation = async () => {
  const rows = await withSystemActivationTable(() => prisma.$queryRawUnsafe<SystemActivationRow[]>(`
      SELECT id, adminToken, adminEmail, activatedAt, createdAt, updatedAt
      FROM SystemActivation
      ORDER BY activatedAt DESC
      LIMIT 1
    `));

  return rows[0] || null;
};

export const saveSystemActivation = async (adminToken: string, adminEmail: string) => {
  await withSystemActivationTable(() => prisma.$transaction([
      prisma.$executeRawUnsafe(`DELETE FROM SystemActivation`),
      prisma.$executeRawUnsafe(
        `
          INSERT INTO SystemActivation (id, adminToken, adminEmail, activatedAt, createdAt, updatedAt)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
        `,
        ulid(),
        adminToken,
        adminEmail || null
      ),
    ]));
};

export const clearSystemActivation = async () => {
  await withSystemActivationTable(() => prisma.$executeRawUnsafe(`DELETE FROM SystemActivation`));
};