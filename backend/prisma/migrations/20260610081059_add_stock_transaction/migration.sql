-- AlterTable
ALTER TABLE `Document` MODIFY `DocumentType` ENUM('QUOTATION', 'INVOICE', 'RECEIPT', 'DEPOSIT_RECEIPT', 'PURCHASE_ORDER', 'WORK_ORDER', 'DELIVERY_ORDER', 'CUSTOMER_RETURN') NOT NULL;

-- AlterTable
ALTER TABLE `DocumentItem` MODIFY `DocumentType` ENUM('QUOTATION', 'INVOICE', 'RECEIPT', 'DEPOSIT_RECEIPT', 'PURCHASE_ORDER', 'WORK_ORDER', 'DELIVERY_ORDER', 'CUSTOMER_RETURN') NOT NULL;

-- CreateTable
CREATE TABLE `DeliveryOrderDocument` (
    `ID` CHAR(26) NOT NULL,
    `DocumentNumber` CHAR(26) NOT NULL,
    `QuotationId` VARCHAR(26) NULL,
    `QuotationNumber` VARCHAR(50) NULL,

    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerReturnDocument` (
    `ID` CHAR(26) NOT NULL,
    `DocumentNumber` CHAR(26) NOT NULL,
    `RefDocNumber` VARCHAR(50) NULL,

    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockTransaction` (
    `ID` VARCHAR(26) NOT NULL,
    `ProductID` VARCHAR(26) NOT NULL,
    `ProductCode` VARCHAR(50) NOT NULL,
    `CompanyID` VARCHAR(191) NOT NULL,
    `DocNumber` VARCHAR(50) NOT NULL,
    `DocType` VARCHAR(30) NOT NULL,
    `DocID` VARCHAR(191) NULL,
    `Type` ENUM('IN', 'OUT', 'INIT') NOT NULL,
    `QtyChange` DECIMAL(18, 2) NOT NULL,
    `CreatedBy` VARCHAR(255) NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StockTransaction_CompanyID_ProductCode_idx`(`CompanyID`, `ProductCode`),
    INDEX `StockTransaction_CompanyID_DocType_DocNumber_idx`(`CompanyID`, `DocType`, `DocNumber`),
    INDEX `StockTransaction_ProductID_idx`(`ProductID`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DeliveryOrderDocument` ADD CONSTRAINT `DeliveryOrderDocument_ID_fkey` FOREIGN KEY (`ID`) REFERENCES `Document`(`ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerReturnDocument` ADD CONSTRAINT `CustomerReturnDocument_ID_fkey` FOREIGN KEY (`ID`) REFERENCES `Document`(`ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockTransaction` ADD CONSTRAINT `StockTransaction_ProductID_fkey` FOREIGN KEY (`ProductID`) REFERENCES `Product`(`ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockTransaction` ADD CONSTRAINT `StockTransaction_CompanyID_fkey` FOREIGN KEY (`CompanyID`) REFERENCES `Company`(`ID`) ON DELETE RESTRICT ON UPDATE CASCADE;
