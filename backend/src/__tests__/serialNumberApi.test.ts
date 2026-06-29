// Unit tests for SerialNumberController.validate
// Tests the controller function directly with mock req/res and mocked prisma.

jest.mock('../lib/prisma', () => ({
  prisma: {
    serialNumber: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../lib/companyContext', () => ({
  resolveCompanyContext: jest.fn(),
}));

import { SerialNumberController } from '../controllers/SerialNumberController';
import { prisma } from '../lib/prisma';
import { resolveCompanyContext } from '../lib/companyContext';

const mockedPrisma = prisma as any;
const mockedResolveCompanyContext = resolveCompanyContext as jest.Mock;

const makeReq = (query: Record<string, string> = {}, extras: any = {}) =>
  ({ query, cookies: {}, headers: {}, ...extras } as any);

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('GET /api/serial-numbers/validate — SerialNumberController.validate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedResolveCompanyContext.mockResolvedValue({ companyId: 'company-1', userId: 'u1', userName: 'Test', role: 'admin' });
  });

  it('คืน 400 เมื่อไม่ส่ง sn parameter', async () => {
    const req = makeReq({});
    const res = makeRes();

    await SerialNumberController.validate(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('คืน 401 เมื่อไม่มี auth context', async () => {
    mockedResolveCompanyContext.mockResolvedValue(null);
    const req = makeReq({ sn: 'SN-001' });
    const res = makeRes();

    await SerialNumberController.validate(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('คืน valid:true เมื่อ S/N มีอยู่และ AVAILABLE', async () => {
    mockedPrisma.serialNumber.findUnique.mockResolvedValue({
      status: 'AVAILABLE',
      productCode: 'GPU-4090',
      soNumber: null,
      doNumber: null,
      soId: null,
      doId: null,
      soldAt: null,
    });

    const req = makeReq({ sn: 'SN-001' });
    const res = makeRes();

    await SerialNumberController.validate(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      valid: true,
      serialNumber: 'SN-001',
      status: 'AVAILABLE',
      productCode: 'GPU-4090',
    });
  });

  it('คืน valid:true พร้อม productCode เมื่อ productCode ตรงกัน', async () => {
    mockedPrisma.serialNumber.findUnique.mockResolvedValue({
      status: 'AVAILABLE',
      productCode: 'GPU-4090',
      soNumber: null,
      doNumber: null,
      soId: null,
      doId: null,
      soldAt: null,
    });

    const req = makeReq({ sn: 'SN-001', productCode: 'GPU-4090' });
    const res = makeRes();

    await SerialNumberController.validate(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ valid: true, productCode: 'GPU-4090' }));
  });

  it('คืน valid:false เมื่อ S/N สถานะ SOLD', async () => {
    const soldAt = new Date('2026-01-15T10:00:00.000Z');
    mockedPrisma.serialNumber.findUnique.mockResolvedValue({
      status: 'SOLD',
      productCode: 'GPU-4090',
      soNumber: 'SO-26-000001',
      doNumber: 'DO-26-000001',
      soId: 'so-id-1',
      doId: 'do-id-1',
      soldAt,
    });

    const req = makeReq({ sn: 'SN-001' });
    const res = makeRes();

    await SerialNumberController.validate(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.valid).toBe(false);
    expect(body.status).toBe('SOLD');
    expect(body.soldAt).toBe(soldAt.toISOString());
    expect(body.reference).toEqual({ soId: 'so-id-1', doId: 'do-id-1', soNumber: 'SO-26-000001', doNumber: 'DO-26-000001' });
    expect(body.error).toMatch(/ถูกขายออกไปแล้ว/);
  });

  it('คืน valid:false เมื่อหาไม่พบ S/N', async () => {
    mockedPrisma.serialNumber.findUnique.mockResolvedValue(null);

    const req = makeReq({ sn: 'SN-FAKE' });
    const res = makeRes();

    await SerialNumberController.validate(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.valid).toBe(false);
    expect(body.status).toBeNull();
    expect(body.error).toMatch(/ไม่พบ Serial Number/);
  });

  it('คืน valid:false เมื่อ productCode ไม่ตรงกัน (S/N เป็น AVAILABLE)', async () => {
    mockedPrisma.serialNumber.findUnique.mockResolvedValue({
      status: 'AVAILABLE',
      productCode: 'GPU-4090',
      soNumber: null,
      doNumber: null,
      soId: null,
      doId: null,
      soldAt: null,
    });

    const req = makeReq({ sn: 'SN-001', productCode: 'CPU-7950X' });
    const res = makeRes();

    await SerialNumberController.validate(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.valid).toBe(false);
    expect(body.status).toBe('AVAILABLE');
    expect(body.error).toMatch(/ไม่ตรงกับ/);
  });

  it('ค้นหา S/N ด้วย companyId จาก auth context เสมอ', async () => {
    mockedResolveCompanyContext.mockResolvedValue({ companyId: 'company-XYZ', userId: 'u1', userName: 'Test', role: 'admin' });
    mockedPrisma.serialNumber.findUnique.mockResolvedValue(null);

    const req = makeReq({ sn: 'SN-001' });
    const res = makeRes();

    await SerialNumberController.validate(req, res);

    expect(mockedPrisma.serialNumber.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId_serialNumber: { companyId: 'company-XYZ', serialNumber: 'SN-001' } },
      })
    );
  });

  it('ตรวจสอบว่า companyId จาก query param ถูกละเว้น (ใช้ auth context เท่านั้น)', async () => {
    mockedResolveCompanyContext.mockResolvedValue({ companyId: 'test-company', userId: 'u1', userName: 'Test', role: 'admin' });
    mockedPrisma.serialNumber.findUnique.mockResolvedValue({
      status: 'AVAILABLE',
      productCode: 'GPU-4090',
      soNumber: null,
      doNumber: null,
      soId: null,
      doId: null,
      soldAt: null,
    });

    const req = makeReq({ sn: 'SN-001', companyId: 'ATTACKER-COMPANY' });
    const res = makeRes();

    await SerialNumberController.validate(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      valid: true,
      serialNumber: 'SN-001',
      status: 'AVAILABLE',
      productCode: 'GPU-4090',
    });

    expect(mockedPrisma.serialNumber.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId_serialNumber: { companyId: 'test-company', serialNumber: 'SN-001' } },
      })
    );
  });
});
