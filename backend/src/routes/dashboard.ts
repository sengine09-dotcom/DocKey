import express from 'express';
import { prisma } from '../lib/prisma';

const router = express.Router();

const attachCustomerNames = async (documents: any[]) => {
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
router.get('/dashboard/metrics', async (_req, res) => {
  try {
    console.log('[DEBUG] Dashboard metrics API called');
    
    // Fetch all documents
    const [quotations, invoices, receipts] = await Promise.all([
      prisma.document.findMany({
        where: { documentType: 'QUOTATION' },
        include: {
          quotationDocument: true,
          items: true
        }
      }),
      prisma.document.findMany({
        where: { documentType: 'INVOICE' },
        include: {
          invoiceDocument: true,
          items: true
        }
      }),
      prisma.document.findMany({
        where: { documentType: 'RECEIPT' },
        include: {
          receiptDocument: true,
          items: true
        }
      })
    ]);

    const [quotationsWithCustomerNames, invoicesWithCustomerNames, receiptsWithCustomerNames] = await Promise.all([
      attachCustomerNames(quotations),
      attachCustomerNames(invoices),
      attachCustomerNames(receipts),
    ]);

    console.log('[DEBUG] Documents fetched:', {
      quotations: quotationsWithCustomerNames.length,
      invoices: invoicesWithCustomerNames.length,
      receipts: receiptsWithCustomerNames.length
    });

    // 1. Total Revenue = totalSellingPrice from all invoices
    const totalRevenue = quotationsWithCustomerNames.reduce((sum, quotation) => 
      sum + Number(quotation.totalSellingPrice || 0), 0
    );

    // 2. Total Cost = totalCost from all invoices
    const totalCost = quotationsWithCustomerNames.reduce((sum, quotation) => 
      sum + Number(quotation.totalCost || 0), 0
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

    // 4. Net Profit/Loss = realized invoice sales from receipts minus invoice cost
    const netProfit = paidQuotations.reduce((sum, quotation) => {
      const realizedRevenue = Number(quotation.totalSellingPrice || 0);
      const cost = Number(quotation.totalCost || 0);
      return sum + (realizedRevenue - cost);
    }, 0);

    // 5. Document counts
    const documentCounts = {
      total: quotationsWithCustomerNames.length + invoicesWithCustomerNames.length + receiptsWithCustomerNames.length,
      quotations: quotationsWithCustomerNames.length,
      invoices: invoicesWithCustomerNames.length,
      receipts: receiptsWithCustomerNames.length
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
          receipts: receiptsWithCustomerNames
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
