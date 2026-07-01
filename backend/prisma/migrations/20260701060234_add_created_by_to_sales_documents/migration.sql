-- AlterTable
ALTER TABLE `DepositInvoiceDocument` ADD COLUMN `CreatedBy` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `DepositReceiptDocument` ADD COLUMN `CreatedBy` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `InvoiceDocument` ADD COLUMN `CreatedBy` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `ReceiptDocument` ADD COLUMN `CreatedBy` VARCHAR(255) NULL;
