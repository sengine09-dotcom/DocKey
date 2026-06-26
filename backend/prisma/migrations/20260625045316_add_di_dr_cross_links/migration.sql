-- AlterTable
ALTER TABLE `DepositInvoiceDocument` ADD COLUMN `LinkedDRId` VARCHAR(26) NULL,
    ADD COLUMN `LinkedDRNumber` VARCHAR(50) NULL;

-- AlterTable
ALTER TABLE `DepositReceiptDocument` ADD COLUMN `LinkedDIId` VARCHAR(26) NULL,
    ADD COLUMN `LinkedDINumber` VARCHAR(50) NULL;
