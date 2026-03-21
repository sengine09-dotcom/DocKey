-- CreateTable
CREATE TABLE `tblMonitor` (
    `MonitorID` VARCHAR(10) NOT NULL,
    `isCancel` VARCHAR(1) NULL,
    `IssDate` DATETIME(3) NULL,
    `CustomerID` VARCHAR(5) NULL,
    `SupplierID` VARCHAR(3) NULL,
    `TermID` VARCHAR(3) NULL,
    `PoNo` VARCHAR(50) NULL,
    `PoDate` DATETIME(3) NULL,
    `ReqDate` DATETIME(3) NULL,
    `EUserID` VARCHAR(3) NULL,
    `DestinationID` VARCHAR(3) NULL,
    `TotalQuantity` DECIMAL(18, 2) NULL,
    `TotalAmount` DECIMAL(19, 4) NULL,
    `isArranged` VARCHAR(1) NULL,
    `Remark` VARCHAR(300) NULL,
    `Status` INTEGER NULL,
    `Vat` INTEGER NOT NULL,

    PRIMARY KEY (`MonitorID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tblMonitorDetail` (
    `MDID` INTEGER NOT NULL AUTO_INCREMENT,
    `IDMonitor` VARCHAR(10) NOT NULL,
    `Item` INTEGER NULL,
    `ProductID` VARCHAR(5) NOT NULL,
    `Quantity` DECIMAL(18, 3) NULL,
    `UnitCount` VARCHAR(3) NULL,
    `Price` DECIMAL(10, 3) NULL,
    `Total` DECIMAL(18, 3) NULL,
    `SupplierID` VARCHAR(10) NULL,

    INDEX `tblMonitorDetail_IDMonitor_idx`(`IDMonitor`),
    PRIMARY KEY (`MDID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tblInvoice` (
    `InvoiceNo` VARCHAR(8) NOT NULL,
    `CodeNo` VARCHAR(20) NULL,
    `IDMonitor` VARCHAR(8) NOT NULL,
    `isCancel` VARCHAR(1) NULL,
    `InvDate` DATETIME(3) NULL,
    `PoNo` VARCHAR(50) NULL,
    `DoNo` VARCHAR(255) NULL,
    `CustomerID` VARCHAR(10) NULL,
    `AgentID` VARCHAR(5) NULL,
    `SupplierID` VARCHAR(3) NULL,
    `TermID` VARCHAR(10) NULL,
    `TransportID` VARCHAR(10) NULL,
    `Period` INTEGER NULL,
    `DestinationID` VARCHAR(10) NULL,
    `eUserID` VARCHAR(10) NULL,
    `TotalContainer` DECIMAL(18, 0) NULL,
    `TotalAmount` DECIMAL(19, 4) NULL,
    `TotalQuantity` DECIMAL(18, 2) NULL,
    `ComRate` DECIMAL(19, 4) NULL,
    `Remark` VARCHAR(255) NULL,
    `Vat` INTEGER NOT NULL,
    `StatusOnline` INTEGER NOT NULL,

    PRIMARY KEY (`InvoiceNo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tblInvoiceDetail` (
    `IID` INTEGER NOT NULL AUTO_INCREMENT,
    `InvoiceNo` VARCHAR(8) NOT NULL,
    `Item` VARCHAR(2) NULL,
    `ProductID` VARCHAR(5) NOT NULL,
    `Quantity` DECIMAL(18, 3) NULL,
    `Weight` DECIMAL(18, 3) NULL,
    `Price` DECIMAL(10, 3) NULL,
    `UnitID` VARCHAR(3) NULL,
    `Total` DECIMAL(18, 3) NULL,
    `SupplierID` VARCHAR(10) NULL,
    `ComRate` DECIMAL(18, 2) NULL,
    `Bag` INTEGER NULL,

    INDEX `tblInvoiceDetail_InvoiceNo_idx`(`InvoiceNo`),
    PRIMARY KEY (`IID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tblMonitorDetail` ADD CONSTRAINT `tblMonitorDetail_IDMonitor_fkey` FOREIGN KEY (`IDMonitor`) REFERENCES `tblMonitor`(`MonitorID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tblInvoiceDetail` ADD CONSTRAINT `tblInvoiceDetail_InvoiceNo_fkey` FOREIGN KEY (`InvoiceNo`) REFERENCES `tblInvoice`(`InvoiceNo`) ON DELETE RESTRICT ON UPDATE CASCADE;
