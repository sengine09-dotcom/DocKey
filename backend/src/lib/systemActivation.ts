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

export const ensureSystemActivationTableExists = async () => {
  if (systemActivationTableReady) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS tblSystemActivation (
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

  systemActivationTableReady = true;
};

export const getStoredSystemActivation = async () => {
  await ensureSystemActivationTableExists();

  const rows = await prisma.$queryRawUnsafe<SystemActivationRow[]>(`
    SELECT id, adminToken, adminEmail, activatedAt, createdAt, updatedAt
    FROM tblSystemActivation
    ORDER BY activatedAt DESC
    LIMIT 1
  `);

  return rows[0] || null;
};

export const saveSystemActivation = async (adminToken: string, adminEmail: string) => {
  await ensureSystemActivationTableExists();

  await prisma.$transaction([
    prisma.$executeRawUnsafe(`DELETE FROM tblSystemActivation`),
    prisma.$executeRawUnsafe(
      `
        INSERT INTO tblSystemActivation (id, adminToken, adminEmail, activatedAt, createdAt, updatedAt)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
      `,
      ulid(),
      adminToken,
      adminEmail || null
    ),
  ]);
};

export const clearSystemActivation = async () => {
  await ensureSystemActivationTableExists();
  await prisma.$executeRawUnsafe(`DELETE FROM tblSystemActivation`);
};