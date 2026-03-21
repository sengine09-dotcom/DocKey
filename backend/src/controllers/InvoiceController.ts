import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const toNumber = (value: any) => (value == null ? 0 : Number(value));

const mapInvoice = (i: any) => ({
  invoiceId: i.invoiceNo,
  invoiceNo: i.invoiceNo,
  customer: i.customerId || '',
  invoiceDate: i.invDate,
  dueDate: null,
  billTo: i.customerId || '',
  shipTo: i.destinationId || '',
  paymentMethod: i.termId || 'Bank Transfer',
  amount: toNumber(i.totalAmount),
  status: i.statusOnline === 2 ? 'Paid' : i.statusOnline === 3 ? 'Overdue' : 'Pending',
  itemCount: i.invoiceDetails?.length || 0,
  lastUpdated: i.invDate || new Date().toISOString(),
  color: i.statusOnline === 2 ? 'green' : i.statusOnline === 3 ? 'red' : 'yellow',
  items: (i.invoiceDetails || []).map((d: any) => ({
    id: d.productId,
    description: d.productId,
    quantity: toNumber(d.quantity).toFixed(3),
    unitPrice: toNumber(d.price).toFixed(3),
    total: toNumber(d.total).toFixed(3),
  })),
});

class InvoiceController {
  static async getAll(_req: Request, res: Response) {
    try {
      const invoices = await prisma.invoice.findMany({
        include: { invoiceDetails: true },
        orderBy: { invDate: 'desc' },
      });
      res.json({ success: true, data: invoices.map(mapInvoice) });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const invoice = await prisma.invoice.findUnique({
        where: { invoiceNo: id },
        include: { invoiceDetails: true },
      });
      if (!invoice) {
        return res.status(404).json({ success: false, message: 'Invoice not found' });
      }
      res.json({ success: true, data: mapInvoice(invoice) });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async save(req: Request, res: Response) {
    try {
      const { header, items } = req.body;
      const invoiceNo: string = header.invoiceNo || header.invoiceId;
      if (!invoiceNo) {
        return res.status(400).json({ success: false, message: 'invoiceNo is required' });
      }

      await prisma.invoice.upsert({
        where: { invoiceNo },
        create: {
          invoiceNo,
          codeNo: null,
          idMonitor: (header.idMonitor || 'MON00000').slice(0, 8),
          isCancel: 'N',
          invDate: header.invoiceDate ? new Date(header.invoiceDate) : null,
          poNo: header.poNo || null,
          doNo: null,
          customerId: header.customer || null,
          agentId: null,
          supplierId: null,
          termId: header.paymentMethod || null,
          transportId: null,
          period: null,
          destinationId: header.shipTo || null,
          eUserId: null,
          totalContainer: 0,
          totalAmount: toNumber(header.total || 0),
          totalQuantity: toNumber(header.totalQuantity || 0),
          comRate: 0,
          remark: header.remark || null,
          vat: Number(header.vat ?? 0),
          statusOnline: Number(header.statusOnline ?? 1),
        },
        update: {
          invDate: header.invoiceDate ? new Date(header.invoiceDate) : null,
          poNo: header.poNo || null,
          customerId: header.customer || null,
          termId: header.paymentMethod || null,
          destinationId: header.shipTo || null,
          totalAmount: toNumber(header.total || 0),
          totalQuantity: toNumber(header.totalQuantity || 0),
          remark: header.remark || null,
          vat: Number(header.vat ?? 0),
          statusOnline: Number(header.statusOnline ?? 1),
        },
      });

      await prisma.invoiceDetail.deleteMany({ where: { invoiceNo } });

      const validItems = (items || []).filter((it: any) => it.id || it.description);
      if (validItems.length > 0) {
        await prisma.invoiceDetail.createMany({
          data: validItems.map((it: any, idx: number) => ({
            invoiceNo,
            item: String(idx + 1).padStart(2, '0'),
            productId: String(it.id || it.description || `P${idx + 1}`).slice(0, 5),
            quantity: toNumber(it.quantity || 0),
            weight: 0,
            price: toNumber(it.unitPrice || 0),
            unitId: null,
            total: toNumber(it.total || 0),
            supplierId: null,
            comRate: 0,
            bag: 0,
          })),
        });
      }

      const saved = await prisma.invoice.findUnique({
        where: { invoiceNo },
        include: { invoiceDetails: true },
      });

      res.json({ success: true, data: mapInvoice(saved) });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.invoiceDetail.deleteMany({ where: { invoiceNo: id } });
      await prisma.invoice.delete({ where: { invoiceNo: id } });
      res.json({ success: true, message: 'Invoice deleted' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default InvoiceController;
