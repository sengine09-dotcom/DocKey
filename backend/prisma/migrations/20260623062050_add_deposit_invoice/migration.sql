-- AlterTable
ALTER TABLE `DepositReceiptDocument` ADD COLUMN `LinkedSOId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Document` MODIFY `DocumentType` ENUM('QUOTATION', 'INVOICE', 'RECEIPT', 'DEPOSIT_RECEIPT', 'DEPOSIT_INVOICE', 'PURCHASE_ORDER', 'WORK_ORDER', 'DELIVERY_ORDER', 'CUSTOMER_RETURN') NOT NULL;

-- AlterTable
ALTER TABLE `DocumentItem` MODIFY `DocumentType` ENUM('QUOTATION', 'INVOICE', 'RECEIPT', 'DEPOSIT_RECEIPT', 'DEPOSIT_INVOICE', 'PURCHASE_ORDER', 'WORK_ORDER', 'DELIVERY_ORDER', 'CUSTOMER_RETURN') NOT NULL;

-- AlterTable
ALTER TABLE `InvoiceDocument` ADD COLUMN `LinkedDepositReceiptId` VARCHAR(26) NULL,
    ADD COLUMN `LinkedSOId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ReceiptDocument` ADD COLUMN `DepositAmountDeducted` DECIMAL(19, 4) NULL,
    ADD COLUMN `LinkedDepositReceiptId` VARCHAR(26) NULL,
    ADD COLUMN `LinkedSOId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `DepositInvoiceDocument` (
    `DocumentID` CHAR(26) NOT NULL,
    `DocumentNumber` CHAR(26) NOT NULL,
    `LinkedQuotationId` VARCHAR(26) NULL,
    `LinkedSOId` VARCHAR(191) NULL,
    `DepositPercentage` DECIMAL(5, 2) NOT NULL,
    `DepositAmount` DECIMAL(19, 4) NOT NULL,
    `BalanceAmount` DECIMAL(19, 4) NOT NULL,

    PRIMARY KEY (`DocumentID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DepositInvoiceDocument` ADD CONSTRAINT `DepositInvoiceDocument_DocumentID_fkey` FOREIGN KEY (`DocumentID`) REFERENCES `Document`(`ID`) ON DELETE CASCADE ON UPDATE CASCADE;
