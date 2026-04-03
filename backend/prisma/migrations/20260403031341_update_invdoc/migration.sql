/*
  Warnings:

  - You are about to drop the column `LinkedQuotationId` on the `InvoiceDocument` table. All the data in the column will be lost.
  - You are about to drop the column `LinkedQuotationNumber` on the `InvoiceDocument` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `InvoiceDocument` DROP COLUMN `LinkedQuotationId`,
    DROP COLUMN `LinkedQuotationNumber`;
