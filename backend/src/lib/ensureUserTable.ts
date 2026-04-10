import { prisma } from './prisma';

let userTableReady = false;

export const ensureUserTableExists = async () => {
  if (userTableReady) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`User\` (
      id CHAR(26) NOT NULL,
      email VARCHAR(191) NOT NULL,
      password VARCHAR(191) NOT NULL,
      name VARCHAR(191) NOT NULL,
      role VARCHAR(191) NOT NULL DEFAULT 'user',
      companyId VARCHAR(191) NULL,
      tokenId VARCHAR(191) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL,
      UNIQUE INDEX \`User_email_key\` (email),
      INDEX \`User_email_idx\` (email),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  userTableReady = true;
};