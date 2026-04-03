import express from 'express';
import { prisma } from '../lib/prisma';

const router = express.Router();

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

    console.log('[DEBUG] Documents fetched:', {
      quotations: quotations.length,
      invoices: invoices.length,
      receipts: receipts.length
    });

    // 1. Total Revenue = totalSellingPrice from Quotations that have Invoice (QU → INV)
    const quotationsWithInvoice = quotations.filter(q => 
      invoices.some(inv => inv.referenceNo === q.documentNumber)
    );
    const totalRevenue = quotationsWithInvoice.reduce((sum, q) => 
      sum + Number(q.totalSellingPrice || 0), 0
    );

    // 2. Total Cost = totalCost from Quotations that have Invoice (QU → INV)  
    const totalCost = quotationsWithInvoice.reduce((sum, q) => 
      sum + Number(q.totalCost || 0), 0
    );

    // 3. Net Profit = Revenue from Invoices that have Receipt (INV → REC)
    const invoicesWithReceipt = invoices.filter(inv => 
      receipts.some(rec => rec.referenceNo === inv.documentNumber)
    );
    const netProfit = invoicesWithReceipt.reduce((sum, inv) => {
      const linkedQuotation = quotations.find(q => q.documentNumber === inv.referenceNo);
      const cost = linkedQuotation ? Number(linkedQuotation.totalCost || 0) : 0;
      const revenue = Number(inv.totalSellingPrice || 0);
      return sum + (revenue - cost);
    }, 0);

    // 4. Completed Sales = count of Invoices that have Receipt
    const completedSales = invoicesWithReceipt.length;

    // 5. Document counts
    const documentCounts = {
      total: quotations.length + invoices.length + receipts.length,
      quotations: quotations.length,
      invoices: invoices.length,
      receipts: receipts.length
    };

    res.json({
      success: true,
      data: {
        businessMetrics: {
          totalRevenue,
          totalCost,
          netProfit,
          completedSales,
          potentialRevenue: quotationsWithInvoice.length,
          potentialProfit: totalRevenue - totalCost
        },
        documentCounts,
        documents: {
          quotations,
          invoices,
          receipts
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
