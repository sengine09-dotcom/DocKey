/*
  Warnings:

  - A unique constraint covering the columns `[CompanyID,CustomerCode]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[CompanyID,DocumentType,DocumentNumber]` on the table `Document` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[CompanyID,ProductCode]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[CompanyID,VendorCode]` on the table `Vendor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `CompanyID` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `CompanyID` to the `Destination` table without a default value. This is not possible if the table is not empty.
  - Added the required column `CompanyID` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `CompanyID` to the `PaymentTerm` table without a default value. This is not possible if the table is not empty.
  - Added the required column `CompanyID` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `CompanyID` to the `Vendor` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `DocumentItem` DROP FOREIGN KEY `DocumentItem_ProductCode_fkey`;

-- DropIndex
DROP INDEX `Customer_ID_idx` ON `Customer`;

-- DropIndex
DROP INDEX `Customer_ID_key` ON `Customer`;

-- DropIndex
DROP INDEX `Document_DocumentType_DocumentDate_idx` ON `Document`;

-- DropIndex
DROP INDEX `Document_DocumentType_DocumentNumber_key` ON `Document`;

-- DropIndex
DROP INDEX `DocumentItem_ProductCode_fkey` ON `DocumentItem`;

-- DropIndex
DROP INDEX `Product_ProductCode_idx` ON `Product`;

-- DropIndex
DROP INDEX `Product_ProductCode_key` ON `Product`;

-- DropIndex
DROP INDEX `Vendor_VendorCode_idx` ON `Vendor`;

-- DropIndex
DROP INDEX `Vendor_VendorCode_key` ON `Vendor`;

-- AlterTable
ALTER TABLE `Customer` ADD COLUMN `CompanyID` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Destination` ADD COLUMN `CompanyID` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Document` ADD COLUMN `CompanyID` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `PaymentTerm` ADD COLUMN `CompanyID` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Product` ADD COLUMN `CompanyID` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `SystemActivation` ADD COLUMN `CompanyId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `CompanyID` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Vendor` ADD COLUMN `CompanyID` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `Customer_CompanyID_idx` ON `Customer`(`CompanyID`);

-- CreateIndex
CREATE UNIQUE INDEX `Customer_CompanyID_CustomerCode_key` ON `Customer`(`CompanyID`, `CustomerCode`);

-- CreateIndex
CREATE INDEX `Destination_CompanyID_idx` ON `Destination`(`CompanyID`);

-- CreateIndex
CREATE INDEX `Document_CompanyID_DocumentType_DocumentDate_idx` ON `Document`(`CompanyID`, `DocumentType`, `DocumentDate`);

-- CreateIndex
CREATE UNIQUE INDEX `Document_CompanyID_DocumentType_DocumentNumber_key` ON `Document`(`CompanyID`, `DocumentType`, `DocumentNumber`);

-- CreateIndex
CREATE INDEX `PaymentTerm_CompanyID_idx` ON `PaymentTerm`(`CompanyID`);

-- CreateIndex
CREATE INDEX `Product_CompanyID_idx` ON `Product`(`CompanyID`);

-- CreateIndex
CREATE UNIQUE INDEX `Product_CompanyID_ProductCode_key` ON `Product`(`CompanyID`, `ProductCode`);

-- CreateIndex
CREATE INDEX `User_CompanyID_idx` ON `User`(`CompanyID`);

-- CreateIndex
CREATE INDEX `Vendor_CompanyID_idx` ON `Vendor`(`CompanyID`);

-- CreateIndex
CREATE UNIQUE INDEX `Vendor_CompanyID_VendorCode_key` ON `Vendor`(`CompanyID`, `VendorCode`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_CompanyID_fkey` FOREIGN KEY (`CompanyID`) REFERENCES `Company`(`ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_CompanyID_fkey` FOREIGN KEY (`CompanyID`) REFERENCES `Company`(`ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_CompanyID_fkey` FOREIGN KEY (`CompanyID`) REFERENCES `Company`(`ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Destination` ADD CONSTRAINT `Destination_CompanyID_fkey` FOREIGN KEY (`CompanyID`) REFERENCES `Company`(`ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentTerm` ADD CONSTRAINT `PaymentTerm_CompanyID_fkey` FOREIGN KEY (`CompanyID`) REFERENCES `Company`(`ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vendor` ADD CONSTRAINT `Vendor_CompanyID_fkey` FOREIGN KEY (`CompanyID`) REFERENCES `Company`(`ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_CompanyID_fkey` FOREIGN KEY (`CompanyID`) REFERENCES `Company`(`ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SystemActivation` ADD CONSTRAINT `SystemActivation_CompanyId_fkey` FOREIGN KEY (`CompanyId`) REFERENCES `Company`(`ID`) ON DELETE SET NULL ON UPDATE CASCADE;
