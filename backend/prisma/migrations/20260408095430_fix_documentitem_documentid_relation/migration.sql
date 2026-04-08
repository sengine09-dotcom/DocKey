/*
  Warnings:

  - A unique constraint covering the columns `[DocumentType,DocumentNumber,LineNo]` on the table `DocumentItem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `DocumentID` to the `DocumentItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `DocumentItem` DROP FOREIGN KEY `DocumentItem_ID_fkey`;

-- DropIndex
DROP INDEX `DocumentItem_ID_DocumentType_DocumentNumber_LineNo_key` ON `DocumentItem`;

-- AlterTable
ALTER TABLE `DocumentItem` ADD COLUMN `DocumentID` CHAR(26) NOT NULL;

-- CreateIndex
CREATE INDEX `DocumentItem_DocumentID_idx` ON `DocumentItem`(`DocumentID`);

-- CreateIndex
CREATE UNIQUE INDEX `DocumentItem_DocumentType_DocumentNumber_LineNo_key` ON `DocumentItem`(`DocumentType`, `DocumentNumber`, `LineNo`);

-- AddForeignKey
ALTER TABLE `DocumentItem` ADD CONSTRAINT `DocumentItem_DocumentID_fkey` FOREIGN KEY (`DocumentID`) REFERENCES `Document`(`ID`) ON DELETE CASCADE ON UPDATE CASCADE;
