import { validateAndRegisterSerialNumbers } from '../lib/grService';

const makeMockTx = (overrides: any = {}) => ({
  product: {
    findMany: jest.fn().mockResolvedValue([
      { id: 'prod-1', productCode: 'GPU-4090' },
      { id: 'prod-2', productCode: 'CPU-7950X' },
    ]),
  },
  serialNumber: {
    findFirst: jest.fn().mockResolvedValue(null),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
  ...overrides,
});

const makeGR = (items: any[]) => ({
  id: 'gr-1',
  grNumber: 'GR-26-000001',
  items: items.map((item, idx) => ({
    id: `gri-${idx + 1}`,
    lineNo: idx + 1,
    productCode: item.productCode ?? null,
    serialNumber: item.serialNumber ?? null,
  })),
});

describe('validateAndRegisterSerialNumbers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throw เมื่อ serialNumber ไม่ครบทุก line (มีบาง line กรอก บาง line ไม่กรอก)', async () => {
    const tx = makeMockTx();
    const gr = makeGR([
      { productCode: 'GPU-4090', serialNumber: 'SN-001' },
      { productCode: 'CPU-7950X', serialNumber: null }, // ขาด
    ]);

    await expect(
      validateAndRegisterSerialNumbers(tx as any, gr as any, 'company-1')
    ).rejects.toThrow('กรุณากรอก Serial Number ให้ครบทุกรายการ');
  });

  it('throw เมื่อ serialNumber ซ้ำกันภายในใบ GR เดียวกัน', async () => {
    const tx = makeMockTx();
    const gr = makeGR([
      { productCode: 'GPU-4090', serialNumber: 'SN-X' },
      { productCode: 'CPU-7950X', serialNumber: 'SN-X' }, // ซ้ำ
    ]);

    await expect(
      validateAndRegisterSerialNumbers(tx as any, gr as any, 'company-1')
    ).rejects.toThrow("Serial Number 'SN-X' ถูกใช้ซ้ำในรายการที่ 1 และ 2");
  });

  it('throw เมื่อ serialNumber มีอยู่ใน DB แล้ว (AVAILABLE)', async () => {
    const tx = makeMockTx({
      serialNumber: {
        findFirst: jest.fn().mockResolvedValue({
          serialNumber: 'SN-DB',
          grNumber: 'GR-26-000001',
        }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    });
    const gr = makeGR([
      { productCode: 'GPU-4090', serialNumber: 'SN-DB' },
    ]);

    await expect(
      validateAndRegisterSerialNumbers(tx as any, gr as any, 'company-1')
    ).rejects.toThrow("Serial Number 'SN-DB' มีอยู่ในระบบแล้ว");
  });

  it('throw เมื่อสินค้าไม่มีในระบบ (productCode ไม่ resolve)', async () => {
    const tx = makeMockTx({
      product: { findMany: jest.fn().mockResolvedValue([]) },
    });
    const gr = makeGR([
      { productCode: 'GPU-4090', serialNumber: 'SN-001' },
    ]);

    await expect(
      validateAndRegisterSerialNumbers(tx as any, gr as any, 'company-1')
    ).rejects.toThrow("ไม่พบสินค้าที่ productCode");
  });

  it('ข้าม validation เมื่อ GR ไม่มี S/N เลย (สินค้าที่ไม่ต้องการ S/N)', async () => {
    const tx = makeMockTx();
    const gr = makeGR([
      { productCode: 'GPU-4090', serialNumber: null },
      { productCode: 'CPU-7950X', serialNumber: null },
    ]);

    // ไม่ควรเรียก findFirst หรือ createMany เลย
    expect(tx.serialNumber.findFirst).not.toHaveBeenCalled();
    expect(tx.serialNumber.createMany).not.toHaveBeenCalled();
    await expect(validateAndRegisterSerialNumbers(tx as any, gr as any, 'company-1')).resolves.toBeUndefined();
  });

  it('สร้าง SerialNumber records สถานะ AVAILABLE เมื่อ S/N ถูกต้องทั้งหมด', async () => {
    const tx = makeMockTx();
    const gr = makeGR([
      { productCode: 'GPU-4090', serialNumber: 'SN-001' },
      { productCode: 'CPU-7950X', serialNumber: 'SN-002' },
    ]);

    await validateAndRegisterSerialNumbers(tx as any, gr as any, 'company-1');

    expect(tx.serialNumber.createMany).toHaveBeenCalledTimes(1);
    const call = tx.serialNumber.createMany.mock.calls[0][0];
    expect(call.data).toHaveLength(2);
    expect(call.data[0]).toMatchObject({
      serialNumber: 'SN-001',
      productCode: 'GPU-4090',
      productId: 'prod-1',
      companyId: 'company-1',
      status: 'AVAILABLE',
      grId: 'gr-1',
      grNumber: 'GR-26-000001',
    });
    expect(call.data[1]).toMatchObject({
      serialNumber: 'SN-002',
      productCode: 'CPU-7950X',
      productId: 'prod-2',
      status: 'AVAILABLE',
    });
    const firstRecord = (tx.serialNumber.createMany as jest.Mock).mock.calls[0][0].data[0];
    expect(firstRecord.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });
});
