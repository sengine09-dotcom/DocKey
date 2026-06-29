-- AlterTable
ALTER TABLE `DeliveryOrderDocument` ADD COLUMN `CompanyID` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `DeliveryOrderDocument_CompanyID_LinkedSOId_idx` ON `DeliveryOrderDocument`(`CompanyID`, `LinkedSOId`);
