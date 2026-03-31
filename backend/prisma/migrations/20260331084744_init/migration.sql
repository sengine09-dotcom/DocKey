-- CreateTable
CREATE TABLE `User` (
    `id` CHAR(26) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'user',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `CustomerID` VARCHAR(6) NOT NULL,
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

    INDEX `Customer_CustomerID_idx`(`CustomerID`),
    UNIQUE INDEX `Customer_CustomerID_key`(`CustomerID`),
    PRIMARY KEY (`CustomerID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `ProductId` VARCHAR(6) NOT NULL,
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

    INDEX `Product_ProductId_idx`(`ProductId`),
    UNIQUE INDEX `Product_ProductId_key`(`ProductId`),
    PRIMARY KEY (`ProductId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Destination` (
    `DestID` VARCHAR(6) NOT NULL,
    `Destination` VARCHAR(50) NULL,
    `Location` VARCHAR(50) NULL,
    `Used` VARCHAR(1) NULL,

    PRIMARY KEY (`DestID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentTerm` (
    `TermID` VARCHAR(6) NOT NULL,
    `TermName` VARCHAR(50) NULL,
    `ShortName` VARCHAR(20) NULL,
    `Days` VARCHAR(3) NULL,
    `Used` VARCHAR(1) NULL,

    PRIMARY KEY (`TermID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `DocumentID` CHAR(26) NOT NULL,
    `DocumentType` ENUM('QUOTATION', 'INVOICE', 'RECEIPT', 'PURCHASE_ORDER', 'WORK_ORDER') NOT NULL,
    `DocumentNumber` VARCHAR(50) NOT NULL,
    `LegacySourceId` VARCHAR(50) NULL,
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
    UNIQUE INDEX `Document_DocumentType_LegacySourceId_key`(`DocumentType`, `LegacySourceId`),
    PRIMARY KEY (`DocumentID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentItem` (
    `DocumentItemID` CHAR(26) NOT NULL,
    `DocumentID` CHAR(26) NOT NULL,
    `LineNo` INTEGER NOT NULL,
    `ProductID` VARCHAR(10) NULL,
    `Description` VARCHAR(500) NULL,
    `Cost` DECIMAL(19, 4) NULL,
    `Quantity` DECIMAL(19, 4) NULL,
    `Margin` DECIMAL(19, 4) NULL,
    `SellingPrice` DECIMAL(19, 4) NULL,
    `TotalCost` DECIMAL(19, 4) NULL,
    `TotalSellingPrice` DECIMAL(19, 4) NULL,
    `UnitID` VARCHAR(10) NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    INDEX `DocumentItem_DocumentID_LineNo_idx`(`DocumentID`, `LineNo`),
    UNIQUE INDEX `DocumentItem_DocumentItemID_key`(`DocumentItemID`),
    PRIMARY KEY (`DocumentItemID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuotationDocument` (
    `DocumentID` CHAR(26) NOT NULL,
    `ValidUntil` DATETIME(3) NULL,
    `AttentionTo` VARCHAR(255) NULL,

    PRIMARY KEY (`DocumentID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvoiceDocument` (
    `DocumentID` CHAR(26) NOT NULL,
    `DueDate` DATETIME(3) NULL,
    `DoNo` VARCHAR(255) NULL,
    `MonitorReference` VARCHAR(20) NULL,
    `StatusOnline` INTEGER NULL,
    `LegacyInvoiceNo` VARCHAR(50) NULL,

    PRIMARY KEY (`DocumentID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReceiptDocument` (
    `DocumentID` CHAR(26) NOT NULL,
    `ReceivedDate` DATETIME(3) NULL,
    `PaymentReference` VARCHAR(100) NULL,

    PRIMARY KEY (`DocumentID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseOrderDocument` (
    `DocumentID` CHAR(26) NOT NULL,
    `SupplierName` VARCHAR(255) NULL,
    `DeliveryDate` DATETIME(3) NULL,

    PRIMARY KEY (`DocumentID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkOrderDocument` (
    `DocumentID` CHAR(26) NOT NULL,
    `ScheduledDate` DATETIME(3) NULL,
    `AssignedTo` VARCHAR(255) NULL,

    PRIMARY KEY (`DocumentID`)
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
ALTER TABLE `DocumentItem` ADD CONSTRAINT `DocumentItem_DocumentID_fkey` FOREIGN KEY (`DocumentID`) REFERENCES `Document`(`DocumentID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuotationDocument` ADD CONSTRAINT `QuotationDocument_DocumentID_fkey` FOREIGN KEY (`DocumentID`) REFERENCES `Document`(`DocumentID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceDocument` ADD CONSTRAINT `InvoiceDocument_DocumentID_fkey` FOREIGN KEY (`DocumentID`) REFERENCES `Document`(`DocumentID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReceiptDocument` ADD CONSTRAINT `ReceiptDocument_DocumentID_fkey` FOREIGN KEY (`DocumentID`) REFERENCES `Document`(`DocumentID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderDocument` ADD CONSTRAINT `PurchaseOrderDocument_DocumentID_fkey` FOREIGN KEY (`DocumentID`) REFERENCES `Document`(`DocumentID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrderDocument` ADD CONSTRAINT `WorkOrderDocument_DocumentID_fkey` FOREIGN KEY (`DocumentID`) REFERENCES `Document`(`DocumentID`) ON DELETE CASCADE ON UPDATE CASCADE;
