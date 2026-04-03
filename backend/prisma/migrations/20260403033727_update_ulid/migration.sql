/*
  Warnings:

  - The primary key for the `Customer` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Destination` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `PaymentTerm` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Product` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE `Customer` DROP PRIMARY KEY,
    MODIFY `ID` VARCHAR(26) NOT NULL,
    ADD PRIMARY KEY (`ID`);

-- AlterTable
ALTER TABLE `Destination` DROP PRIMARY KEY,
    MODIFY `ID` VARCHAR(26) NOT NULL,
    ADD PRIMARY KEY (`ID`);

-- AlterTable
ALTER TABLE `PaymentTerm` DROP PRIMARY KEY,
    MODIFY `ID` VARCHAR(26) NOT NULL,
    ADD PRIMARY KEY (`ID`);

-- AlterTable
ALTER TABLE `Product` DROP PRIMARY KEY,
    MODIFY `ID` VARCHAR(26) NOT NULL,
    ADD PRIMARY KEY (`ID`);
