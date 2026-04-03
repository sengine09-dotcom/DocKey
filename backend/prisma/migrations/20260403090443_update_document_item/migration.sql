/*
  Warnings:

  - A unique constraint covering the columns `[ProductCode]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `DocumentItem` DROP FOREIGN KEY `DocumentItem_ProductCode_fkey`;

-- DropIndex
DROP INDEX `DocumentItem_ProductCode_fkey` ON `DocumentItem`;

-- DropIndex
DROP INDEX `Product_ID_idx` ON `Product`;

-- DropIndex
DROP INDEX `Product_ID_key` ON `Product`;

-- AlterTable
ALTER TABLE `DocumentItem` MODIFY `ProductCode` VARCHAR(50) NULL;

-- CreateIndex
CREATE INDEX `Product_ProductCode_idx` ON `Product`(`ProductCode`);

-- CreateIndex
CREATE UNIQUE INDEX `Product_ProductCode_key` ON `Product`(`ProductCode`);

-- AddForeignKey
ALTER TABLE `DocumentItem` ADD CONSTRAINT `DocumentItem_ProductCode_fkey` FOREIGN KEY (`ProductCode`) REFERENCES `Product`(`ProductCode`) ON DELETE SET NULL ON UPDATE CASCADE;
