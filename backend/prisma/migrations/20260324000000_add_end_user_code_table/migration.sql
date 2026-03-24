-- CreateTable
CREATE TABLE `tblEndUser` (
    `EUserID` VARCHAR(3) NOT NULL,
    `EUserName` VARCHAR(255) NOT NULL,
    `ShortName` VARCHAR(100) NULL,
    `Used` VARCHAR(1) NULL,

    PRIMARY KEY (`EUserID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;