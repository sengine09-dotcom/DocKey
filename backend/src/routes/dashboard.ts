import express, { Request } from 'express';
import { prisma } from '../lib/prisma';
import { resolveCompanyContext } from '../lib/companyContext';

const router = express.Router();

router.get('/dashboard/metrics', async (req: Request, res) => {
  try {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const [quotations, invoices, receipts, purchaseOrders, workOrders] = await Promise.all([
      prisma.document.findMany({
        where: { companyId: ctx.companyId, documentType: 'QUOTATION' },
        select: {
          documentNumber: true,
          totalSellingPrice: true,
          quotationDocument: { select: { linkedInvoiceNumber: true } },
        },
      }),
      prisma.document.findMany({
        where: { companyId: ctx.companyId, documentType: 'INVOICE' },
        select: {
          documentNumber: true,
          totalSellingPrice: true,
          invoiceDocument: { select: { linkedReceiptNumber: true } },
        },
      }),
      prisma.document.findMany({
        where: { companyId: ctx.companyId, documentType: 'RECEIPT' },
        select: { referenceNo: true },
      }),
      prisma.document.findMany({
        where: { companyId: ctx.companyId, documentType: 'PURCHASE_ORDER' },
        select: {
          documentNumber: true,
          totalCost: true,
          referenceNo: true,
        },
      }),
      prisma.document.findMany({
        where: { companyId: ctx.companyId, documentType: 'WORK_ORDER' },
        select: { status: true },
      }),
    ]);

    // Sets for fast receipt/invoice lookup
    // Receipts link to invoices via Document.referenceNo
    const receiptLinkedInvoices = new Set(
      receipts.map((r) => r.referenceNo).filter((n): n is string => Boolean(n))
    );
    // Invoices link to receipts via InvoiceDocument.linkedReceiptNumber
    const invoiceWithReceipt = new Set(
      invoices
        .filter((i) => Boolean(i.invoiceDocument?.linkedReceiptNumber))
        .map((i) => i.documentNumber)
    );

    const hasReceipt = (invoiceNo: string) =>
      invoiceWithReceipt.has(invoiceNo) || receiptLinkedInvoices.has(invoiceNo);

    // PO cost lookup by quotation number
    const poCostByQuotation = new Map(
      purchaseOrders
        .filter((po) => Boolean(String(po.referenceNo || '').trim()))
        .map((po) => [String(po.referenceNo).trim(), Number(po.totalCost || 0)])
    );

    // Classify quotations
    const paidQuotations = quotations.filter((q) => {
      const inv = q.quotationDocument?.linkedInvoiceNumber;
      return inv ? hasReceipt(inv) : false;
    });
    const unpaidQuotations = quotations.filter((q) => {
      const inv = q.quotationDocument?.linkedInvoiceNumber;
      return inv ? !hasReceipt(inv) : false;
    });

    const totalRevenue = invoices.reduce((s, i) => s + Number(i.totalSellingPrice || 0), 0);
    const totalCost = purchaseOrders.reduce((s, po) => s + Number(po.totalCost || 0), 0);
    const netProfit = paidQuotations.reduce((s, q) => {
      const revenue = Number(q.totalSellingPrice || 0);
      const cost = poCostByQuotation.get(String(q.documentNumber || '').trim()) ?? 0;
      return s + (revenue - cost);
    }, 0);
    const unpaidRevenue = unpaidQuotations.reduce((s, q) => s + Number(q.totalSellingPrice || 0), 0);

    const activeWorkOrderCount = workOrders.filter(
      (w) => (w.status || '').toLowerCase() !== 'completed'
    ).length;

    res.json({
      success: true,
      data: {
        businessMetrics: {
          totalRevenue,
          totalCost,
          netProfit,
          completedSales: paidQuotations.length,
          unpaidInvoiceCount: unpaidQuotations.length,
          unpaidRevenue,
        },
        documentCounts: {
          total: quotations.length + invoices.length + receipts.length + purchaseOrders.length + workOrders.length,
          quotations: quotations.length,
          invoices: invoices.length,
          receipts: receipts.length,
          purchaseOrders: purchaseOrders.length,
          workOrders: workOrders.length,
          activeWorkOrders: activeWorkOrderCount,
        },
      },
    });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard metrics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
