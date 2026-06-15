import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { resolveCompanyContext } from '../lib/companyContext';

const StockController = {
  // GET /api/stock/summary — current stock per product
  async getSummary(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const products = await prisma.product.findMany({
      where: { companyId: ctx.companyId },
      select: {
        id: true,
        productCode: true,
        productName: true,
        category: true,
        brand: true,
        stockQty: true,
        minQty: true,
        maxQty: true,
      },
      orderBy: { productCode: 'asc' },
    });

    return res.json({ success: true, data: products });
  },

  // GET /api/stock/transactions — movement history (optional ?productCode= or ?docType=)
  async getTransactions(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { productCode, docType, limit = '200' } = req.query as Record<string, string>;

    const rows = await prisma.stockTransaction.findMany({
      where: {
        companyId: ctx.companyId,
        ...(productCode ? { productCode } : {}),
        ...(docType ? { docType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit) || 200, 500),
    });

    // Resolve any createdBy values that are user IDs (26-char ULIDs) to display names
    const userIdPattern = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
    const userIds = [...new Set(
      rows.map((r) => r.createdBy).filter((v): v is string => !!v && userIdPattern.test(v))
    )];

    const userNameMap = new Map<string, string>();
    if (userIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      });
      users.forEach((u) => userNameMap.set(u.id, u.name));
    }

    // Resolve productCode → productName
    const productCodes = [...new Set(rows.map((r) => r.productCode).filter(Boolean))];
    const productNameMap = new Map<string, string>();
    if (productCodes.length > 0) {
      const products = await prisma.product.findMany({
        where: { companyId: ctx.companyId, productCode: { in: productCodes } },
        select: { productCode: true, productName: true },
      });
      products.forEach((p) => productNameMap.set(p.productCode, p.productName));
    }

    const data = rows.map((r) => ({
      ...r,
      productName: productNameMap.get(r.productCode) || '',
      createdBy: (r.createdBy && userNameMap.has(r.createdBy))
        ? userNameMap.get(r.createdBy)!
        : r.createdBy,
    }));

    return res.json({ success: true, data });
  },
};

export default StockController;
