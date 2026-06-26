-- AlterTable
ALTER TABLE `InvoiceDocument` ADD COLUMN `CustomerBranch` VARCHAR(100) NULL,
    ADD COLUMN `CustomerTaxId` VARCHAR(20) NULL,
    ADD COLUMN `PaymentStatus` VARCHAR(20) NOT NULL DEFAULT 'PENDING';
