-- Sample documents for the computer store and IT equipment demo dataset
-- Requires docs/sample-computer-network-master-data.sql to be loaded first.

USE dockey_db;

-- Stable sample document IDs for deterministic re-imports
-- Quotation      : 01JQDOCQT00000000000000001
-- Invoice        : 01JQDOCIV00000000000000001
-- Receipt        : 01JQDOCRC00000000000000001
-- Purchase Order : 01JQDOCPO00000000000000001
-- Work Order     : 01JQDOCWO00000000000000001

DELETE FROM `Document`
WHERE `DocumentID` IN (
  '01JQDOCQT00000000000000001',
  '01JQDOCIV00000000000000001',
  '01JQDOCRC00000000000000001',
  '01JQDOCPO00000000000000001',
  '01JQDOCWO00000000000000001'
);

INSERT INTO `Document` (
  `DocumentID`,
  `DocumentType`,
  `DocumentNumber`,
  `LegacySourceId`,
  `Title`,
  `DocumentDate`,
  `CustomerID`,
  `BillTo`,
  `ShipTo`,
  `DestinationID`,
  `PaymentTermID`,
  `PaymentMethod`,
  `ReferenceNo`,
  `Status`,
  `Remark`,
  `Subtotal`,
  `TaxRate`,
  `TaxAmount`,
  `TotalAmount`,
  `TotalQuantity`,
  `CreatedAt`,
  `UpdatedAt`
) VALUES
  ('01JQDOCQT00000000000000001', 'QUOTATION', 'QT-26-000001', NULL, 'Office PC and Network Upgrade Proposal', '2026-03-25 09:30:00', '000001', 'NextByte Solutions Co., Ltd.', 'Bangna Head Office', '000001', '000004', 'Bank Transfer', 'RFQ-NB-001', 'Draft', 'Quotation for desktop refresh, edge switch replacement, Wi-Fi expansion, and SSD upgrades.', 258100.0000, 7.0000, 18067.0000, 276167.0000, 18.000, '2026-03-25 09:30:00', NOW()),
  ('01JQDOCIV00000000000000001', 'INVOICE', 'INV-26-000001', 'IV260001', 'Invoice for Network Hardware Delivery', '2026-03-25 13:45:00', '000002', 'CoreLink Technology Co., Ltd.', 'Ratchada Branch', '000002', '000003', 'Bank Transfer', 'PO-CL-7781', 'Pending', 'Invoice for switch, access point, structured cabling, and installation hardware delivery.', 89500.0000, 7.0000, 6265.0000, 95765.0000, 9.000, '2026-03-25 13:45:00', NOW()),
  ('01JQDOCRC00000000000000001', 'RECEIPT', 'RC-26-000001', NULL, 'Receipt for Invoice INV-26-000001', '2026-03-25 16:00:00', '000002', 'CoreLink Technology Co., Ltd.', 'Ratchada Branch', '000002', '000001', 'Cash / Transfer', 'INV-26-000001', 'Received', 'Receipt issued after receiving full payment for invoice INV-26-000001.', 95765.0000, 0.0000, 0.0000, 95765.0000, 1.000, '2026-03-25 16:00:00', NOW()),
  ('01JQDOCPO00000000000000001', 'PURCHASE_ORDER', 'PO-26-000001', NULL, 'Purchase Order for Distribution Stock Refill', '2026-03-25 10:15:00', '000005', 'InfraTech Device Co., Ltd.', 'Nonthaburi Warehouse', '000003', '000005', 'Credit 60 Days', 'STOCK-REFILL-PO1', 'Open', 'Purchase order for stock replenishment of access points, UPS units, LAN cable, and monitors.', 305100.0000, 7.0000, 21357.0000, 326457.0000, 43.000, '2026-03-25 10:15:00', NOW()),
  ('01JQDOCWO00000000000000001', 'WORK_ORDER', 'WO-26-000001', NULL, 'Install Wireless Network at Rayong Project Site', '2026-03-25 08:45:00', '000004', 'SmartPort IT Systems Co., Ltd.', 'Rayong Project Site', '000005', '000002', 'Internal Work Order', 'PROJECT-RY-21', 'Scheduled', 'Work order for access point installation, switch setup, cable routing, and post-installation testing on site.', 28500.0000, 0.0000, 0.0000, 28500.0000, 8.000, '2026-03-25 08:45:00', NOW());

