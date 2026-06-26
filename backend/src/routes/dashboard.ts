import express, { Request } from 'express';
import { prisma } from '../lib/prisma';
import { resolveCompanyContext } from '../lib/companyContext';

const router = express.Router();

// Per-company in-memory cache — 30-second TTL
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;

router.get('/dashboard/metrics', async (req: Request, res) => {
  try {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const cached = cache.get(ctx.companyId);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({ success: true, data: cached.data });
    }

    const now = new Date();
    const [
      quotations,
      invoices,
      receipts,
      purchaseOrders,
      workOrders,
      invoiceAgg,
      purchaseAgg,
      overdueInvoiceCount,
    ] = await Promise.all([
      // Quotations: needed for paid/unpaid cross-link logic
      prisma.document.findMany({
        where: { companyId: ctx.companyId, documentType: 'QUOTATION' },
        select: {
          documentNumber: true,
          totalSellingPrice: true,
          quotationDocument: { select: { linkedInvoiceNumber: true } },
        },
      }),
      // Invoices: needed to check receipt linkage (linkedReceiptNumber)
      prisma.document.findMany({
        where: { companyId: ctx.companyId, documentType: 'INVOICE' },
        select: {
          documentNumber: true,
          invoiceDocument: { select: { linkedReceiptNumber: true } },
        },
      }),
      // Receipts: needed for referenceNo → invoice lookup
      prisma.document.findMany({
        where: { companyId: ctx.companyId, documentType: 'RECEIPT' },
        select: { referenceNo: true },
      }),
      // POs: needed for cost-per-quotation lookup
      prisma.document.findMany({
        where: { companyId: ctx.companyId, documentType: 'PURCHASE_ORDER' },
        select: { totalCost: true, referenceNo: true },
      }),
      // Work orders: status only (for active count)
      prisma.document.findMany({
        where: { companyId: ctx.companyId, documentType: 'WORK_ORDER' },
        select: { status: true },
      }),
      // DB-level SUM + COUNT for invoices (faster than summing in JS)
      prisma.document.aggregate({
        where: { companyId: ctx.companyId, documentType: 'INVOICE' },
        _sum: { totalSellingPrice: true },
        _count: { id: true },
      }),
      // DB-level SUM + COUNT for purchase orders
      prisma.document.aggregate({
        where: { companyId: ctx.companyId, documentType: 'PURCHASE_ORDER' },
        _sum: { totalCost: true },
        _count: { id: true },
      }),
      // Overdue invoices: PENDING payment status with dueDate in the past
      prisma.invoiceDocument.count({
        where: {
          paymentStatus: 'PENDING',
          dueDate: { lt: now },
          document: { companyId: ctx.companyId },
        },
      }),
    ]);

    // Fast lookup sets for receipt↔invoice linking
    const receiptLinkedInvoices = new Set(
      receipts.map((r) => r.referenceNo).filter((n): n is string => Boolean(n))
    );
    const invoiceWithReceipt = new Set(
      invoices
        .filter((i) => Boolean(i.invoiceDocument?.linkedReceiptNumber))
        .map((i) => i.documentNumber)
    );
    const hasReceipt = (invoiceNo: string) =>
      invoiceWithReceipt.has(invoiceNo) || receiptLinkedInvoices.has(invoiceNo);

    // PO cost lookup by quotation number (referenceNo = quotation documentNumber)
    const poCostByQuotation = new Map(
      purchaseOrders
        .filter((po) => Boolean(String(po.referenceNo || '').trim()))
        .map((po) => [String(po.referenceNo).trim(), Number(po.totalCost || 0)])
    );

    const paidQuotations = quotations.filter((q) => {
      const inv = q.quotationDocument?.linkedInvoiceNumber;
      return inv ? hasReceipt(inv) : false;
    });
    const unpaidQuotations = quotations.filter((q) => {
      const inv = q.quotationDocument?.linkedInvoiceNumber;
      return inv ? !hasReceipt(inv) : false;
    });

    const totalRevenue = Number(invoiceAgg._sum.totalSellingPrice ?? 0);
    const totalCost = Number(purchaseAgg._sum.totalCost ?? 0);
    const netProfit = paidQuotations.reduce((s, q) => {
      const cost = poCostByQuotation.get(String(q.documentNumber || '').trim()) ?? 0;
      return s + Number(q.totalSellingPrice || 0) - cost;
    }, 0);
    const unpaidRevenue = unpaidQuotations.reduce(
      (s, q) => s + Number(q.totalSellingPrice || 0),
      0
    );
    const activeWorkOrders = workOrders.filter(
      (w) => (w.status || '').toLowerCase() !== 'completed'
    ).length;

    const data = {
      businessMetrics: {
        totalRevenue,
        totalCost,
        netProfit,
        completedSales: paidQuotations.length,
        unpaidInvoiceCount: unpaidQuotations.length,
        unpaidRevenue,
      },
      documentCounts: {
        total:
          quotations.length +
          Number(invoiceAgg._count.id) +
          receipts.length +
          Number(purchaseAgg._count.id) +
          workOrders.length,
        quotations: quotations.length,
        invoices: Number(invoiceAgg._count.id),
        receipts: receipts.length,
        purchaseOrders: Number(purchaseAgg._count.id),
        workOrders: workOrders.length,
        activeWorkOrders,
        overdueInvoice: overdueInvoiceCount,
      },
    };

    cache.set(ctx.companyId, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    res.json({ success: true, data });
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
