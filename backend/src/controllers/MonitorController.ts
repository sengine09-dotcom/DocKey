import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const toNumber = (value: any) => (value == null ? 0 : Number(value));

const mapMonitor = (m: any) => ({
  monitorId: m.monitorId,
  customer: m.customerId || '',
  poNo: m.poNo || '',
  poDate: m.poDate,
  issuedDate: m.issDate,
  requestDate: m.reqDate,
  destination: m.destinationId || '',
  deliveredTo: '',
  paymentTerm: m.termId || '',
  totalQuantity: toNumber(m.totalQuantity),
  totalSales: toNumber(m.totalAmount),
  status: m.status === 1 ? 'Printed' : 'Unprinted',
  itemCount: m.monitorDetails?.length || 0,
  lastUpdated: m.issDate || new Date().toISOString(),
  color: m.status === 1 ? 'green' : 'yellow',
  items: (m.monitorDetails || []).map((d: any, idx: number) => ({
    id: d.productId,
    product: d.productId,
    packing: d.unitCount || '',
    quantity: toNumber(d.quantity).toFixed(3),
    price: toNumber(d.price).toFixed(3),
    total: toNumber(d.total).toFixed(3),
    item: d.item ?? idx + 1,
  })),
});

class MonitorController {
  static async getNextId(_req: Request, res: Response) {
    try {
      const serverNow = new Date();
      const yy = String(serverNow.getFullYear()).slice(-2);
      const suffix = `/${yy}`;

      const monitors = await prisma.monitor.findMany({
        where: {
          monitorId: {
            endsWith: suffix,
          },
        },
        select: { monitorId: true },
      });

      if (monitors.length === 0) {
        return res.json({
          success: true,
          data: {
            monitorId: `0001/${yy}`,
            serverYear: serverNow.getFullYear(),
          },
        });
      }

      let maxRunningNo = 0;

      for (const monitor of monitors) {
        const id = monitor.monitorId || '';
        const [runningPart, yearPart] = id.split('/');
        if (yearPart === yy && /^\d{4}$/.test(runningPart)) {
          const parsed = Number(runningPart);
          if (!Number.isNaN(parsed) && parsed > maxRunningNo) {
            maxRunningNo = parsed;
          }
        }
      }

      const nextRunningNo = maxRunningNo + 1;
      if (nextRunningNo > 9999) {
        return res.status(409).json({
          success: false,
          message: `Cannot generate Monitor ID for ${yy}. Running number limit reached.`,
        });
      }

      const monitorId = `${String(nextRunningNo).padStart(4, '0')}/${yy}`;

      return res.json({
        success: true,
        data: {
          monitorId,
          serverYear: serverNow.getFullYear(),
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getAll(_req: Request, res: Response) {
    try {
      const monitors = await prisma.monitor.findMany({
        include: { monitorDetails: true },
        orderBy: { issDate: 'desc' },
      });

      res.json({ success: true, data: monitors.map(mapMonitor) });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const monitor = await prisma.monitor.findUnique({
        where: { monitorId: id },
        include: { monitorDetails: true },
      });

      if (!monitor) {
        return res.status(404).json({ success: false, message: 'Monitor not found' });
      }

      res.json({ success: true, data: mapMonitor(monitor) });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async save(req: Request, res: Response) {
    try {
      const { header, items } = req.body;
      const monitorId: string = header.monitorId;

      if (!monitorId) {
        return res.status(400).json({ success: false, message: 'monitorId is required' });
      }

      await prisma.monitor.upsert({
        where: { monitorId },
        create: {
          monitorId,
          isCancel: 'N',
          issDate: header.issuedDate ? new Date(header.issuedDate) : null,
          customerId: header.customer || null,
          supplierId: null,
          termId: header.paymentTerm || null,
          poNo: header.poNo || null,
          poDate: header.poDate ? new Date(header.poDate) : null,
          reqDate: header.requestDate ? new Date(header.requestDate) : null,
          eUserId: null,
          destinationId: header.destination || null,
          totalQuantity: toNumber(header.totalQuantity || 0),
          totalAmount: toNumber(header.totalSales || 0),
          isArranged: 'N',
          remark: header.remark || null,
          status: 0,
          vat: Number(header.vat ?? 0),
        },
        update: {
          issDate: header.issuedDate ? new Date(header.issuedDate) : null,
          customerId: header.customer || null,
          termId: header.paymentTerm || null,
          poNo: header.poNo || null,
          poDate: header.poDate ? new Date(header.poDate) : null,
          reqDate: header.requestDate ? new Date(header.requestDate) : null,
          destinationId: header.destination || null,
          totalQuantity: toNumber(header.totalQuantity || 0),
          totalAmount: toNumber(header.totalSales || 0),
          remark: header.remark || null,
          vat: Number(header.vat ?? 0),
        },
      });

      await prisma.monitorDetail.deleteMany({ where: { idMonitor: monitorId } });

      const validItems = (items || []).filter((it: any) => it.id || it.product);
      if (validItems.length > 0) {
        await prisma.monitorDetail.createMany({
          data: validItems.map((it: any, idx: number) => ({
            idMonitor: monitorId,
            item: idx + 1,
            productId: String(it.id || it.product || `P${idx + 1}`).slice(0, 5),
            quantity: toNumber(it.quantity || 0),
            unitCount: null,
            price: toNumber(it.price || 0),
            total: toNumber(it.total || 0),
            supplierId: null,
          })),
        });
      }

      const saved = await prisma.monitor.findUnique({
        where: { monitorId },
        include: { monitorDetails: true },
      });

      res.json({ success: true, data: mapMonitor(saved) });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async markPrinted(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await prisma.monitor.update({
        where: { monitorId: id },
        data: { status: 1 },
        include: { monitorDetails: true },
      });
      res.json({ success: true, data: mapMonitor(updated) });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.monitorDetail.deleteMany({ where: { idMonitor: id } });
      await prisma.monitor.delete({ where: { monitorId: id } });
      res.json({ success: true, message: 'Monitor deleted' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default MonitorController;
