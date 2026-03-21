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
  paymentTerm: m.termId || '30 Days',
  totalQuantity: toNumber(m.totalQuantity),
  totalSales: toNumber(m.totalAmount),
  status: m.status === 2 ? 'Completed' : 'Active',
  itemCount: m.monitorDetails?.length || 0,
  lastUpdated: m.issDate || new Date().toISOString(),
  color: m.status === 2 ? 'purple' : 'blue',
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
          status: header.status === 'Completed' ? 2 : 1,
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
          status: header.status === 'Completed' ? 2 : 1,
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
