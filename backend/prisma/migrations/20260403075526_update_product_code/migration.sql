/*
  Warnings:

  - You are about to drop the column `ProductID` on the `DocumentItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `DocumentItem` DROP FOREIGN KEY `DocumentItem_ProductID_fkey`;

-- DropIndex
DROP INDEX `DocumentItem_ProductID_fkey` ON `DocumentItem`;

-- AlterTable
ALTER TABLE `DocumentItem` DROP COLUMN `ProductID`,
    ADD COLUMN `ProductCode` VARCHAR(10) NULL;

-- AddForeignKey
ALTER TABLE `DocumentItem` ADD CONSTRAINT `DocumentItem_ProductCode_fkey` FOREIGN KEY (`ProductCode`) REFERENCES `Product`(`ID`) ON DELETE SET NULL ON UPDATE CASCADE;