INSERT INTO `DocumentItem` (
  `DocumentItemID`,
  `DocumentID`,
  `LineNo`,
  `ProductID`,
  `ItemCode`,
  `Description`,
  `Packing`,
  `Quantity`,
  `UnitPrice`,
  `TotalAmount`,
  `UnitID`,
  `Weight`,
  `Bag`,
  `CreatedAt`,
  `UpdatedAt`
) VALUES
  ('01JQITEMQT0000000000000001', '01JQDOCQT00000000000000001', 1, '000001', '000001', 'Business Desktop PC i5', '1 SET', 10.000, 18500.0000, 185000.0000, 'SET', 85.000, 10, '2026-03-25 09:30:00', NOW()),
  ('01JQITEMQT0000000000000002', '01JQDOCQT00000000000000001', 2, '000002', '000002', '24-Port Gigabit Switch', '1 UNIT', 2.000, 17500.0000, 35000.0000, 'UNIT', 6.400, 2, '2026-03-25 09:30:00', NOW()),
  ('01JQITEMQT0000000000000003', '01JQDOCQT00000000000000001', 3, '000003', '000003', 'Wi-Fi 6 Access Point', '1 UNIT', 3.000, 9500.0000, 28500.0000, 'UNIT', 2.400, 3, '2026-03-25 09:30:00', NOW()),
  ('01JQITEMQT0000000000000004', '01JQDOCQT00000000000000001', 4, '000007', '000007', '1TB NVMe SSD', '1 UNIT', 3.000, 3200.0000, 9600.0000, 'UNIT', 0.150, 3, '2026-03-25 09:30:00', NOW()),

  ('01JQITEMIV0000000000000001', '01JQDOCIV00000000000000001', 1, '000002', '000002', '24-Port Gigabit Switch', '1 UNIT', 2.000, 17500.0000, 35000.0000, 'UNIT', 6.400, 2, '2026-03-25 13:45:00', NOW()),
  ('01JQITEMIV0000000000000002', '01JQDOCIV00000000000000001', 2, '000003', '000003', 'Wi-Fi 6 Access Point', '1 UNIT', 5.000, 9500.0000, 47500.0000, 'UNIT', 4.000, 5, '2026-03-25 13:45:00', NOW()),
  ('01JQITEMIV0000000000000003', '01JQDOCIV00000000000000001', 3, '000005', '000005', 'Cat6 UTP Cable Box 305M', '305 M', 2.000, 3500.0000, 7000.0000, 'BOX', 29.000, 2, '2026-03-25 13:45:00', NOW()),

  ('01JQITEMRC0000000000000001', '01JQDOCRC00000000000000001', 1, NULL, 'INV-26-000001', 'Receipt for invoice INV-26-000001', '1 DOC', 1.000, 95765.0000, 95765.0000, 'DOC', 0.000, 1, '2026-03-25 16:00:00', NOW()),

  ('01JQITEMPO0000000000000001', '01JQDOCPO00000000000000001', 1, '000003', '000003', 'Wi-Fi 6 Access Point', '1 UNIT', 20.000, 8800.0000, 176000.0000, 'UNIT', 16.000, 20, '2026-03-25 10:15:00', NOW()),
  ('01JQITEMPO0000000000000002', '01JQDOCPO00000000000000001', 2, '000004', '000004', '1.5kVA Line Interactive UPS', '1 UNIT', 5.000, 12500.0000, 62500.0000, 'UNIT', 60.000, 5, '2026-03-25 10:15:00', NOW()),
  ('01JQITEMPO0000000000000003', '01JQDOCPO00000000000000001', 3, '000005', '000005', 'Cat6 UTP Cable Box 305M', '305 M', 15.000, 3400.0000, 51000.0000, 'BOX', 217.500, 15, '2026-03-25 10:15:00', NOW()),
  ('01JQITEMPO0000000000000004', '01JQDOCPO00000000000000001', 4, '000006', '000006', '27-inch IPS Monitor', '1 UNIT', 3.000, 5200.0000, 15600.0000, 'UNIT', 12.600, 3, '2026-03-25 10:15:00', NOW()),

  ('01JQITEMWO0000000000000001', '01JQDOCWO00000000000000001', 1, '000002', '000002', 'Install and configure 24-Port Gigabit Switch', '1 JOB', 1.000, 8500.0000, 8500.0000, 'JOB', 0.000, 1, '2026-03-25 08:45:00', NOW()),
  ('01JQITEMWO0000000000000002', '01JQDOCWO00000000000000001', 2, '000003', '000003', 'Mount and tune Wi-Fi 6 Access Point', '1 JOB', 4.000, 3500.0000, 14000.0000, 'JOB', 0.000, 4, '2026-03-25 08:45:00', NOW()),
  ('01JQITEMWO0000000000000003', '01JQDOCWO00000000000000001', 3, '000005', '000005', 'LAN cable pulling and patch panel termination', '1 JOB', 3.000, 2000.0000, 6000.0000, 'JOB', 0.000, 3, '2026-03-25 08:45:00', NOW());

INSERT INTO `QuotationDocument` (
  `DocumentID`,
  `ValidUntil`,
  `AttentionTo`
) VALUES
  ('01JQDOCQT00000000000000001', '2026-04-24 00:00:00', 'Kanittha Wong');

INSERT INTO `InvoiceDocument` (
  `DocumentID`,
  `DueDate`,
  `DoNo`,
  `MonitorReference`,
  `StatusOnline`,
  `LegacyInvoiceNo`
) VALUES
  ('01JQDOCIV00000000000000001', '2026-04-09 00:00:00', 'DO26001', NULL, 1, 'IV260001');

INSERT INTO `ReceiptDocument` (
  `DocumentID`,
  `ReceivedDate`,
  `PaymentReference`
) VALUES
  ('01JQDOCRC00000000000000001', '2026-03-25 16:00:00', 'PAY-CL-0001');

INSERT INTO `PurchaseOrderDocument` (
  `DocumentID`,
  `SupplierName`,
  `DeliveryDate`
) VALUES
  ('01JQDOCPO00000000000000001', 'Tech Distribution Hub Co., Ltd.', '2026-03-31 09:00:00');

INSERT INTO `WorkOrderDocument` (
  `DocumentID`,
  `ScheduledDate`,
  `AssignedTo`
) VALUES
  ('01JQDOCWO00000000000000001', '2026-03-28 08:30:00', 'Network Engineer Team');