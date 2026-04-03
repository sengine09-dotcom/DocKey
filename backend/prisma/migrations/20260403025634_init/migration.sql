-- CreateTable
CREATE TABLE `User` (
    `ID` CHAR(26) NOT NULL,
    `Email` VARCHAR(191) NOT NULL,
    `Password` VARCHAR(255) NOT NULL,
    `Name` VARCHAR(255) NOT NULL,
    `Role` VARCHAR(50) NOT NULL DEFAULT 'user',
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_Email_key`(`Email`),
    INDEX `User_Email_idx`(`Email`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `ID` VARCHAR(6) NOT NULL,
    `CustomerCode` VARCHAR(50) NOT NULL,
    `CustomerName` VARCHAR(255) NOT NULL,
    `ContactName` VARCHAR(255) NULL,
    `Phone` VARCHAR(50) NULL,
    `Email` VARCHAR(100) NULL,
    `Address` TEXT NULL,
    `TaxID` VARCHAR(50) NULL,
    `Branch` VARCHAR(50) NULL,
    `Used` VARCHAR(1) NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    INDEX `Customer_ID_idx`(`ID`),
    UNIQUE INDEX `Customer_ID_key`(`ID`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `ID` VARCHAR(6) NOT NULL,
    `ProductCode` VARCHAR(50) NOT NULL,
    `ProductName` VARCHAR(255) NOT NULL,
    `Category` VARCHAR(255) NOT NULL,
    `Brand` VARCHAR(255) NOT NULL,
    `Model` VARCHAR(255) NULL,
    `Price` DECIMAL(19, 4) NOT NULL,
    `Cost` DECIMAL(19, 4) NULL,
    `StockQty` INTEGER NOT NULL DEFAULT 0,
    `MinQty` INTEGER NOT NULL DEFAULT 0,
    `MaxQty` INTEGER NOT NULL DEFAULT 0,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    INDEX `Product_ID_idx`(`ID`),
    UNIQUE INDEX `Product_ID_key`(`ID`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Destination` (
    `ID` VARCHAR(6) NOT NULL,
    `DestinationCode` VARCHAR(50) NOT NULL,
    `Destination` VARCHAR(50) NULL,
    `Location` VARCHAR(50) NULL,
    `Used` VARCHAR(1) NULL,

    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentTerm` (
    `ID` VARCHAR(6) NOT NULL,
    `TermCode` VARCHAR(50) NOT NULL,
    `TermName` VARCHAR(50) NULL,
    `ShortName` VARCHAR(20) NULL,
    `Days` VARCHAR(3) NULL,
    `Used` VARCHAR(1) NULL,

    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `ID` CHAR(26) NOT NULL,
    `DocumentType` ENUM('QUOTATION', 'INVOICE', 'RECEIPT', 'PURCHASE_ORDER', 'WORK_ORDER') NOT NULL,
    `DocumentNumber` VARCHAR(50) NOT NULL,
    `Title` VARCHAR(255) NULL,
    `DocumentDate` DATETIME(3) NULL,
    `CustomerID` VARCHAR(10) NULL,
    `BillTo` VARCHAR(255) NULL,
    `ShipTo` VARCHAR(255) NULL,
    `DestinationID` VARCHAR(10) NULL,
    `PaymentTermID` VARCHAR(10) NULL,
    `PaymentMethod` VARCHAR(100) NULL,
    `ReferenceNo` VARCHAR(100) NULL,
    `Status` VARCHAR(30) NULL,
    `Remark` VARCHAR(500) NULL,
    `TotalCost` DECIMAL(19, 4) NULL,
    `TotalSellingPrice` DECIMAL(19, 4) NULL,
    `TotalProfit` DECIMAL(19, 4) NULL,
    `Margin` DECIMAL(19, 4) NULL,
    `TaxRate` DECIMAL(10, 4) NULL,
    `TaxAmount` DECIMAL(19, 4) NULL,
    `TotalAmount` DECIMAL(19, 4) NULL,
    `TotalQuantity` DECIMAL(18, 2) NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    INDEX `Document_DocumentType_DocumentDate_idx`(`DocumentType`, `DocumentDate`),
    UNIQUE INDEX `Document_DocumentType_DocumentNumber_key`(`DocumentType`, `DocumentNumber`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentItem` (
    `ID` CHAR(26) NOT NULL,
    `DocumentNumber` CHAR(26) NOT NULL,
    `DocumentType` ENUM('QUOTATION', 'INVOICE', 'RECEIPT', 'PURCHASE_ORDER', 'WORK_ORDER') NOT NULL,
    `LineNo` INTEGER NOT NULL,
    `ProductID` VARCHAR(10) NULL,
    `Cost` DECIMAL(19, 4) NULL,
    `Quantity` DECIMAL(19, 4) NULL,
    `Margin` DECIMAL(19, 4) NULL,
    `SellingPrice` DECIMAL(19, 4) NULL,
    `TotalCost` DECIMAL(19, 4) NULL,
    `TotalSellingPrice` DECIMAL(19, 4) NULL,
    `UnitID` VARCHAR(10) NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    INDEX `DocumentItem_DocumentNumber_LineNo_DocumentType_idx`(`DocumentNumber`, `LineNo`, `DocumentType`),
    UNIQUE INDEX `DocumentItem_ID_DocumentType_DocumentNumber_LineNo_key`(`ID`, `DocumentType`, `DocumentNumber`, `LineNo`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuotationDocument` (
    `ID` CHAR(26) NOT NULL,
    `DocumentNumber` CHAR(26) NOT NULL,
    `AttentionTo` VARCHAR(255) NULL,
    `LinkedInvoiceId` VARCHAR(26) NULL,
    `LinkedInvoiceNumber` VARCHAR(50) NULL,

    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvoiceDocument` (
    `ID` CHAR(26) NOT NULL,
    `DocumentNumber` CHAR(26) NOT NULL,
    `DueDate` DATETIME(3) NULL,
    `DoNo` VARCHAR(255) NULL,
    `LinkedQuotationId` VARCHAR(26) NULL,
    `LinkedQuotationNumber` VARCHAR(50) NULL,
    `LinkedReceiptId` VARCHAR(26) NULL,
    `LinkedReceiptNumber` VARCHAR(50) NULL,

    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReceiptDocument` (
    `ID` CHAR(26) NOT NULL,
    `DocumentNumber` CHAR(26) NOT NULL,
    `ReceivedDate` DATETIME(3) NULL,
    `PaymentReference` VARCHAR(100) NULL,

    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseOrderDocument` (
    `ID` CHAR(26) NOT NULL,
    `DocumentNumber` CHAR(26) NOT NULL,
    `SupplierName` VARCHAR(255) NULL,
    `DeliveryDate` DATETIME(3) NULL,

    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkOrderDocument` (
    `ID` CHAR(26) NOT NULL,
    `DocumentNumber` CHAR(26) NOT NULL,
    `ScheduledDate` DATETIME(3) NULL,
    `AssignedTo` VARCHAR(255) NULL,

    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemActivation` (
    `ID` CHAR(26) NOT NULL,
    `AdminToken` VARCHAR(191) NOT NULL,
    `AdminEmail` VARCHAR(191) NULL,
    `ActivatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SystemActivation_AdminToken_key`(`AdminToken`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DocumentItem` ADD CONSTRAINT `DocumentItem_ID_fkey` FOREIGN KEY (`ID`) REFERENCES `Document`(`ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentItem` ADD CONSTRAINT `DocumentItem_ProductID_fkey` FOREIGN KEY (`ProductID`) REFERENCES `Product`(`ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuotationDocument` ADD CONSTRAINT `QuotationDocument_ID_fkey` FOREIGN KEY (`ID`) REFERENCES `Document`(`ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceDocument` ADD CONSTRAINT `InvoiceDocument_ID_fkey` FOREIGN KEY (`ID`) REFERENCES `Document`(`ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReceiptDocument` ADD CONSTRAINT `ReceiptDocument_ID_fkey` FOREIGN KEY (`ID`) REFERENCES `Document`(`ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderDocument` ADD CONSTRAINT `PurchaseOrderDocument_ID_fkey` FOREIGN KEY (`ID`) REFERENCES `Document`(`ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrderDocument` ADD CONSTRAINT `WorkOrderDocument_ID_fkey` FOREIGN KEY (`ID`) REFERENCES `Document`(`ID`) ON DELETE CASCADE ON UPDATE CASCADE;
