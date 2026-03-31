-- Sample master data for a computer store and IT equipment business
-- Import into dockey_db to populate the new code master tables for DocKey.

USE dbDockey;

-- Customers / company names
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
) VALUES
  ('000001', 'NextByte Solutions Co., Ltd.', 'Kanittha Wong', '02-410-1001', 'procurement@nextbyte.co.th', '99/12 SeriTech Tower, Bangna, Bangkok 10260', '0105569000011', 'Bangna HQ', 'Y', '2026-01-05 09:00:00', NOW()),
  ('000002', 'CoreLink Technology Co., Ltd.', 'Narin Chaiyo', '02-410-1002', 'sales@corelinktech.co.th', '18/8 Metro IT Building, Huai Khwang, Bangkok 10310', '0105569000012', 'Ratchada Branch', 'Y', '2026-01-08 09:00:00', NOW()),
  ('000003', 'NetServe Computer & Network Co., Ltd.', 'Preecha Lim', '02-410-1003', 'admin@netserve.co.th', '55/7 Digital Park, Mueang, Nonthaburi 11000', '0105569000013', 'Nonthaburi Office', 'Y', '2026-01-10 09:00:00', NOW()),
  ('000004', 'SmartPort IT Systems Co., Ltd.', 'Suda Phrom', '02-410-1004', 'it@smartport.co.th', '120/45 Tech Avenue, Lat Phrao, Bangkok 10230', '0105569000014', 'Lat Phrao Office', 'Y', '2026-01-12 09:00:00', NOW()),
  ('000005', 'InfraTech Device Co., Ltd.', 'Theerawat Namjai', '02-410-1005', 'contact@infratechdevice.co.th', '88/19 Network Square, Khlong Toei, Bangkok 10110', '0105569000015', 'Khlong Toei Warehouse', 'Y', '2026-01-15 09:00:00', NOW())
ON DUPLICATE KEY UPDATE
  `CustomerName` = VALUES(`CustomerName`),
  `ContactName` = VALUES(`ContactName`),
  `Phone` = VALUES(`Phone`),
  `Email` = VALUES(`Email`),
  `Address` = VALUES(`Address`),
  `TaxID` = VALUES(`TaxID`),
  `Branch` = VALUES(`Branch`),
  `Used` = VALUES(`Used`),
  `UpdatedAt` = VALUES(`UpdatedAt`);

-- Products / inventory
INSERT INTO `Product` (
  `ProductId`,
  `ProductName`,
  `Category`,
  `Brand`,
  `Model`,
  `Price`,
  `Cost`,
  `StockQty`,
  `MinQty`,
  `MaxQty`,
  `CreatedAt`,
  `UpdatedAt`
) VALUES
  ('000001', 'Business Desktop PC i5', 'Computer', 'Dell', 'OptiPlex 7010 SFF', 18500.0000, 16200.0000, 14, 2, 20, '2026-01-05 09:00:00', NOW()),
  ('000002', '24-Port Gigabit Switch', 'Network', 'TP-Link', 'TL-SG3428', 17500.0000, 14800.0000, 8, 2, 15, '2026-01-05 09:00:00', NOW()),
  ('000003', 'Wi-Fi 6 Access Point', 'Network', 'Ubiquiti', 'U6-Lite', 9500.0000, 7900.0000, 22, 4, 30, '2026-01-05 09:00:00', NOW()),
  ('000004', '1.5kVA Line Interactive UPS', 'Power', 'APC', 'BX1600MI-MS', 12500.0000, 10900.0000, 6, 1, 10, '2026-01-05 09:00:00', NOW()),
  ('000005', 'Cat6 UTP Cable Box 305M', 'Cable', 'LINK', 'US-9106', 3500.0000, 2800.0000, 35, 5, 50, '2026-01-05 09:00:00', NOW()),
  ('000006', '27-inch IPS Monitor', 'Display', 'LG', '27MP400-B', 5200.0000, 4500.0000, 18, 3, 24, '2026-01-05 09:00:00', NOW()),
  ('000007', '1TB NVMe SSD', 'Storage', 'Samsung', '970 EVO Plus', 3200.0000, 2750.0000, 26, 5, 40, '2026-01-05 09:00:00', NOW()),
  ('000008', 'Mini PC Firewall Appliance', 'Security', 'MikroTik', 'RB5009UG+S+', 18900.0000, 16000.0000, 5, 1, 8, '2026-01-05 09:00:00', NOW())
ON DUPLICATE KEY UPDATE
  `ProductName` = VALUES(`ProductName`),
  `Category` = VALUES(`Category`),
  `Brand` = VALUES(`Brand`),
  `Model` = VALUES(`Model`),
  `Price` = VALUES(`Price`),
  `Cost` = VALUES(`Cost`),
  `StockQty` = VALUES(`StockQty`),
  `MinQty` = VALUES(`MinQty`),
  `MaxQty` = VALUES(`MaxQty`),
  `UpdatedAt` = VALUES(`UpdatedAt`);

-- Destinations
INSERT INTO `Destination` (
  `DestID`,
  `Destination`,
  `Location`,
  `Used`
) VALUES
  ('000001', 'Bangna Head Office', 'Bangkok', 'Y'),
  ('000002', 'Ratchada Branch', 'Bangkok', 'Y'),
  ('000003', 'Nonthaburi Warehouse', 'Nonthaburi', 'Y'),
  ('000004', 'Chonburi Service Center', 'Chonburi', 'Y'),
  ('000005', 'Rayong Project Site', 'Rayong', 'Y')
ON DUPLICATE KEY UPDATE
  `Destination` = VALUES(`Destination`),
  `Location` = VALUES(`Location`),
  `Used` = VALUES(`Used`);

-- Payment terms
INSERT INTO `PaymentTerm` (
  `TermID`,
  `TermName`,
  `ShortName`,
  `Days`,
  `Used`
) VALUES
  ('000001', 'Cash on Delivery', 'COD', '0', 'Y'),
  ('000002', 'Credit 7 Days', 'NET7', '7', 'Y'),
  ('000003', 'Credit 15 Days', 'NET15', '15', 'Y'),
  ('000004', 'Credit 30 Days', 'NET30', '30', 'Y'),
  ('000005', 'Credit 60 Days', 'NET60', '60', 'Y')
ON DUPLICATE KEY UPDATE
  `TermName` = VALUES(`TermName`),
  `ShortName` = VALUES(`ShortName`),
  `Days` = VALUES(`Days`),
  `Used` = VALUES(`Used`);