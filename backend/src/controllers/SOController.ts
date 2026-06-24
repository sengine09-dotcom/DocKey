import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { resolveCompanyContext } from '../lib/companyContext';

const generateSONumber = async (companyId: string): Promise<string> => {
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = `SO-${yy}-`;
  const existing = await prisma.saleOrder.findMany({
    where: { companyId, soNumber: { startsWith: prefix } },
    select: { soNumber: true },
  });
  let maxNum = 0;
  for (const row of existing) {
    const num = parseInt(row.soNumber.slice(prefix.length), 10);
    if (!Number.isNaN(num) && num > maxNum) maxNum = num;
  }
  return `${prefix}${String(maxNum + 1).padStart(6, '0')}`;
};

const itemsInclude = { items: { orderBy: { lineNo: 'asc' as const } } };

const SOController = {
  async getAll(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const sos = await prisma.saleOrder.findMany({
      where: { companyId: ctx.companyId },
      include: itemsInclude,
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: sos });
  },

  async getById(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const so = await prisma.saleOrder.findFirst({
      where: { id: req.params.id, companyId: ctx.companyId },
      include: itemsInclude,
    });
    if (!so) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: so });
  },

  async create(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { customerCode, customerName, salesPerson, soDate, requiredDate, paymentTerm, remark, items = [] } = req.body;
    if (!customerName?.trim()) return res.status(400).json({ success: false, message: 'customerName is required' });

    const soNumber = await generateSONumber(ctx.companyId);

    const so = await prisma.saleOrder.create({
      data: {
        soNumber,
        customerCode: customerCode?.trim() || null,
        customerName: customerName.trim(),
        salesPerson: salesPerson?.trim() || ctx.userName || null,
        soDate: soDate ? new Date(soDate) : new Date(),
        requiredDate: requiredDate ? new Date(requiredDate) : null,
        paymentTerm: paymentTerm?.trim() || null,
        remark: remark?.trim() || null,
        status: 'DRAFT',
        companyId: ctx.companyId,
        items: {
          create: (items as any[]).map((item: any, idx: number) => ({
            lineNo: idx + 1,
            productCode: item.productCode?.trim() || null,
            description: item.description?.trim() || '',
            qty: Number(item.qty) || 0,
            unit: item.unit?.trim() || null,
            unitPrice: Number(item.unitPrice) || 0,
            discount: Number(item.discount) || 0,
            amount: Number(item.amount) || 0,
            remark: item.remark?.trim() || null,
          })),
        },
      },
      include: itemsInclude,
    });
    return res.status(201).json({ success: true, data: so });
  },

  async update(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const so = await prisma.saleOrder.findFirst({
      where: { id: req.params.id, companyId: ctx.companyId },
    });
    if (!so) return res.status(404).json({ success: false, message: 'Not found' });
    if (so.status !== 'DRAFT') return res.status(400).json({ success: false, message: 'Only DRAFT SO can be edited' });

    const { customerCode, customerName, salesPerson, soDate, requiredDate, paymentTerm, remark, items = [] } = req.body;
    if (!customerName?.trim()) return res.status(400).json({ success: false, message: 'customerName is required' });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.sOItem.deleteMany({ where: { soId: so.id } });
      return tx.saleOrder.update({
        where: { id: so.id },
        data: {
          customerCode: customerCode?.trim() || null,
          customerName: customerName.trim(),
          salesPerson: salesPerson?.trim() || null,
          soDate: soDate ? new Date(soDate) : so.soDate,
          requiredDate: requiredDate ? new Date(requiredDate) : null,
          paymentTerm: paymentTerm?.trim() || null,
          remark: remark?.trim() || null,
          items: {
            create: (items as any[]).map((item: any, idx: number) => ({
              lineNo: idx + 1,
              productCode: item.productCode?.trim() || null,
              description: item.description?.trim() || '',
              qty: Number(item.qty) || 0,
              unit: item.unit?.trim() || null,
              unitPrice: Number(item.unitPrice) || 0,
              discount: Number(item.discount) || 0,
              amount: Number(item.amount) || 0,
              remark: item.remark?.trim() || null,
            })),
          },
        },
        include: itemsInclude,
      });
    });
    return res.json({ success: true, data: updated });
  },

  async delete(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const so = await prisma.saleOrder.findFirst({
      where: { id: req.params.id, companyId: ctx.companyId },
    });
    if (!so) return res.status(404).json({ success: false, message: 'Not found' });
    const canDelete = so.status === 'DRAFT' || ctx.role === 'admin';
    if (!canDelete) return res.status(403).json({ success: false, message: 'เฉพาะ Admin เท่านั้นที่ลบเอกสารที่ไม่ใช่ Draft ได้' });

    await prisma.saleOrder.delete({ where: { id: so.id } });
    return res.json({ success: true });
  },

  // DRAFT → CONFIRMED
  async confirm(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const so = await prisma.saleOrder.findFirst({
      where: { id: req.params.id, companyId: ctx.companyId },
      include: itemsInclude,
    });
    if (!so) return res.status(404).json({ success: false, message: 'Not found' });
    if (so.status !== 'DRAFT') return res.status(400).json({ success: false, message: 'Only DRAFT SO can be confirmed' });
    if (so.items.length === 0) return res.status(400).json({ success: false, message: 'SO must have at least one item' });

    const updated = await prisma.saleOrder.update({
      where: { id: so.id },
      data: { status: 'CONFIRMED' },
      include: itemsInclude,
    });
    return res.json({ success: true, data: updated });
  },

  // DRAFT|CONFIRMED → CANCELLED
  async cancel(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const so = await prisma.saleOrder.findFirst({
      where: { id: req.params.id, companyId: ctx.companyId },
    });
    if (!so) return res.status(404).json({ success: false, message: 'Not found' });
    if (!['DRAFT', 'CONFIRMED'].includes(so.status)) {
      return res.status(400).json({ success: false, message: 'Only DRAFT or CONFIRMED SO can be cancelled' });
    }

    const updated = await prisma.saleOrder.update({
      where: { id: so.id },
      data: { status: 'CANCELLED' },
      include: itemsInclude,
    });
    return res.json({ success: true, data: updated });
  },

  // Mark SOItems as converted to PR
  async markItemsConverted(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const so = await prisma.saleOrder.findFirst({
      where: { id: req.params.id, companyId: ctx.companyId },
      include: itemsInclude,
    });
    if (!so) return res.status(404).json({ success: false, message: 'Not found' });

    const { itemIds, prNumber } = req.body;
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ success: false, message: 'itemIds is required' });
    }
    if (!String(prNumber || '').trim()) {
      return res.status(400).json({ success: false, message: 'prNumber is required' });
    }

    const soItemIdSet = new Set(so.items.map((i) => i.id));
    const invalid = (itemIds as string[]).filter((id) => !soItemIdSet.has(id));
    if (invalid.length > 0) {
      return res.status(400).json({ success: false, message: 'Some itemIds do not belong to this SO' });
    }

    await prisma.sOItem.updateMany({
      where: { id: { in: itemIds as string[] }, soId: so.id },
      data: { convertedToPr: true, prNumber: String(prNumber).trim() },
    });

    // Transition to IN_PROGRESS when first PR is created
    if (so.status === 'CONFIRMED') {
      await prisma.saleOrder.update({ where: { id: so.id }, data: { status: 'IN_PROGRESS' } });
    }

    const updated = await prisma.saleOrder.findFirst({
      where: { id: so.id },
      include: itemsInclude,
    });
    return res.json({ success: true, data: updated });
  },

  async getWorkflowStatus(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { companyId } = ctx;
    const soId = req.params.id;

    const so = await prisma.saleOrder.findFirst({
      where: { id: soId, companyId },
      select: { id: true },
    });
    if (!so) return res.status(404).json({ success: false, message: 'Not found' });

    const [diDoc, drDoc, invDoc, reDoc] = await Promise.all([
      prisma.document.findFirst({
        where: { depositInvoiceDocument: { linkedSOId: soId }, companyId },
        select: {
          documentNumber: true,
          status: true,
          depositInvoiceDocument: { select: { depositPercentage: true, depositAmount: true } },
        },
      }),
      prisma.document.findFirst({
        where: { depositReceiptDocument: { linkedSOId: soId }, companyId },
        select: {
          documentNumber: true,
          status: true,
          depositReceiptDocument: { select: { paymentAmount: true, receivedDate: true } },
        },
      }),
      prisma.document.findFirst({
        where: { invoiceDocument: { linkedSOId: soId }, companyId },
        select: { documentNumber: true, status: true, totalAmount: true },
      }),
      prisma.document.findFirst({
        where: { receiptDocument: { linkedSOId: soId }, companyId },
        select: {
          documentNumber: true,
          status: true,
          totalAmount: true,
          receiptDocument: { select: { receivedDate: true } },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        di: diDoc ? {
          documentNumber: diDoc.documentNumber,
          status: diDoc.status,
          depositPercentage: Number(diDoc.depositInvoiceDocument?.depositPercentage ?? 0),
          depositAmount: Number(diDoc.depositInvoiceDocument?.depositAmount ?? 0),
        } : null,
        dr: drDoc ? {
          documentNumber: drDoc.documentNumber,
          status: drDoc.status,
          paymentAmount: Number(drDoc.depositReceiptDocument?.paymentAmount ?? 0),
          receivedDate: drDoc.depositReceiptDocument?.receivedDate?.toISOString() ?? null,
        } : null,
        invoice: invDoc ? {
          documentNumber: invDoc.documentNumber,
          status: invDoc.status,
          total: Number(invDoc.totalAmount ?? 0),
        } : null,
        receipt: reDoc ? {
          documentNumber: reDoc.documentNumber,
          status: reDoc.status,
          total: Number(reDoc.totalAmount ?? 0),
          receivedDate: reDoc.receiptDocument?.receivedDate?.toISOString() ?? null,
        } : null,
      },
    });
  },
};

export default SOController;
