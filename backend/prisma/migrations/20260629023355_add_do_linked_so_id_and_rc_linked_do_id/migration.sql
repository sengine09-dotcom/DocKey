-- AlterTable
ALTER TABLE `DeliveryOrderDocument` ADD COLUMN `LinkedSOId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ReceiptDocument` ADD COLUMN `LinkedDOId` VARCHAR(26) NULL;
