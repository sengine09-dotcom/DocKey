-- Sample master data for a computer store and IT equipment business
-- Import into dbDockey to populate the new code master tables for DocKey.
-- Multi-company schema: CompanyID = 'cmnpmmq7m000073osunzulz0i' (PO Soft Solution)

USE dbDockey;

-- Customers
INSERT INTO `Customer` (
  `ID`,
  `CompanyID`,
  `CustomerCode`,
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
  ('01KN6Z8QJ0X8J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000001', 'NextByte Solutions Co., Ltd.', 'Kanittha Wong', '02-410-1001', 'procurement@nextbyte.co.th', '99/12 SeriTech Tower, Bangna, Bangkok 10260', '0105569000011', 'Bangna HQ', 'Y', '2026-01-05 09:00:00', NOW()),
  ('01KN6Z8QJ0Y8J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000002', 'CoreLink Technology Co., Ltd.', 'Narin Chaiyo', '02-410-1002', 'sales@corelinktech.co.th', '18/8 Metro IT Building, Huai Khwang, Bangkok 10310', '0105569000012', 'Ratchada Branch', 'Y', '2026-01-08 09:00:00', NOW()),
  ('01KN6Z8QJ0Z8J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000003', 'NetServe Computer & Network Co., Ltd.', 'Preecha Lim', '02-410-1003', 'admin@netserve.co.th', '55/7 Digital Park, Mueang, Nonthaburi 11000', '0105569000013', 'Nonthaburi Office', 'Y', '2026-01-10 09:00:00', NOW()),
  ('01KN6Z8QJ108J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000004', 'SmartPort IT Systems Co., Ltd.', 'Suda Phrom', '02-410-1004', 'it@smartport.co.th', '120/45 Tech Avenue, Lat Phrao, Bangkok 10230', '0105569000014', 'Lat Phrao Office', 'Y', '2026-01-12 09:00:00', NOW()),
  ('01KN6Z8QJ118J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000005', 'InfraTech Device Co., Ltd.', 'Theerawat Namjai', '02-410-1005', 'contact@infratechdevice.co.th', '88/19 Network Square, Khlong Toei, Bangkok 10110', '0105569000015', 'Khlong Toei Warehouse', 'Y', '2026-01-15 09:00:00', NOW())
ON DUPLICATE KEY UPDATE
  `CustomerName` = VALUES(`CustomerName`),
  `ContactName`  = VALUES(`ContactName`),
  `Phone`        = VALUES(`Phone`),
  `Email`        = VALUES(`Email`),
  `Address`      = VALUES(`Address`),
  `TaxID`        = VALUES(`TaxID`),
  `Branch`       = VALUES(`Branch`),
  `Used`         = VALUES(`Used`),
  `UpdatedAt`    = VALUES(`UpdatedAt`);

-- Products / inventory
INSERT INTO `Product` (
  `ID`,
  `CompanyID`,
  `ProductCode`,
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
  ('01KN6Z8QJ128J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000001', 'Business Desktop PC i5', 'Computer', 'Dell', 'OptiPlex 7010 SFF', 18500.0000, 16200.0000, 14, 2, 20, '2026-01-05 09:00:00', NOW()),
  ('01KN6Z8QJ138J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000002', '24-Port Gigabit Switch', 'Network', 'TP-Link', 'TL-SG3428', 17500.0000, 14800.0000, 8, 2, 15, '2026-01-05 09:00:00', NOW()),
  ('01KN6Z8QJ148J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000003', 'Wi-Fi 6 Access Point', 'Network', 'Ubiquiti', 'U6-Lite', 9500.0000, 7900.0000, 22, 4, 30, '2026-01-05 09:00:00', NOW()),
  ('01KN6Z8QJ158J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000004', '1.5kVA Line Interactive UPS', 'Power', 'APC', 'BX1600MI-MS', 12500.0000, 10900.0000, 6, 1, 10, '2026-01-05 09:00:00', NOW()),
  ('01KN6Z8QJ168J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000005', 'Cat6 UTP Cable Box 305M', 'Cable', 'LINK', 'US-9106', 3500.0000, 2800.0000, 35, 5, 50, '2026-01-05 09:00:00', NOW()),
  ('01KN6Z8QJ178J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000006', '27-inch IPS Monitor', 'Display', 'LG', '27MP400-B', 5200.0000, 4500.0000, 18, 3, 24, '2026-01-05 09:00:00', NOW()),
  ('01KN6Z8QJ188J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000007', '1TB NVMe SSD', 'Storage', 'Samsung', '970 EVO Plus', 3200.0000, 2750.0000, 26, 5, 40, '2026-01-05 09:00:00', NOW()),
  ('01KN6Z8QJ198J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000008', 'Mini PC Firewall Appliance', 'Security', 'MikroTik', 'RB5009UG+S+', 18900.0000, 16000.0000, 5, 1, 8, '2026-01-05 09:00:00', NOW())
ON DUPLICATE KEY UPDATE
  `ProductName` = VALUES(`ProductName`),
  `Category`    = VALUES(`Category`),
  `Brand`       = VALUES(`Brand`),
  `Model`       = VALUES(`Model`),
  `Price`       = VALUES(`Price`),
  `Cost`        = VALUES(`Cost`),
  `StockQty`    = VALUES(`StockQty`),
  `MinQty`      = VALUES(`MinQty`),
  `MaxQty`      = VALUES(`MaxQty`),
  `UpdatedAt`   = VALUES(`UpdatedAt`);

-- Destinations
INSERT INTO `Destination` (
  `ID`,
  `CompanyID`,
  `DestinationCode`,
  `Destination`,
  `Location`,
  `Used`
) VALUES
  ('01KN6Z8QJ1A8J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000001', 'Bangna Head Office', 'Bangkok', 'Y'),
  ('01KN6Z8QJ1B8J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000002', 'Ratchada Branch', 'Bangkok', 'Y'),
  ('01KN6Z8QJ1C8J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000003', 'Nonthaburi Warehouse', 'Nonthaburi', 'Y'),
  ('01KN6Z8QJ1D8J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000004', 'Chonburi Service Center', 'Chonburi', 'Y'),
  ('01KN6Z8QJ1E8J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000005', 'Rayong Project Site', 'Rayong', 'Y')
ON DUPLICATE KEY UPDATE
  `Destination` = VALUES(`Destination`),
  `Location`    = VALUES(`Location`),
  `Used`        = VALUES(`Used`);

-- Payment terms
INSERT INTO `PaymentTerm` (
  `ID`,
  `CompanyID`,
  `TermCode`,
  `TermName`,
  `ShortName`,
  `Days`,
  `Used`
) VALUES
  ('01KN6Z8QJ1F8J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000001', 'Cash on Delivery', 'COD', '0', 'Y'),
  ('01KN6Z8QJ1G8J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000002', 'Credit 7 Days', 'NET7', '7', 'Y'),
  ('01KN6Z8QJ1H8J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000003', 'Credit 15 Days', 'NET15', '15', 'Y'),
  ('01KN6Z8QJ1I8J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000004', 'Credit 30 Days', 'NET30', '30', 'Y'),
  ('01KN6Z8QJ1J8J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', '000005', 'Credit 60 Days', 'NET60', '60', 'Y')
ON DUPLICATE KEY UPDATE
  `TermName`  = VALUES(`TermName`),
  `ShortName` = VALUES(`ShortName`),
  `Days`      = VALUES(`Days`),
  `Used`      = VALUES(`Used`);

-- Vendors / suppliers
INSERT INTO `Vendor` (
  `ID`,
  `CompanyID`,
  `VendorCode`,
  `Name`,
  `ContactName`,
  `Phone`,
  `Email`,
  `Address`,
  `TaxID`,
  `PaymentType`,
  `PaymentTerm`,
  `BankName`,
  `BankAccount`,
  `AccountName`,
  `IsActive`,
  `Note`,
  `CreatedAt`,
  `UpdatedAt`
) VALUES
  ('01KN6Z8QJ1K8J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', 'VND-0001', 'Siam Network Distribution Co., Ltd.', 'Arthit Saelim', '02-510-2001', 'sales@siamnetworkdist.co.th', '89/11 IT Logistics Center, Bang Khen, Bangkok 10220', '0105569001011', 'CASH', 0, 'Kasikorn Bank', '123-4-56789-1', 'Siam Network Distribution Co., Ltd.', TRUE, 'Main distributor for switches and access points', '2026-01-20 09:00:00', NOW()),
  ('01KN6Z8QJ1L8J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', 'VND-0002', 'Metro Computer Supply Co., Ltd.', 'Nuttapong Charoen', '02-510-2002', 'procurement@metrocomputer.co.th', '44/8 Hardware Plaza, Din Daeng, Bangkok 10400', '0105569001012', 'CREDIT', 30, 'Bangkok Bank', '234-5-67890-2', 'Metro Computer Supply Co., Ltd.', TRUE, 'Desktop, monitor and office IT hardware supplier', '2026-01-21 09:00:00', NOW()),
  ('01KN6Z8QJ1M8J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', 'VND-0003', 'SecureNet Systems Limited', 'Patcharee Wongchai', '02-510-2003', 'contact@securenet.co.th', '77/5 Security Tech Park, Prawet, Bangkok 10250', '0105569001013', 'TRANSFER', 15, 'SCB', '345-6-78901-3', 'SecureNet Systems Limited', TRUE, 'Firewall, security appliance and surveillance vendor', '2026-01-22 09:00:00', NOW()),
  ('01KN6Z8QJ1N8J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', 'VND-0004', 'Eastern Cabling & Power Co., Ltd.', 'Siriporn Boonsri', '038-410-204', 'vendor@easterncabling.co.th', '155/12 Industrial Estate Road, Mueang, Chonburi 20000', '0205569001014', 'CREDIT', 45, 'Krungthai Bank', '456-7-89012-4', 'Eastern Cabling & Power Co., Ltd.', TRUE, 'Cable, rack and UPS supplier for infrastructure projects', '2026-01-23 09:00:00', NOW()),
  ('01KN6Z8QJ1O8J8R2N5P1Q3R4S', 'cmnpmmq7m000073osunzulz0i', 'VND-0005', 'Infra Device Wholesale Co., Ltd.', 'Thanawat Kijtrakool', '02-510-2005', 'wholesale@infradevice.co.th', '200/18 Device Hub Building, Suan Luang, Bangkok 10250', '0105569001015', 'CASH', 0, 'Krungsri Bank', '567-8-90123-5', 'Infra Device Wholesale Co., Ltd.', TRUE, 'General spare parts and fast-moving IT stock supplier', '2026-01-24 09:00:00', NOW())
ON DUPLICATE KEY UPDATE
  `Name`        = VALUES(`Name`),
  `ContactName` = VALUES(`ContactName`),
  `Phone`       = VALUES(`Phone`),
  `Email`       = VALUES(`Email`),
  `Address`     = VALUES(`Address`),
  `TaxID`       = VALUES(`TaxID`),
  `PaymentType` = VALUES(`PaymentType`),
  `PaymentTerm` = VALUES(`PaymentTerm`),
  `BankName`    = VALUES(`BankName`),
  `BankAccount` = VALUES(`BankAccount`),
  `AccountName` = VALUES(`AccountName`),
  `IsActive`    = VALUES(`IsActive`),
  `Note`        = VALUES(`Note`),
  `UpdatedAt`   = VALUES(`UpdatedAt`);
