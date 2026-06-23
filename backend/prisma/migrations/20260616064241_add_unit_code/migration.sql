-- CreateTable
CREATE TABLE `UnitCode` (
    `ID` VARCHAR(26) NOT NULL,
    `UnitCode` VARCHAR(50) NOT NULL,
    `UnitName` VARCHAR(100) NULL,
    `ShortName` VARCHAR(20) NULL,
    `Used` VARCHAR(1) NULL,
    `CompanyID` VARCHAR(191) NOT NULL,

    INDEX `UnitCode_CompanyID_idx`(`CompanyID`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UnitCode` ADD CONSTRAINT `UnitCode_CompanyID_fkey` FOREIGN KEY (`CompanyID`) REFERENCES `Company`(`ID`) ON DELETE RESTRICT ON UPDATE CASCADE;
