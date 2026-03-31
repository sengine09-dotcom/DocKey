USE mydoc_db;

CREATE TABLE IF NOT EXISTS `Customer` (
  `CustomerID` VARCHAR(6) NOT NULL,
  `CustomerName` VARCHAR(255) NOT NULL,
  `ContactName` VARCHAR(255) NULL,
  `Phone` VARCHAR(50) NULL,
  `Email` VARCHAR(100) NULL,
  `Address` TEXT NULL,
  `TaxID` VARCHAR(50) NULL,
  `Branch` VARCHAR(50) NULL,
  `Used` VARCHAR(1) NULL,
  `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `UpdatedAt` DATETIME(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`CustomerID`),
  UNIQUE KEY `Customer_CustomerID_key` (`CustomerID`),
  KEY `Customer_CustomerID_idx` (`CustomerID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `Customer` (
  `CustomerID`,
  `CustomerName`,
  `ContactName`,
  `Phone`,
  `Email`,
  `Address`,
  `TaxID`,
  `Branch`,
  `Used`,
  `CreatedAt`,
  `UpdatedAt`
)
SELECT
  c.`CustomerID`,
  COALESCE(NULLIF(c.`CustomerName`, ''), c.`CustomerID`),
  NULLIF(c.`ContactPerson`, ''),
  NULLIF(c.`Phone`, ''),
  NULLIF(c.`Email`, ''),
  NULLIF(c.`Address`, ''),
  NULLIF(c.`GSTid`, ''),
  NULLIF(c.`ShortName`, ''),
  COALESCE(NULLIF(c.`Used`, ''), 'Y'),
  COALESCE(c.`RegisterDate`, CURRENT_TIMESTAMP(3)),
  CURRENT_TIMESTAMP(3)
FROM `tblCustomer` c
ON DUPLICATE KEY UPDATE
  `CustomerName` = VALUES(`CustomerName`),
  `ContactName` = VALUES(`ContactName`),
  `Phone` = VALUES(`Phone`),
  `Email` = VALUES(`Email`),
  `Address` = VALUES(`Address`),
  `TaxID` = VALUES(`TaxID`),
  `Branch` = VALUES(`Branch`),
  `Used` = VALUES(`Used`),
  `UpdatedAt` = CURRENT_TIMESTAMP(3);