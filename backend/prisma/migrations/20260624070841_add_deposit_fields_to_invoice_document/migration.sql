-- AlterTable
ALTER TABLE `InvoiceDocument` ADD COLUMN `DepositAmountDeducted` DECIMAL(19, 4) NULL,
    ADD COLUMN `LinkedDepositReceiptNumber` VARCHAR(50) NULL;
