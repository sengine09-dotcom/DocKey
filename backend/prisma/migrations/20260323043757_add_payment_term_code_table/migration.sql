-- CreateTable
CREATE TABLE `tblPaymentTerm` (
    `TermID` VARCHAR(3) NOT NULL,
    `TermName` VARCHAR(50) NULL,
    `ShortName` VARCHAR(20) NULL,
    `Days` VARCHAR(3) NULL,
    `Used` VARCHAR(1) NULL,

    PRIMARY KEY (`TermID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
