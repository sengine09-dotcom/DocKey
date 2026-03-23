-- CreateTable
CREATE TABLE `tblCustomer` (
    `CustomerID` VARCHAR(5) NOT NULL,
    `AgentID` VARCHAR(5) NULL,
    `CustomerName` VARCHAR(255) NULL,
    `ShortName` VARCHAR(255) NULL,
    `RegisterDate` DATETIME(3) NULL,
    `RegistrationNo` VARCHAR(20) NULL,
    `Address` VARCHAR(500) NULL,
    `Phone` VARCHAR(50) NULL,
    `Fax` VARCHAR(20) NULL,
    `Email` VARCHAR(255) NULL,
    `ContactPerson` VARCHAR(50) NULL,
    `CreditLimit` DECIMAL(19, 4) NULL,
    `IDTerm` VARCHAR(3) NULL,
    `InternalTerm` INTEGER NULL,
    `Remark` VARCHAR(255) NULL,
    `Used` VARCHAR(1) NULL,
    `TotalShare` DECIMAL(19, 4) NULL,
    `GSTid` VARCHAR(15) NULL,
    `IsGuaratee` INTEGER NULL,
    `GuarateePrice` DECIMAL(19, 4) NULL,
    `GuarateeDateStart` DATETIME(3) NULL,
    `GuarateeDateEnd` DATETIME(3) NULL,

    PRIMARY KEY (`CustomerID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tblProduct` (
    `ProductID` VARCHAR(5) NOT NULL,
    `ProductName` VARCHAR(100) NULL,
    `Marking` VARCHAR(100) NULL,
    `Type` VARCHAR(100) NULL,
    `BagSize` VARCHAR(100) NULL,
    `PWeight` DOUBLE NULL,
    `ComValue` VARCHAR(1) NULL,
    `Description` VARCHAR(255) NULL,
    `IDSupplier` VARCHAR(3) NULL,
    `ShowInStock` VARCHAR(1) NULL,
    `Used` VARCHAR(1) NULL,

    PRIMARY KEY (`ProductID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tblDestination` (
    `DestID` VARCHAR(3) NOT NULL,
    `Destination` VARCHAR(50) NULL,
    `Location` VARCHAR(50) NULL,
    `Used` VARCHAR(1) NULL,

    PRIMARY KEY (`DestID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
