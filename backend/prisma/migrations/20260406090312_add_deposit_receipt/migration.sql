-- AlterTable
ALTER TABLE `Document` MODIFY `DocumentType` ENUM('QUOTATION', 'INVOICE', 'RECEIPT', 'DEPOSIT_RECEIPT', 'PURCHASE_ORDER', 'WORK_ORDER') NOT NULL;

-- AlterTable
ALTER TABLE `DocumentItem` MODIFY `DocumentType` ENUM('QUOTATION', 'INVOICE', 'RECEIPT', 'DEPOSIT_RECEIPT', 'PURCHASE_ORDER', 'WORK_ORDER') NOT NULL;

-- CreateTable
CREATE TABLE `DepositReceiptDocument` (
    `ID` CHAR(26) NOT NULL,
    `DocumentNumber` CHAR(26) NOT NULL,
    `ReceivedDate` DATETIME(3) NULL,
    `PaymentReference` VARCHAR(100) NULL,
    `PaymentAmount` DECIMAL(19, 4) NULL,
    `PaymentType` VARCHAR(30) NULL,
    `LinkedQuotationId` VARCHAR(26) NULL,
    `LinkedQuotationNumber` VARCHAR(50) NULL,

    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DepositReceiptDocument` ADD CONSTRAINT `DepositReceiptDocument_ID_fkey` FOREIGN KEY (`ID`) REFERENCES `Document`(`ID`) ON DELETE CASCADE ON UPDATE CASCADE;
