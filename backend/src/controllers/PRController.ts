import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { resolveCompanyContext } from '../lib/companyContext';

// Auto-number: PR-YY-000001 (e.g. PR-26-000001), scoped per company
const generatePRNumber = async (companyId: string): Promise<string> => {
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = `PR-${yy}-`;

  const existing = await prisma.purchaseRequisition.findMany({
    where: { companyId, prNumber: { startsWith: prefix } },
    select: { prNumber: true },
  });

  let maxNum = 0;
  for (const row of existing) {
    const num = parseInt(row.prNumber.slice(prefix.length), 10);
    if (!Number.isNaN(num) && num > maxNum) maxNum = num;
  }
  return `${prefix}${String(maxNum + 1).padStart(6, '0')}`;
};

const PRController = {
  // GET /api/purchase/pr
  async getAll(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const prs = await prisma.purchaseRequisition.findMany({
      where: { companyId: ctx.companyId },
      include: { items: { orderBy: { lineNo: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: prs });
  },

  // GET /api/purchase/pr/:id
  async getById(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const pr = await prisma.purchaseRequisition.findFirst({
      where: { id: req.params.id, companyId: ctx.companyId },
      include: { items: { orderBy: { lineNo: 'asc' } } },
    });
    if (!pr) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: pr });
  },

  // POST /api/purchase/pr
  async create(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { title, vendorCode, requiredDate, remark, items = [] } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Title is required' });

    const prNumber = await generatePRNumber(ctx.companyId);

    const pr = await prisma.purchaseRequisition.create({
      data: {
        prNumber,
        title: title.trim(),
        requestedBy: ctx.userName,
        vendorCode: vendorCode?.trim() || null,
        requiredDate: requiredDate ? new Date(requiredDate) : null,
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
            estimatedPrice: Number(item.estimatedPrice) || 0,
            remark: item.remark?.trim() || null,
          })),
        },
      },
      include: { items: { orderBy: { lineNo: 'asc' } } },
    });
    return res.status(201).json({ success: true, data: pr });
  },

  // PUT /api/purchase/pr/:id
  async update(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const pr = await prisma.purchaseRequisition.findFirst({
      where: { id: req.params.id, companyId: ctx.companyId },
    });
    if (!pr) return res.status(404).json({ success: false, message: 'Not found' });
    if (pr.status !== 'DRAFT') return res.status(400).json({ success: false, message: 'Only DRAFT PRs can be edited' });

    const { title, vendorCode, requiredDate, remark, items = [] } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Title is required' });

    // Replace items atomically
    const updated = await prisma.$transaction(async (tx) => {
      await tx.pRItem.deleteMany({ where: { prId: pr.id } });
      return tx.purchaseRequisition.update({
        where: { id: pr.id },
        data: {
          title: title.trim(),
          vendorCode: vendorCode?.trim() || null,
          requiredDate: requiredDate ? new Date(requiredDate) : null,
          remark: remark?.trim() || null,
          items: {
            create: (items as any[]).map((item: any, idx: number) => ({
              lineNo: idx + 1,
              productCode: item.productCode?.trim() || null,
              description: item.description?.trim() || '',
              qty: Number(item.qty) || 0,
              unit: item.unit?.trim() || null,
              estimatedPrice: Number(item.estimatedPrice) || 0,
              remark: item.remark?.trim() || null,
            })),
          },
        },
        include: { items: { orderBy: { lineNo: 'asc' } } },
      });
    });
    return res.json({ success: true, data: updated });
  },

  // DELETE /api/purchase/pr/:id
  async delete(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const pr = await prisma.purchaseRequisition.findFirst({
      where: { id: req.params.id, companyId: ctx.companyId },
    });
    if (!pr) return res.status(404).json({ success: false, message: 'Not found' });

    if (ctx.role !== 'admin') return res.status(403).json({ success: false, message: 'เฉพาะ Admin เท่านั้นที่ลบเอกสารได้' });

    await prisma.purchaseRequisition.delete({ where: { id: pr.id } });
    return res.json({ success: true });
  },

  // PATCH /api/purchase/pr/:id/submit  — DRAFT → PENDING_APPROVAL
  async submit(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const pr = await prisma.purchaseRequisition.findFirst({
      where: { id: req.params.id, companyId: ctx.companyId },
      include: { items: true },
    });
    if (!pr) return res.status(404).json({ success: false, message: 'Not found' });
    if (pr.status !== 'DRAFT') return res.status(400).json({ success: false, message: 'Only DRAFT PRs can be submitted' });
    if (pr.items.length === 0) return res.status(400).json({ success: false, message: 'PR must have at least one item' });

    const updated = await prisma.purchaseRequisition.update({
      where: { id: pr.id },
      data: { status: 'PENDING_APPROVAL' },
      include: { items: { orderBy: { lineNo: 'asc' } } },
    });
    return res.json({ success: true, data: updated });
  },

  // PATCH /api/purchase/pr/:id/approve  — Admin only
  async approve(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (ctx.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });

    const pr = await prisma.purchaseRequisition.findFirst({
      where: { id: req.params.id, companyId: ctx.companyId },
    });
    if (!pr) return res.status(404).json({ success: false, message: 'Not found' });
    if (pr.status !== 'PENDING_APPROVAL') return res.status(400).json({ success: false, message: 'Only PENDING_APPROVAL PRs can be approved' });

    const updated = await prisma.purchaseRequisition.update({
      where: { id: pr.id },
      data: { status: 'APPROVED', approvedBy: ctx.userName, approvedAt: new Date() },
      include: { items: { orderBy: { lineNo: 'asc' } } },
    });
    return res.json({ success: true, data: updated });
  },

  // PATCH /api/purchase/pr/:id/convert  — Mark APPROVED PR as CONVERTED (used in PO)
  async convert(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const pr = await prisma.purchaseRequisition.findFirst({
      where: { id: req.params.id, companyId: ctx.companyId },
    });
    if (!pr) return res.status(404).json({ success: false, message: 'Not found' });
    if (pr.status !== 'APPROVED') return res.status(400).json({ success: false, message: 'Only APPROVED PRs can be converted' });

    const updated = await prisma.purchaseRequisition.update({
      where: { id: pr.id },
      data: { status: 'CONVERTED' },
      include: { items: { orderBy: { lineNo: 'asc' } } },
    });
    return res.json({ success: true, data: updated });
  },

  // PATCH /api/purchase/pr/:id/mark-items-converted  — mark specific items as converted to PO
  async markItemsConverted(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const pr = await prisma.purchaseRequisition.findFirst({
      where: { id: req.params.id, companyId: ctx.companyId },
      include: { items: true },
    });
    if (!pr) return res.status(404).json({ success: false, message: 'Not found' });

    const { itemIds, poNumber } = req.body;
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ success: false, message: 'itemIds is required' });
    }
    if (!String(poNumber || '').trim()) {
      return res.status(400).json({ success: false, message: 'poNumber is required' });
    }

    const prItemIdSet = new Set(pr.items.map((i) => i.id));
    const invalid = (itemIds as string[]).filter((id) => !prItemIdSet.has(id));
    if (invalid.length > 0) {
      return res.status(400).json({ success: false, message: 'Some itemIds do not belong to this PR' });
    }

    await prisma.pRItem.updateMany({
      where: { id: { in: itemIds as string[] }, prId: pr.id },
      data: { convertedToPo: true, poNumber: String(poNumber).trim() },
    });

    // Auto-convert PR status when all items are converted
    const allConverted = pr.items.every((i) => (itemIds as string[]).includes(i.id) || i.convertedToPo);
    if (allConverted && pr.status === 'APPROVED') {
      await prisma.purchaseRequisition.update({ where: { id: pr.id }, data: { status: 'CONVERTED' } });
    }

    const updated = await prisma.purchaseRequisition.findFirst({
      where: { id: pr.id },
      include: { items: { orderBy: { lineNo: 'asc' } } },
    });
    return res.json({ success: true, data: updated });
  },

  // PATCH /api/purchase/pr/:id/reject  — Admin only
  async reject(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (ctx.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });

    const pr = await prisma.purchaseRequisition.findFirst({
      where: { id: req.params.id, companyId: ctx.companyId },
    });
    if (!pr) return res.status(404).json({ success: false, message: 'Not found' });
    if (pr.status !== 'PENDING_APPROVAL') return res.status(400).json({ success: false, message: 'Only PENDING_APPROVAL PRs can be rejected' });

    const { reason } = req.body;
    const updated = await prisma.purchaseRequisition.update({
      where: { id: pr.id },
      data: {
        status: 'REJECTED',
        rejectedBy: ctx.userName,
        rejectedAt: new Date(),
        rejectReason: reason?.trim() || null,
      },
      include: { items: { orderBy: { lineNo: 'asc' } } },
    });
    return res.json({ success: true, data: updated });
  },
};

export default PRController;
