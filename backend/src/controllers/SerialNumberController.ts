import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { resolveCompanyContext } from '../lib/companyContext';

export const SerialNumberController = {
  async validate(req: Request, res: Response) {
    try {
      const { sn, productCode } = req.query as { sn?: string; productCode?: string };
      if (!sn) {
        return res.status(400).json({ success: false, error: 'กรุณาระบุ Serial Number' });
      }

      const ctx = await resolveCompanyContext(req);
      if (!ctx) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const record = await prisma.serialNumber.findUnique({
        where: { companyId_serialNumber: { companyId: ctx.companyId, serialNumber: sn } },
        select: {
          status: true,
          productCode: true,
          soNumber: true,
          doNumber: true,
          soId: true,
          doId: true,
          soldAt: true,
        },
      });

      if (!record) {
        return res.json({
          valid: false,
          serialNumber: sn,
          status: null,
          error: `ไม่พบ Serial Number '${sn}' ในระบบ`,
        });
      }

      if (record.status !== 'AVAILABLE') {
        return res.json({
          valid: false,
          serialNumber: sn,
          status: record.status,
          soldAt: record.soldAt?.toISOString() ?? null,
          reference: {
            soId: record.soId,
            doId: record.doId,
            soNumber: record.soNumber,
            doNumber: record.doNumber,
          },
          error: `Serial Number '${sn}' ถูกขายออกไปแล้ว (SO: ${record.soNumber ?? '-'})`,
        });
      }

      if (productCode && record.productCode !== productCode) {
        return res.json({
          valid: false,
          serialNumber: sn,
          status: 'AVAILABLE',
          error: `Serial Number '${sn}' เป็นของสินค้า '${record.productCode}' ไม่ตรงกับ '${productCode}'`,
        });
      }

      return res.json({
        valid: true,
        serialNumber: sn,
        status: 'AVAILABLE',
        productCode: record.productCode,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },
};
