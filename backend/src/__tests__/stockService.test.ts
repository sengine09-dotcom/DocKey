import { recordStockMove } from '../lib/stockService';

const mockTx = {
  product: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  stockTransaction: {
    create: jest.fn(),
  },
} as any;

describe('recordStockMove — negative stock guard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throw เมื่อ stockQty < qty ที่ต้องการตัด', async () => {
    mockTx.product.findUnique.mockResolvedValue({ id: 'p1', stockQty: 2, productCode: 'GPU-4090' });

    await expect(
      recordStockMove(mockTx, {
        items: [{ productCode: 'GPU-4090', productId: 'p1', qty: 5 }],
        docNumber: 'DO-26-000001',
        docType: 'DELIVERY_ORDER',
        direction: 'OUT',
        companyId: 'company-1',
      })
    ).rejects.toThrow('สต๊อกไม่เพียงพอ');
  });

  it('throw เมื่อสินค้าไม่มีในระบบ (findUnique คืน null) ตอนตัด OUT', async () => {
    mockTx.product.findUnique.mockResolvedValue(null);

    await expect(
      recordStockMove(mockTx, {
        items: [{ productCode: 'GPU-4090', productId: 'p1', qty: 1 }],
        docNumber: 'DO-26-000001',
        docType: 'DELIVERY_ORDER',
        direction: 'OUT',
        companyId: 'company-1',
      })
    ).rejects.toThrow('สต๊อกไม่เพียงพอ');
  });

  it('ผ่านเมื่อ stockQty === qty พอดี', async () => {
    mockTx.product.findUnique.mockResolvedValue({ id: 'p1', stockQty: 3, productCode: 'GPU-4090' });
    mockTx.stockTransaction.create.mockResolvedValue({});
    mockTx.product.update.mockResolvedValue({});

    await expect(
      recordStockMove(mockTx, {
        items: [{ productCode: 'GPU-4090', productId: 'p1', qty: 3 }],
        docNumber: 'DO-26-000001',
        docType: 'DELIVERY_ORDER',
        direction: 'OUT',
        companyId: 'company-1',
      })
    ).resolves.not.toThrow();
  });

  it('ทิศทาง IN ไม่ตรวจ stock (เพิ่มของเข้าเสมอ)', async () => {
    mockTx.stockTransaction.create.mockResolvedValue({});
    mockTx.product.update.mockResolvedValue({});

    await expect(
      recordStockMove(mockTx, {
        items: [{ productCode: 'GPU-4090', productId: 'p1', qty: 5 }],
        docNumber: 'GR-26-000001',
        docType: 'GOODS_RECEIPT',
        direction: 'IN',
        companyId: 'company-1',
      })
    ).resolves.not.toThrow();

    // IN direction ไม่ต้อง findUnique
    expect(mockTx.product.findUnique).not.toHaveBeenCalled();
  });

  it('INIT direction ไม่ตรวจ stock', async () => {
    mockTx.stockTransaction.create.mockResolvedValue({});
    mockTx.product.update.mockResolvedValue({});

    await expect(
      recordStockMove(mockTx, {
        items: [{ productCode: 'GPU-4090', productId: 'p1', qty: 5 }],
        docNumber: 'INIT',
        docType: 'INIT',
        direction: 'INIT',
        companyId: 'company-1',
      })
    ).resolves.not.toThrow();

    expect(mockTx.product.findUnique).not.toHaveBeenCalled();
  });
});
