-- AlterTable
ALTER TABLE `GRItem` ADD COLUMN `SerialNumber` VARCHAR(100) NULL;

-- CreateTable
CREATE TABLE `SerialNumber` (
    `ID` VARCHAR(26) NOT NULL,
    `SerialNumber` VARCHAR(100) NOT NULL,
    `ProductID` VARCHAR(26) NOT NULL,
    `ProductCode` VARCHAR(50) NOT NULL,
    `CompanyID` VARCHAR(191) NOT NULL,
    `Status` ENUM('AVAILABLE', 'SOLD', 'RESERVED', 'DAMAGED') NOT NULL DEFAULT 'AVAILABLE',
    `GRID` VARCHAR(191) NULL,
    `GRNumber` VARCHAR(50) NULL,
    `GRItemID` VARCHAR(191) NULL,
    `DOID` VARCHAR(26) NULL,
    `DONumber` VARCHAR(50) NULL,
    `SOID` VARCHAR(191) NULL,
    `SONumber` VARCHAR(50) NULL,
    `SoldAt` DATETIME(3) NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    INDEX `SerialNumber_CompanyID_ProductCode_Status_idx`(`CompanyID`, `ProductCode`, `Status`),
    INDEX `SerialNumber_CompanyID_Status_idx`(`CompanyID`, `Status`),
    INDEX `SerialNumber_GRID_idx`(`GRID`),
    UNIQUE INDEX `SerialNumber_CompanyID_SerialNumber_key`(`CompanyID`, `SerialNumber`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SerialNumber` ADD CONSTRAINT `SerialNumber_ProductID_fkey` FOREIGN KEY (`ProductID`) REFERENCES `Product`(`ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SerialNumber` ADD CONSTRAINT `SerialNumber_CompanyID_fkey` FOREIGN KEY (`CompanyID`) REFERENCES `Company`(`ID`) ON DELETE RESTRICT ON UPDATE CASCADE;
