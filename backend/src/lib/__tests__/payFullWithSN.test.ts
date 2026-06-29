import { payFullSO } from '../mainDocuments';

// Mock stockService so recordStockMove doesn't need real tx methods
jest.mock('../stockService', () => ({
  recordStockMove: jest.fn().mockResolvedValue(undefined),
}));

// Mock the prisma module
jest.mock('../prisma', () => {
  const txMock: any = {
    document: {
      create: jest.fn().mockResolvedValue({}),
    },
    documentItem: {
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    invoiceDocument: {
      create: jest.fn().mockResolvedValue({}),
    },
    deliveryOrderDocument: {
      create: jest.fn().mockResolvedValue({}),
    },
    receiptDocument: {
      create: jest.fn().mockResolvedValue({}),
    },
    saleOrder: {
      update: jest.fn().mockResolvedValue({}),
    },
    serialNumber: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
  };

  return {
    prisma: {
      saleOrder: {
        findFirst: jest.fn(),
      },
      paymentTerm: {
        findFirst: jest.fn(),
      },
      depositInvoiceDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      receiptDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      document: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn().mockImplementation((fn: any) => fn(txMock)),
      _txMock: txMock,
    },
  };
});

import { prisma } from '../prisma';
const mp = prisma as any;
const tx = mp._txMock;

/** A minimal SO with one product line (qty=1) */
const makeSO = (qty = 1) => ({
  id: 'SO-1',
  soNumber: 'SO-26-000001',
  companyId: 'company-1',
  status: 'CONFIRMED',
  paymentTerm: 'CASH',
  customerCode: 'CUST-1',
  customerName: 'Test Customer',
  items: [
    {
      lineNo: 1,
      productCode: 'GPU-4090',
      qty: qty,
      unitPrice: 1000,
      amount: qty * 1000,
      unit: 'EA',
    },
  ],
});

/** A minimal SO with two product lines (qty=1 each, total=2) */
const makeSO2 = () => ({
  ...makeSO(),
  items: [
    { lineNo: 1, productCode: 'GPU-4090', qty: 1, unitPrice: 1000, amount: 1000, unit: 'EA' },
    { lineNo: 2, productCode: 'CPU-7950X', qty: 1, unitPrice: 800, amount: 800, unit: 'EA' },
  ],
});

beforeEach(() => {
  jest.clearAllMocks();
  // Default: no existing DI, no existing RC
  (mp.depositInvoiceDocument.findFirst as jest.Mock).mockResolvedValue(null);
  (mp.receiptDocument.findFirst as jest.Mock).mockResolvedValue(null);
  // Default: paymentTerm is cash (days=0)
  (mp.paymentTerm.findFirst as jest.Mock).mockResolvedValue({ days: 0 });
  // Default: SO with qty=1
  (mp.saleOrder.findFirst as jest.Mock).mockResolvedValue(makeSO());
  // buildFallbackDocumentNumber uses document.findFirst
  (mp.document.findFirst as jest.Mock).mockResolvedValue(null);
  // Reset tx mocks
  (tx.document.create as jest.Mock).mockResolvedValue({});
  (tx.documentItem.createMany as jest.Mock).mockResolvedValue({ count: 0 });
  (tx.invoiceDocument.create as jest.Mock).mockResolvedValue({});
  (tx.deliveryOrderDocument.create as jest.Mock).mockResolvedValue({});
  (tx.receiptDocument.create as jest.Mock).mockResolvedValue({});
  (tx.saleOrder.update as jest.Mock).mockResolvedValue({});
  (tx.serialNumber.findUnique as jest.Mock).mockResolvedValue({ id: 'sn-id-1', status: 'AVAILABLE' });
  (tx.serialNumber.update as jest.Mock).mockResolvedValue({});
  // $transaction calls the callback with txMock
  (mp.$transaction as jest.Mock).mockImplementation((fn: any) => fn(tx));
});

describe('payFullSO — Serial Number integration', () => {
  it('throw เมื่อ S/N สถานะไม่ใช่ AVAILABLE (SOLD)', async () => {
    (tx.serialNumber.findUnique as jest.Mock).mockResolvedValue({ id: 'sn-id-1', status: 'SOLD' });

    await expect(payFullSO('SO-1', 'company-1', ['SN-001'], 'user1'))
      .rejects.toThrow("Serial Number 'SN-001' ไม่มีสถานะ AVAILABLE");
  });

  it('throw เมื่อ S/N ไม่มีในระบบ', async () => {
    (tx.serialNumber.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(payFullSO('SO-1', 'company-1', ['SN-FAKE'], 'user1'))
      .rejects.toThrow("ไม่พบ Serial Number 'SN-FAKE'");
  });

  it('throw เมื่อจำนวน S/N ไม่ตรงกับ qty ใน SO items', async () => {
    // SO has qty=1 but sending 2 S/Ns
    (mp.saleOrder.findFirst as jest.Mock).mockResolvedValue(makeSO(1));

    await expect(payFullSO('SO-1', 'company-1', ['SN-001', 'SN-002'], 'user1'))
      .rejects.toThrow('ไม่ตรงกับจำนวนสินค้า');
  });

  it('throw เมื่อจำนวน S/N น้อยกว่า qty ใน SO items', async () => {
    // SO has qty=2 but sending only 1 S/N
    (mp.saleOrder.findFirst as jest.Mock).mockResolvedValue(makeSO(2));

    await expect(payFullSO('SO-1', 'company-1', ['SN-001'], 'user1'))
      .rejects.toThrow('ไม่ตรงกับจำนวนสินค้า');
  });

  it('mark S/N เป็น SOLD และผูก doId, soId เมื่อสำเร็จ', async () => {
    (tx.serialNumber.findUnique as jest.Mock).mockResolvedValue({ id: 'sn-id-1', status: 'AVAILABLE' });

    await payFullSO('SO-1', 'company-1', ['SN-001'], 'user1');

    expect(tx.serialNumber.update).toHaveBeenCalledTimes(1);
    const updateCall = (tx.serialNumber.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.where).toEqual({
      companyId_serialNumber: { companyId: 'company-1', serialNumber: 'SN-001' },
    });
    expect(updateCall.data.status).toBe('SOLD');
    expect(updateCall.data.soId).toBe('SO-1');
    expect(updateCall.data.soNumber).toBe('SO-26-000001');
    expect(updateCall.data.doNumber).toBeDefined();
    expect(updateCall.data.soldAt).toBeInstanceOf(Date);
  });

  it('mark S/N หลายรายการเป็น SOLD เมื่อ SO มีหลายสินค้า', async () => {
    (mp.saleOrder.findFirst as jest.Mock).mockResolvedValue(makeSO2());
    (tx.serialNumber.findUnique as jest.Mock).mockResolvedValue({ id: 'sn-id-1', status: 'AVAILABLE' });

    await payFullSO('SO-1', 'company-1', ['SN-A', 'SN-B'], 'user1');

    expect(tx.serialNumber.update).toHaveBeenCalledTimes(2);
    const calls = (tx.serialNumber.update as jest.Mock).mock.calls;
    expect(calls[0][0].where.companyId_serialNumber.serialNumber).toBe('SN-A');
    expect(calls[1][0].where.companyId_serialNumber.serialNumber).toBe('SN-B');
  });

  it('throw idempotency: throw เมื่อ RC มีอยู่แล้วสำหรับ SO นี้', async () => {
    (mp.receiptDocument.findFirst as jest.Mock).mockResolvedValue({
      documentNumber: 'RC-26-000001',
    });

    await expect(payFullSO('SO-1', 'company-1', ['SN-001'], 'user1'))
      .rejects.toThrow('มีใบเสร็จรับเงินอยู่แล้ว (RC-26-000001) ไม่สามารถชำระซ้ำได้');
  });

  it('succeed ด้วย serialNumbers = [] เมื่อ SO ไม่มีสินค้า (qty รวม = 0)', async () => {
    // SO with no product items (service-only)
    (mp.saleOrder.findFirst as jest.Mock).mockResolvedValue({
      ...makeSO(),
      items: [
        { lineNo: 1, productCode: null, qty: 1, unitPrice: 500, amount: 500, unit: null },
      ],
    });

    const result = await payFullSO('SO-1', 'company-1', [], 'user1');
    expect(result).toHaveProperty('rcId');
    expect(result).toHaveProperty('doId');
    expect(result).toHaveProperty('invId');
    expect(tx.serialNumber.update).not.toHaveBeenCalled();
  });
});
