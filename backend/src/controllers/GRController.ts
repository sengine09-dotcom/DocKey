import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { resolveCompanyContext } from '../lib/companyContext';
import { recordStockMove } from '../lib/stockService';

const generateGRNumber = async (companyId: string): Promise<string> => {
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = `GR-${yy}-`;
  const existing = await prisma.goodsReceipt.findMany({
    where: { companyId, grNumber: { startsWith: prefix } },
    select: { grNumber: true },
  });
  let maxNum = 0;
  for (const row of existing) {
    const num = parseInt(row.grNumber.slice(prefix.length), 10);
    if (!Number.isNaN(num) && num > maxNum) maxNum = num;
  }
  return `${prefix}${String(maxNum + 1).padStart(6, '0')}`;
};

const GRController = {
  // GET /api/purchase/gr
  async getAll(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const grs = await prisma.goodsReceipt.findMany({
      where: { companyId: ctx.companyId },
      include: { items: { orderBy: { lineNo: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: grs });
  },

  // GET /api/purchase/gr/:id
  async getById(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const gr = await prisma.goodsReceipt.findFirst({
      where: { id: req.params.id, companyId: ctx.companyId },
      include: { items: { orderBy: { lineNo: 'asc' } } },
    });
    if (!gr) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: gr });
  },

  // POST /api/purchase/gr
  async create(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { poId, poNumber, vendorCode, receivedDate, remark, items = [] } = req.body;
    if (!poId?.trim() || !poNumber?.trim()) {
      return res.status(400).json({ success: false, message: 'poId and poNumber are required' });
    }

    // Verify the referenced PO belongs to this company
    const poDoc = await prisma.document.findFirst({
      where: { id: poId.trim(), companyId: ctx.companyId, documentType: 'PURCHASE_ORDER' },
      select: { id: true },
    });
    if (!poDoc) {
      return res.status(400).json({ success: false, message: 'PO not found' });
    }

    const grNumber = await generateGRNumber(ctx.companyId);

    const gr = await prisma.goodsReceipt.create({
      data: {
        grNumber,
        poId: poId.trim(),
        poNumber: poNumber.trim(),
        vendorCode: vendorCode?.trim() || null,
        receivedDate: receivedDate ? new Date(receivedDate) : null,
        remark: remark?.trim() || null,
        status: 'DRAFT',
        receivedBy: ctx.userName,
        companyId: ctx.companyId,
        items: {
          create: (items as any[]).map((item: any, idx: number) => ({
            lineNo: idx + 1,
            productCode: item.productCode?.trim() || null,
            description: item.description?.trim() || '',
            poQty: Number(item.poQty) || 0,
            receivedQty: Number(item.receivedQty) || 0,
            unit: item.unit?.trim() || null,
            unitPrice: Number(item.unitPrice) || 0,
            remark: item.remark?.trim() || null,
          })),
        },
      },
      include: { items: { orderBy: { lineNo: 'asc' } } },
    });
    return res.status(201).json({ success: true, data: gr });
  },

  // PUT /api/purchase/gr/:id
  async update(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const gr = await prisma.goodsReceipt.findFirst({
      where: { id: req.params.id, companyId: ctx.companyId },
    });
    if (!gr) return res.status(404).json({ success: false, message: 'Not found' });
    if (gr.status !== 'DRAFT') return res.status(400).json({ success: false, message: 'Only DRAFT GRs can be edited' });

    const { vendorCode, receivedDate, remark, items = [] } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.gRItem.deleteMany({ where: { grId: gr.id } });
      return tx.goodsReceipt.update({
        where: { id: gr.id },
        data: {
          vendorCode: vendorCode?.trim() || null,
          receivedDate: receivedDate ? new Date(receivedDate) : null,
          remark: remark?.trim() || null,
          items: {
            create: (items as any[]).map((item: any, idx: number) => ({
              lineNo: idx + 1,
              productCode: item.productCode?.trim() || null,
              description: item.description?.trim() || '',
              poQty: Number(item.poQty) || 0,
              receivedQty: Number(item.receivedQty) || 0,
              unit: item.unit?.trim() || null,
              unitPrice: Number(item.unitPrice) || 0,
              remark: item.remark?.trim() || null,
            })),
          },
        },
        include: { items: { orderBy: { lineNo: 'asc' } } },
      });
    });
    return res.json({ success: true, data: updated });
  },

  // DELETE /api/purchase/gr/:id
  async delete(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const isAdmin = String(ctx.role || '').toLowerCase() === 'admin';

    const gr = await prisma.goodsReceipt.findFirst({
      where: { id: req.params.id, companyId: ctx.companyId },
      include: { items: true },
    });
    if (!gr) return res.status(404).json({ success: false, message: 'Not found' });
    if (gr.status === 'CONFIRMED' && !isAdmin) {
      return res.status(403).json({ success: false, message: 'เฉพาะ Admin เท่านั้นที่ลบใบรับสินค้าที่ยืนยันแล้วได้' });
    }

    if (gr.status === 'CONFIRMED') {
      // Reverse stock IN and reset PO status
      const stockItems = gr.items
        .filter((item) => item.productCode && Number(item.receivedQty) > 0)
        .map((item) => ({ productCode: item.productCode!, qty: Number(item.receivedQty) }));

      const productRows = await prisma.product.findMany({
        where: { companyId: ctx.companyId, productCode: { in: stockItems.map((i) => i.productCode) } },
        select: { id: true, productCode: true },
      });
      const productIdMap = new Map(productRows.map((p) => [p.productCode, p.id]));
      const moveItems = stockItems
        .map((i) => ({ ...i, productId: productIdMap.get(i.productCode) || '' }))
        .filter((i) => i.productId);

      await prisma.$transaction(async (tx) => {
        if (moveItems.length > 0) {
          await recordStockMove(tx, {
            items: moveItems,
            docNumber: gr.grNumber,
            docType: 'GR_VOID',
            direction: 'OUT',
            companyId: ctx.companyId,
            docId: gr.id,
            userId: ctx.userName,
          });
        }
        if (gr.poId) {
          await tx.document.update({
            where: { id: gr.poId },
            data: { status: 'Open' },
          });
        }
        await tx.goodsReceipt.delete({ where: { id: gr.id } });
      });
    } else {
      await prisma.goodsReceipt.delete({ where: { id: gr.id } });
    }

    return res.json({ success: true });
  },

  // PATCH /api/purchase/gr/:id/confirm — confirm GR + update stock
  async confirm(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const gr = await prisma.goodsReceipt.findFirst({
      where: { id: req.params.id, companyId: ctx.companyId },
      include: { items: true },
    });
    if (!gr) return res.status(404).json({ success: false, message: 'Not found' });
    if (gr.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Only DRAFT GRs can be confirmed' });
    }
    if (gr.items.length === 0) {
      return res.status(400).json({ success: false, message: 'GR must have at least one item' });
    }

    const stockItems = gr.items
      .filter((item) => item.productCode && Number(item.receivedQty) > 0)
      .map((item) => ({
        productCode: item.productCode!,
        qty: Number(item.receivedQty),
      }));

    const productRows = await prisma.product.findMany({
      where: { companyId: ctx.companyId, productCode: { in: stockItems.map((i) => i.productCode) } },
      select: { id: true, productCode: true },
    });
    const productIdMap = new Map(productRows.map((p) => [p.productCode, p.id]));

    const moveItems = stockItems
      .map((i) => ({ ...i, productId: productIdMap.get(i.productCode) || '' }))
      .filter((i) => i.productId);

    const updated = await prisma.$transaction(async (tx) => {
      if (moveItems.length > 0) {
        await recordStockMove(tx, {
          items: moveItems,
          docNumber: gr.grNumber,
          docType: 'GR',
          direction: 'IN',
          companyId: ctx.companyId,
          docId: gr.id,
          userId: ctx.userName,
        });
      }

      // Update PO status to Completed
      if (gr.poId) {
        await tx.document.update({
          where: { id: gr.poId },
          data: { status: 'Completed' },
        });
      }

      return tx.goodsReceipt.update({
        where: { id: gr.id },
        data: {
          status: 'CONFIRMED',
          confirmedBy: ctx.userName,
          confirmedAt: new Date(),
        },
        include: { items: { orderBy: { lineNo: 'asc' } } },
      });
    });

    return res.json({ success: true, data: updated });
  },
};

export default GRController;
