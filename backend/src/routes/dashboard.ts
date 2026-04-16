import express, { Request } from 'express';
import { prisma } from '../lib/prisma';
import { resolveCompanyContext } from '../lib/companyContext';

const router = express.Router();

const attachCustomerNames = async (documents: any[], companyId: string) => {
  const customerCodes = Array.from(new Set(
    documents
      .map((document) => String(document?.customerId || '').trim())
      .filter(Boolean)
  ));

  if (customerCodes.length === 0) {
    return documents;
  }

  const customers = await prisma.customer.findMany({
    where: {
      companyId,
      customerCode: { in: customerCodes },
    },
    select: {
      customerCode: true,
      customerName: true,
    },
  });

  const customerNameMap = customers.reduce((result, customer) => {
    result[customer.customerCode] = customer.customerName || customer.customerCode;
    return result;
  }, {} as Record<string, string>);

  return documents.map((document) => ({
    ...document,
    customerName: customerNameMap[String(document?.customerId || '').trim()] || '',
  }));
};

// Get business metrics for dashboard
router.get('/dashboard/metrics', async (req: Request, res) => {
  try {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    console.log('[DEBUG] Dashboard metrics API called');

    // Fetch all documents scoped by company
    const [quotations, invoices, receipts, depositReceipts, purchaseOrders] = await Promise.all([
      prisma.document.findMany({
        where: { companyId: ctx.companyId, documentType: 'QUOTATION' },
        include: {
          quotationDocument: true,
          items: true
        }
      }),
      prisma.document.findMany({
        where: { companyId: ctx.companyId, documentType: 'INVOICE' },
        include: {
          invoiceDocument: true,
          items: true
        }
      }),
      prisma.document.findMany({
        where: { companyId: ctx.companyId, documentType: 'RECEIPT' },
        include: {
          receiptDocument: true,
          items: true
        }
      }),
      prisma.document.findMany({
        where: { companyId: ctx.companyId, documentType: 'DEPOSIT_RECEIPT' },
        include: {
          depositReceiptDocument: true,
          items: true
        }
      }),
      prisma.document.findMany({
        where: { companyId: ctx.companyId, documentType: 'PURCHASE_ORDER' },
        include: {
          purchaseOrderDocument: true,
          items: true
        }
      })
    ]);

    const [quotationsWithCustomerNames, invoicesWithCustomerNames, receiptsWithCustomerNames, depositReceiptsWithCustomerNames, purchaseOrdersWithCustomerNames] = await Promise.all([
      attachCustomerNames(quotations, ctx.companyId),
      attachCustomerNames(invoices, ctx.companyId),
      attachCustomerNames(receipts, ctx.companyId),
      attachCustomerNames(depositReceipts, ctx.companyId),
      attachCustomerNames(purchaseOrders, ctx.companyId),
    ]);

    console.log('[DEBUG] Documents fetched:', {
      quotations: quotationsWithCustomerNames.length,
      invoices: invoicesWithCustomerNames.length,
      receipts: receiptsWithCustomerNames.length,
      depositReceipts: depositReceiptsWithCustomerNames.length,
      purchaseOrders: purchaseOrdersWithCustomerNames.length
    });

    // 1. Total Revenue = totalSellingPrice from all invoices
    const totalRevenue = invoicesWithCustomerNames.reduce((sum, invoice) => 
      sum + Number(invoice.totalSellingPrice || 0), 0
    );

    const purchaseOrderByQuotationNumber = new Map(
      purchaseOrdersWithCustomerNames
        .filter((purchaseOrder) => Boolean(String(purchaseOrder.referenceNo || '').trim()))
        .map((purchaseOrder) => [String(purchaseOrder.referenceNo || '').trim(), purchaseOrder])
    ) as Map<string, any>;

    const getPurchaseOrderCostForQuotation = (quotation: any) => {
      const quotationNumber = String(quotation?.documentNumber || '').trim();
      if (!quotationNumber) return 0;
      const linkedPurchaseOrder = purchaseOrderByQuotationNumber.get(quotationNumber);
      return Number(linkedPurchaseOrder?.totalCost || 0);
    };

    // 2. Total Cost = totalCost from all purchase orders
    const totalCost = purchaseOrdersWithCustomerNames.reduce((sum, purchaseOrder) => 
      sum + Number(purchaseOrder.totalCost || 0), 0
    );

    const linkedInvoiceNumbersFromQuotations = new Set(
      quotationsWithCustomerNames
        .map(quotation => quotation.quotationDocument?.linkedInvoiceNumber)
        .filter((documentNumber): documentNumber is string => Boolean(documentNumber))
    );

    const linkedInvoiceNumbersFromReceipts = new Set(
      receiptsWithCustomerNames
        .map(receipt => receipt.receiptDocument?.linkedInvoiceNumber || receipt.referenceNo)
        .filter((documentNumber): documentNumber is string => Boolean(documentNumber))
    );

    const invoicesWithLinkedReceipt = new Set(
      invoicesWithCustomerNames
        .filter(invoice => Boolean(invoice.invoiceDocument?.linkedReceiptNumber))
        .map(invoice => invoice.documentNumber)
    );

    const isInvoiceLinkedFromQuotation = (invoice: typeof invoicesWithCustomerNames[number]) =>
      linkedInvoiceNumbersFromQuotations.has(invoice.documentNumber);

    const hasReceiptForInvoice = (invoice: typeof invoicesWithCustomerNames[number]) =>
      invoicesWithLinkedReceipt.has(invoice.documentNumber) ||
      linkedInvoiceNumbersFromReceipts.has(invoice.documentNumber);

    const paidQuotations = quotationsWithCustomerNames.filter(quotation => {
      const linkedInvoiceNumber = quotation.quotationDocument?.linkedInvoiceNumber;
      if (!linkedInvoiceNumber) return false;
      return linkedInvoiceNumbersFromReceipts.has(linkedInvoiceNumber) ||
        invoicesWithCustomerNames.some(invoice =>
          invoice.documentNumber === linkedInvoiceNumber && hasReceiptForInvoice(invoice)
        );
    });

    const unpaidQuotations = quotationsWithCustomerNames.filter(quotation => {
      const linkedInvoiceNumber = quotation.quotationDocument?.linkedInvoiceNumber;
      if (!linkedInvoiceNumber) return false;
      return !(
        linkedInvoiceNumbersFromReceipts.has(linkedInvoiceNumber) ||
        invoicesWithCustomerNames.some(invoice =>
          invoice.documentNumber === linkedInvoiceNumber && hasReceiptForInvoice(invoice)
        )
      );
    });

    // 3. Completed Sales = count of Invoices that have Receipt
    const invoicesWithReceipt = invoicesWithCustomerNames.filter(inv => 
      hasReceiptForInvoice(inv)
    );
    const completedSales = paidQuotations.length;

    const unpaidInvoices = invoicesWithCustomerNames.filter(inv => {
      const isLinkedFromQuotation = isInvoiceLinkedFromQuotation(inv);
      const hasReceipt = hasReceiptForInvoice(inv);
      return isLinkedFromQuotation && !hasReceipt;
    });
    const unpaidInvoiceCount = unpaidQuotations.length;
    const unpaidRevenue = unpaidQuotations.reduce((sum, quotation) => 
      sum + Number(quotation.totalSellingPrice || 0), 0
    );

    // 4. Net Profit/Loss = realized invoice sales from receipts minus linked PO cost
    const netProfit = paidQuotations.reduce((sum, quotation) => {
      const realizedRevenue = Number(quotation.totalSellingPrice || 0);
      const cost = getPurchaseOrderCostForQuotation(quotation);
      return sum + (realizedRevenue - cost);
    }, 0);

    // 5. Document counts
    const documentCounts = {
      total: quotationsWithCustomerNames.length + invoicesWithCustomerNames.length + receiptsWithCustomerNames.length + depositReceiptsWithCustomerNames.length + purchaseOrdersWithCustomerNames.length,
      quotations: quotationsWithCustomerNames.length,
      invoices: invoicesWithCustomerNames.length,
      receipts: receiptsWithCustomerNames.length,
      depositReceipts: depositReceiptsWithCustomerNames.length,
      purchaseOrders: purchaseOrdersWithCustomerNames.length
    };

    res.json({
      success: true,
      data: {
        businessMetrics: {
          totalRevenue,
          totalCost,
          netProfit,
          completedSales,
          unpaidInvoiceCount,
          unpaidRevenue,
          potentialRevenue: quotations.length,
          potentialProfit: totalRevenue - totalCost
        },
        documentCounts,
        documents: {
          quotations: quotationsWithCustomerNames,
          invoices: invoicesWithCustomerNames,
          receipts: receiptsWithCustomerNames,
          depositReceipts: depositReceiptsWithCustomerNames,
          purchaseOrders: purchaseOrdersWithCustomerNames
        }
      }
    });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard metrics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
