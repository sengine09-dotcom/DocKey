-- CreateTable
CREATE TABLE `AdminInitToken` (
    `id` CHAR(26) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(255) NULL,
    `customerEmail` VARCHAR(191) NULL,
    `description` VARCHAR(255) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `expiresAt` DATETIME(3) NULL,
    `usedAt` DATETIME(3) NULL,
    `usedByEmail` VARCHAR(191) NULL,
    `lastSeenAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdminInitToken_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
