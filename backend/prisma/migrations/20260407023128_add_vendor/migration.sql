-- AlterTable
ALTER TABLE `PurchaseOrderDocument` ADD COLUMN `VendorCode` VARCHAR(50) NULL;

-- CreateTable
CREATE TABLE `Vendor` (
    `ID` VARCHAR(26) NOT NULL,
    `VendorCode` VARCHAR(50) NOT NULL,
    `Name` VARCHAR(255) NOT NULL,
    `ContactName` VARCHAR(255) NULL,
    `Phone` VARCHAR(50) NULL,
    `Email` VARCHAR(100) NULL,
    `Address` TEXT NULL,
    `TaxID` VARCHAR(50) NULL,
    `PaymentType` ENUM('CASH', 'CREDIT', 'TRANSFER') NOT NULL DEFAULT 'CASH',
    `PaymentTerm` INTEGER NOT NULL DEFAULT 0,
    `BankName` VARCHAR(100) NULL,
    `BankAccount` VARCHAR(100) NULL,
    `AccountName` VARCHAR(255) NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `Note` TEXT NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    INDEX `Vendor_VendorCode_idx`(`VendorCode`),
    UNIQUE INDEX `Vendor_VendorCode_key`(`VendorCode`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
