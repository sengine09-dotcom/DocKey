-- CreateTable
CREATE TABLE `PurchaseRequisition` (
    `ID` VARCHAR(191) NOT NULL,
    `PRNumber` VARCHAR(50) NOT NULL,
    `Title` VARCHAR(255) NOT NULL,
    `RequestedBy` VARCHAR(255) NULL,
    `VendorCode` VARCHAR(50) NULL,
    `RequiredDate` DATETIME(3) NULL,
    `Status` VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    `Remark` VARCHAR(500) NULL,
    `ApprovedBy` VARCHAR(255) NULL,
    `ApprovedAt` DATETIME(3) NULL,
    `RejectedBy` VARCHAR(255) NULL,
    `RejectedAt` DATETIME(3) NULL,
    `RejectReason` VARCHAR(500) NULL,
    `CompanyID` VARCHAR(191) NOT NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    INDEX `PurchaseRequisition_CompanyID_idx`(`CompanyID`),
    UNIQUE INDEX `PurchaseRequisition_CompanyID_PRNumber_key`(`CompanyID`, `PRNumber`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PRItem` (
    `ID` VARCHAR(191) NOT NULL,
    `PRID` VARCHAR(191) NOT NULL,
    `LineNo` INTEGER NOT NULL,
    `ProductCode` VARCHAR(50) NULL,
    `Description` VARCHAR(255) NOT NULL,
    `Qty` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `Unit` VARCHAR(50) NULL,
    `EstimatedPrice` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `Remark` VARCHAR(255) NULL,

    INDEX `PRItem_PRID_idx`(`PRID`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PurchaseRequisition` ADD CONSTRAINT `PurchaseRequisition_CompanyID_fkey` FOREIGN KEY (`CompanyID`) REFERENCES `Company`(`ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PRItem` ADD CONSTRAINT `PRItem_PRID_fkey` FOREIGN KEY (`PRID`) REFERENCES `PurchaseRequisition`(`ID`) ON DELETE CASCADE ON UPDATE CASCADE;
