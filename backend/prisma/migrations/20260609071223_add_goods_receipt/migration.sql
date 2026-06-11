-- CreateTable
CREATE TABLE `GoodsReceipt` (
    `ID` VARCHAR(191) NOT NULL,
    `GRNumber` VARCHAR(50) NOT NULL,
    `POID` VARCHAR(26) NOT NULL,
    `PONumber` VARCHAR(50) NOT NULL,
    `VendorCode` VARCHAR(50) NULL,
    `ReceivedDate` DATETIME(3) NULL,
    `Status` VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    `Remark` VARCHAR(500) NULL,
    `ReceivedBy` VARCHAR(255) NULL,
    `ConfirmedBy` VARCHAR(255) NULL,
    `ConfirmedAt` DATETIME(3) NULL,
    `CompanyID` VARCHAR(191) NOT NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    INDEX `GoodsReceipt_CompanyID_idx`(`CompanyID`),
    UNIQUE INDEX `GoodsReceipt_CompanyID_GRNumber_key`(`CompanyID`, `GRNumber`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GRItem` (
    `ID` VARCHAR(191) NOT NULL,
    `GRID` VARCHAR(191) NOT NULL,
    `LineNo` INTEGER NOT NULL,
    `ProductCode` VARCHAR(50) NULL,
    `Description` VARCHAR(255) NOT NULL,
    `POQty` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `ReceivedQty` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `Unit` VARCHAR(50) NULL,
    `UnitPrice` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `Remark` VARCHAR(255) NULL,

    INDEX `GRItem_GRID_idx`(`GRID`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GoodsReceipt` ADD CONSTRAINT `GoodsReceipt_CompanyID_fkey` FOREIGN KEY (`CompanyID`) REFERENCES `Company`(`ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GRItem` ADD CONSTRAINT `GRItem_GRID_fkey` FOREIGN KEY (`GRID`) REFERENCES `GoodsReceipt`(`ID`) ON DELETE CASCADE ON UPDATE CASCADE;
