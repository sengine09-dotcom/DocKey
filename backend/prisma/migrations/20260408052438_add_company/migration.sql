-- CreateTable
CREATE TABLE `Company` (
    `ID` VARCHAR(191) NOT NULL,
    `CompanyCode` VARCHAR(50) NOT NULL,
    `Name` VARCHAR(255) NOT NULL,
    `NameEn` VARCHAR(255) NULL,
    `TaxID` VARCHAR(50) NULL,
    `Branch` VARCHAR(50) NULL,
    `Address` TEXT NULL,
    `Phone` VARCHAR(50) NULL,
    `Email` VARCHAR(100) NULL,
    `Website` VARCHAR(255) NULL,
    `LogoUrl` VARCHAR(500) NULL,
    `SignatureUrl` VARCHAR(500) NULL,
    `BankName` VARCHAR(100) NULL,
    `BankAccount` VARCHAR(100) NULL,
    `AccountName` VARCHAR(255) NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Company_CompanyCode_key`(`CompanyCode`),
    INDEX `Company_CompanyCode_idx`(`CompanyCode`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
