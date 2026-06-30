import { Request, Response } from 'express';
import { deleteDocumentByType, getDocumentById, isMainDocumentType, listDocumentsByType, saveDocumentByType } from '../lib/mainDocuments';
import { resolveCompanyContext } from '../lib/companyContext';
import { prisma } from '../lib/prisma';

class DocumentController {
  static async getCounts(req: Request, res: Response) {
    try {
      const ctx = await resolveCompanyContext(req);
      if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const now = new Date();
      const [docGroups, soCount, prCount, grCount, custCount, prodCount, vendorCount, destCount, termCount, unitCount, overdueInvoiceCount] = await Promise.all([
        prisma.document.groupBy({
          by: ['documentType'],
          where: { companyId: ctx.companyId },
          _count: { _all: true },
        }),
        prisma.saleOrder.count({ where: { companyId: ctx.companyId } }),
        prisma.purchaseRequisition.count({ where: { companyId: ctx.companyId } }),
        prisma.goodsReceipt.count({ where: { companyId: ctx.companyId } }),
        prisma.customer.count({ where: { companyId: ctx.companyId } }),
        prisma.product.count({ where: { companyId: ctx.companyId } }),
        prisma.vendor.count({ where: { companyId: ctx.companyId } }),
        prisma.destination.count({ where: { companyId: ctx.companyId } }),
        prisma.paymentTerm.count({ where: { companyId: ctx.companyId } }),
        prisma.unitCode.count({ where: { companyId: ctx.companyId } }),
        prisma.invoiceDocument.count({
          where: {
            paymentStatus: 'PENDING',
            dueDate: { lt: now },
            document: { companyId: ctx.companyId },
          },
        }),
      ]);

      const PRISMA_TO_APP: Record<string, string> = {
        QUOTATION: 'quotation',
        DEPOSIT_INVOICE: 'deposit_invoice',
        DEPOSIT_RECEIPT: 'deposit_receipt',
        INVOICE: 'invoice',
        RECEIPT: 'receipt',
        PURCHASE_ORDER: 'purchase_order',
        WORK_ORDER: 'work_order',
      };

      const counts: Record<string, number> = {
        so: soCount,
        pr: prCount,
        gr: grCount,
        customer: custCount,
        product: prodCount,
        vendor: vendorCount,
        destination: destCount,
        paymentTerm: termCount,
        endUser: 0,
        unitCode: unitCount,
        overdueInvoice: overdueInvoiceCount,
      };
      for (const g of docGroups) {
        const key = PRISMA_TO_APP[String(g.documentType)];
        if (key) counts[key] = g._count._all;
      }

      return res.json({ success: true, data: counts });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }


  static async getAll(req: Request, res: Response) {
    try {
      const ctx = await resolveCompanyContext(req);
      if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { type } = req.params;
      if (!isMainDocumentType(type)) {
        return res.status(400).json({ success: false, message: 'Invalid document type' });
      }

      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const search = req.query.search ? String(req.query.search).trim() : undefined;
      const customer = req.query.customer ? String(req.query.customer).trim() : undefined;
      const vendorCode = req.query.vendorCode ? String(req.query.vendorCode).trim() : undefined;

      const data = await listDocumentsByType(type, ctx.companyId, { limit, search, customer, vendorCode });
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const ctx = await resolveCompanyContext(req);
      if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { type, id } = req.params;
      if (!isMainDocumentType(type)) {
        return res.status(400).json({ success: false, message: 'Invalid document type' });
      }
      const data = await getDocumentById(type, id, ctx.companyId);
      if (!data) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }

      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async save(req: Request, res: Response) {
    try {
      const ctx = await resolveCompanyContext(req);
      if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { type } = req.params;
      if (!isMainDocumentType(type)) {
        return res.status(400).json({ success: false, message: 'Invalid document type' });
      }
      const data = await saveDocumentByType(type, req.body, ctx.companyId, ctx.userName);
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const ctx = await resolveCompanyContext(req);
      if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { type, id } = req.params;
      if (!isMainDocumentType(type)) {
        return res.status(400).json({ success: false, message: 'Invalid document type' });
      }

      const deleted = await deleteDocumentByType(type, id, ctx.companyId);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }

      return res.json({ success: true, message: 'Document deleted' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async markPaid(req: Request, res: Response) {
    try {
      const ctx = await resolveCompanyContext(req);
      if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { id } = req.params;
      const doc = await prisma.document.findFirst({
        where: { id, companyId: ctx.companyId, documentType: 'INVOICE' },
        select: { id: true },
      });
      if (!doc) return res.status(404).json({ success: false, message: 'Invoice not found' });

      await prisma.$transaction([
        prisma.invoiceDocument.update({
          where: { id },
          data: { paymentStatus: 'PAID' },
        }),
        prisma.document.update({
          where: { id },
          data: { status: 'Completed' },
        }),
      ]);

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default DocumentController;
