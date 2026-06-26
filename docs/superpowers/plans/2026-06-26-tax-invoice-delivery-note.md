# Tax Invoice / Delivery Note (3-in-1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ขยาย INVOICE DocumentType ให้รองรับใบกำกับภาษี/ใบส่งสินค้า 3-in-1 พร้อม snapshot ข้อมูลลูกค้า, payment status, พิมพ์ 3 ชุด, และ OVERDUE counter บน Dashboard

**Architecture:** เพิ่ม 3 columns ใน `InvoiceDocument` table (customerTaxId, customerBranch, paymentStatus) — backend snapshots ข้อมูล Customer ณ เวลา save, คำนวณ OVERDUE แบบ runtime ไม่ใช้ scheduled job — frontend เพิ่ม UI fields, 3-page print component, และ OVERDUE badge บน Dashboard

**Tech Stack:** Prisma ORM + MySQL, Express.js, React + TypeScript, CSS @media print

## Global Constraints

- `paymentStatus` values: `PENDING` | `OVERDUE` | `PAID` เท่านั้น (OVERDUE ไม่เก็บใน DB — คำนวณ runtime)
- Customer Tax ID และ Branch ต้อง snapshot ณ วันออกบิล — ดึงจาก `customerCodes` array ที่โหลดไว้แล้วใน `SalesDocuments.tsx`
- เลขทศนิยมทั้งหมดใช้ Decimal(19,4) ใน DB และ 2 ตำแหน่งในการแสดงผล
- GR gate (ต้องรับสินค้าก่อนออกบิล) ยังคงอยู่ — DR gate (ต้องมีใบรับมัดจำ) ถูก**ลบออก**
- SO status ต้อง `CONFIRMED` หรือ `IN_PROGRESS` ก่อนสร้าง Invoice
- ไม่ใช้ emoji ในโค้ด

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/prisma/schema.prisma` | Modify | Add 3 fields to InvoiceDocument model |
| `backend/prisma/migrations/` | Auto-create | Migration for new columns |
| `backend/src/lib/mainDocuments.ts` | Modify | Save/read customerTaxId, customerBranch, paymentStatus; remove DR gate |
| `backend/src/controllers/DocumentController.ts` | Modify | Add markPaid method + update getCounts |
| `backend/src/routes/documents.ts` | Modify | Add PATCH mark-paid route |
| `backend/src/lib/__tests__/mainDocuments.invoice.test.ts` | Create | Unit tests for paymentStatus computation |
| `frontend/src/pages/documents/documentShared.ts` | Modify | Update buildInvoiceFromSO to accept customerTaxId/Branch |
| `frontend/src/pages/documents/SalesDocuments.tsx` | Modify | Lookup customer tax data before building invoice |
| `frontend/src/components/Documents/AllDocumentForm.tsx` | Modify | Add Tax ID/Branch display, paymentStatus badge, Mark Paid button, Due Date auto-calc |
| `frontend/src/pages/documents/SOTab.tsx` | Modify | Add "ออกใบกำกับภาษี" button for CONFIRMED SO without invoice |
| `frontend/src/components/Documents/InvoicePrintLayout.tsx` | Create | 3-page print component |
| `frontend/src/pages/Dashboard.tsx` | Modify | Add OVERDUE invoice counter |

---

### Task 1: DB Schema — Add 3 columns to InvoiceDocument

**Files:**
- Modify: `backend/prisma/schema.prisma` (InvoiceDocument model, ~lines 280-292)
- Auto-create: `backend/prisma/migrations/` (via prisma migrate)

**Interfaces:**
- Produces: `prisma.invoiceDocument` Prisma client gains `.customerTaxId`, `.customerBranch`, `.paymentStatus` fields

- [ ] **Step 1: Add fields to schema.prisma**

Find the `model InvoiceDocument` block and add the 3 new fields after the existing `linkedSOId` line:

```prisma
model InvoiceDocument {
  id                         String    @id @map("ID") @db.Char(26)
  documentNumber             String    @map("DocumentNumber") @db.Char(26)
  dueDate                    DateTime? @map("DueDate")
  doNo                       String?   @map("DoNo") @db.VarChar(255)
  linkedReceiptId            String?   @map("LinkedReceiptId") @db.VarChar(26)
  linkedReceiptNumber        String?   @map("LinkedReceiptNumber") @db.VarChar(50)
  linkedDepositReceiptId     String?   @map("LinkedDepositReceiptId") @db.VarChar(26)
  linkedDepositReceiptNumber String?   @map("LinkedDepositReceiptNumber") @db.VarChar(50)
  depositAmountDeducted      Decimal?  @map("DepositAmountDeducted") @db.Decimal(19, 4)
  linkedSOId                 String?   @map("LinkedSOId") @db.VarChar(191)
  customerTaxId              String?   @map("CustomerTaxId") @db.VarChar(20)
  customerBranch             String?   @map("CustomerBranch") @db.VarChar(100)
  paymentStatus              String    @default("PENDING") @map("PaymentStatus") @db.VarChar(20)
  document                   Document  @relation(fields: [id], references: [id], onDelete: Cascade, onUpdate: Cascade)
}
```

- [ ] **Step 2: Run migration**

```bash
cd /home/po/DocKey/backend && npx prisma migrate dev --name add_invoice_tax_fields
```

Expected output: `✓ Generated Prisma Client` and migration file created in `prisma/migrations/`

- [ ] **Step 3: Verify Prisma client regenerated**

```bash
cd /home/po/DocKey/backend && npx prisma generate
```

Expected: `✓ Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: add customerTaxId, customerBranch, paymentStatus columns to InvoiceDocument"
```

---

### Task 2: Backend — mainDocuments.ts: save new fields + remove DR gate

**Files:**
- Modify: `backend/src/lib/mainDocuments.ts`
- Create: `backend/src/lib/__tests__/mainDocuments.invoice.test.ts`

**Interfaces:**
- Consumes: `InvoiceDocument` Prisma model with new fields from Task 1
- Produces:
  - `buildSubtypeUpsert('invoice', ...)` now saves `customerTaxId`, `customerBranch`, `paymentStatus`
  - `mapDocumentRecord(...)` for invoice now returns `{ customerTaxId: string, customerBranch: string, paymentStatus: 'PENDING' | 'OVERDUE' | 'PAID' }`
  - DR gate removed — invoice can be created from SO without deposit receipt

- [ ] **Step 1: Write the failing test**

Create `backend/src/lib/__tests__/mainDocuments.invoice.test.ts`:

```typescript
import { computePaymentStatus } from '../mainDocuments';

describe('computePaymentStatus', () => {
  const pastDate = new Date(Date.now() - 86400_000 * 2); // 2 days ago
  const futureDate = new Date(Date.now() + 86400_000 * 10); // 10 days from now

  it('returns PAID when paymentStatus is PAID regardless of dueDate', () => {
    expect(computePaymentStatus('PAID', pastDate)).toBe('PAID');
    expect(computePaymentStatus('PAID', null)).toBe('PAID');
  });

  it('returns OVERDUE when PENDING and dueDate is in the past', () => {
    expect(computePaymentStatus('PENDING', pastDate)).toBe('OVERDUE');
  });

  it('returns PENDING when PENDING and dueDate is in the future', () => {
    expect(computePaymentStatus('PENDING', futureDate)).toBe('PENDING');
  });

  it('returns PENDING when PENDING and no dueDate', () => {
    expect(computePaymentStatus('PENDING', null)).toBe('PENDING');
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /home/po/DocKey/backend && npx jest --testPathPattern="mainDocuments.invoice" --no-coverage
```

Expected: FAIL — `computePaymentStatus` not exported

- [ ] **Step 3: Export computePaymentStatus from mainDocuments.ts**

Add this function near the top of the file (after the existing helper functions, before `buildSubtypeUpsert`):

```typescript
export const computePaymentStatus = (
  stored: string | null | undefined,
  dueDate: Date | null | undefined,
): 'PENDING' | 'OVERDUE' | 'PAID' => {
  if (stored === 'PAID') return 'PAID';
  if (stored === 'PENDING' && dueDate && dueDate < new Date()) return 'OVERDUE';
  return 'PENDING';
};
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd /home/po/DocKey/backend && npx jest --testPathPattern="mainDocuments.invoice" --no-coverage
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Update buildSubtypeUpsert for invoice — save new fields**

Find the `if (type === 'invoice')` block in `buildSubtypeUpsert` (~line 450) and replace it:

```typescript
  if (type === 'invoice') {
    return prisma.invoiceDocument.upsert({
      where: { id: documentId },
      create: {
        id: documentId,
        documentNumber,
        dueDate: parseDate(header.dueDate),
        doNo: parseString(header.doNo),
        linkedReceiptId: '',
        linkedReceiptNumber: '',
        linkedDepositReceiptId: parseString(header.linkedDepositReceiptId),
        linkedDepositReceiptNumber: parseString(header.linkedDepositReceiptNumber),
        depositAmountDeducted: parseNullableNumber(header.depositAmountDeducted),
        linkedSOId: parseString(header.linkedSOId),
        customerTaxId: parseString(header.customerTaxId),
        customerBranch: parseString(header.customerBranch),
        paymentStatus: parseString(header.paymentStatus) || 'PENDING',
      } as any,
      update: {
        documentNumber,
        dueDate: parseDate(header.dueDate),
        doNo: parseString(header.doNo),
        linkedDepositReceiptId: parseString(header.linkedDepositReceiptId),
        linkedDepositReceiptNumber: parseString(header.linkedDepositReceiptNumber),
        depositAmountDeducted: parseNullableNumber(header.depositAmountDeducted),
        linkedSOId: parseString(header.linkedSOId),
        customerTaxId: parseString(header.customerTaxId),
        customerBranch: parseString(header.customerBranch),
        paymentStatus: parseString(header.paymentStatus) || 'PENDING',
      } as any,
    });
  }
```

- [ ] **Step 6: Update mapDocumentRecord for invoice — return new fields with computed paymentStatus**

Find the `if (documentType === 'invoice')` block in `mapDocumentRecord` (~line 318) and replace it:

```typescript
  if (documentType === 'invoice') {
    const storedPaymentStatus = document.invoiceDocument?.paymentStatus ?? 'PENDING';
    const dueDate = document.invoiceDocument?.dueDate ?? null;
    return {
      ...baseRecord,
      invoiceId: document.documentNumber,
      invoiceNo: document.documentNumber,
      invoiceDate: document.documentDate,
      dueDate: dueDate,
      doNo: document.invoiceDocument?.doNo || '',
      statusOnline: document.invoiceDocument?.statusOnline ?? buildInvoiceStatusOnline(status),
      linkedQuotationId: document.invoiceDocument?.linkedQuotationId || '',
      linkedQuotationNumber: document.invoiceDocument?.linkedQuotationNumber || '',
      linkedDepositReceiptId: document.invoiceDocument?.linkedDepositReceiptId || '',
      linkedDepositReceiptNumber: document.invoiceDocument?.linkedDepositReceiptNumber || '',
      depositAmountDeducted: parseNullableNumber(document.invoiceDocument?.depositAmountDeducted),
      linkedSOId: document.invoiceDocument?.linkedSOId || '',
      customerTaxId: document.invoiceDocument?.customerTaxId || '',
      customerBranch: document.invoiceDocument?.customerBranch || '',
      paymentStatus: computePaymentStatus(storedPaymentStatus, dueDate),
    };
  }
```

- [ ] **Step 7: Remove the Deposit Receipt (DR) gate**

In `saveDocumentByType`, find the block starting at `if (type === 'invoice' && existing === null)` (~line 796). Remove **only** the DR check (the `dp` lookup), keeping the GR check intact:

```typescript
  if (type === 'invoice' && existing === null) {
    const linkedSOId = parseString(header.linkedSOId);

    if (linkedSOId) {
      // GR gate: goods must be received from supplier before issuing delivery invoice
      const soItems = await prisma.sOItem.findMany({
        where: { soId: linkedSOId, convertedToPr: true },
        select: { prNumber: true },
      });
      const prNumbers = soItems
        .map(i => i.prNumber)
        .filter((v): v is string => Boolean(v));

      if (prNumbers.length === 0) {
        throw new Error('ยังไม่มีการรับสินค้า (GR) สำหรับ SO นี้');
      }

      const prItems = await prisma.pRItem.findMany({
        where: {
          pr: { prNumber: { in: prNumbers } },
          convertedToPo: true,
        },
        select: { poNumber: true },
      });
      const poNumbersFromPR = prItems
        .map(i => i.poNumber)
        .filter((v): v is string => Boolean(v));

      const directPONumbers = prNumbers.filter(n => n.toUpperCase().startsWith('PO-'));
      const allPONumbers = [...new Set([...poNumbersFromPR, ...directPONumbers])];

      if (allPONumbers.length === 0) {
        throw new Error('ยังไม่มีการรับสินค้า (GR) สำหรับ SO นี้');
      }

      const gr = await prisma.goodsReceipt.findFirst({
        where: { poNumber: { in: allPONumbers }, status: 'CONFIRMED', companyId },
        select: { id: true },
      });
      if (!gr) {
        throw new Error('ยังไม่มีการรับสินค้า (GR) สำหรับ SO นี้');
      }
    }
  }
```

- [ ] **Step 8: Build TypeScript to verify no type errors**

```bash
cd /home/po/DocKey/backend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 9: Run all existing tests to check for regressions**

```bash
cd /home/po/DocKey/backend && npx jest --no-coverage
```

Expected: all tests pass (new invoice test + existing tests)

- [ ] **Step 10: Commit**

```bash
git add backend/src/lib/mainDocuments.ts backend/src/lib/__tests__/mainDocuments.invoice.test.ts
git commit -m "feat: invoice save/read — snapshot taxId/branch, paymentStatus, remove DR gate"
```

---

### Task 3: Backend — Mark Paid endpoint + OVERDUE count in getCounts

**Files:**
- Modify: `backend/src/controllers/DocumentController.ts`
- Modify: `backend/src/routes/documents.ts`

**Interfaces:**
- Consumes: `computePaymentStatus` (exported in Task 2), Prisma `invoiceDocument` with `paymentStatus` + `dueDate`
- Produces:
  - `PATCH /api/documents/:id/mark-paid` → sets `paymentStatus = 'PAID'`, `Document.status = 'Completed'`
  - `GET /api/documents/counts` → response includes `overdueInvoice: number`

- [ ] **Step 1: Add markPaid method to DocumentController**

In `backend/src/controllers/DocumentController.ts`, add after the existing `delete` method:

```typescript
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
```

- [ ] **Step 2: Update getCounts to include overdueInvoice**

In the same file, update the `getCounts` method. Add an `overdueInvoice` query to the `Promise.all`:

```typescript
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
```

- [ ] **Step 3: Add route in documents.ts**

In `backend/src/routes/documents.ts`, add the mark-paid route:

```typescript
import express from 'express';
import DocumentController from '../controllers/DocumentController';

const router = express.Router();

router.get('/documents/counts', DocumentController.getCounts);
router.patch('/documents/:id/mark-paid', DocumentController.markPaid);
router.get('/documents/:type', DocumentController.getAll);
router.get('/documents/:type/:id', DocumentController.getById);
router.post('/documents/:type', DocumentController.save);
router.delete('/documents/:type/:id', DocumentController.delete);

export default router;
```

- [ ] **Step 4: Build to verify no type errors**

```bash
cd /home/po/DocKey/backend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/DocumentController.ts backend/src/routes/documents.ts
git commit -m "feat: add mark-paid endpoint and overdueInvoice count to API"
```

---

### Task 4: Frontend — Pre-fill Tax ID / Branch from SO

**Files:**
- Modify: `frontend/src/pages/documents/documentShared.ts` (~line 374)
- Modify: `frontend/src/pages/documents/SalesDocuments.tsx` (~line 283)

**Interfaces:**
- Consumes: `customerCodes` array (already loaded in SalesDocuments, contains `{ customerCode, gstId, shortName }`)
- Produces:
  - `buildInvoiceFromSO(so, di, customerExtra?)` — new optional 3rd param
  - Invoice initialData includes `customerTaxId` and `customerBranch`

- [ ] **Step 1: Update buildInvoiceFromSO signature in documentShared.ts**

Find `buildInvoiceFromSO` (~line 374) and add the optional `customerExtra` parameter:

```typescript
export const buildInvoiceFromSO = (
  so: any,
  di?: any,
  customerExtra?: { customerTaxId: string; customerBranch: string },
) => {
  const soNum = String(so?.soNumber || '').trim();
  const today = toDateInputValue(new Date());
  const soTotal = (so?.items || []).reduce((s: number, i: any) => {
    return s + (Number(i?.amount || 0) || Number(i?.qty || 0) * Number(i?.unitPrice || 0));
  }, 0);
  const diNum = di ? String(di?.documentNumber || '').trim() : '';
  const depositAmt = di ? Number(di?.depositAmount || di?.total || 0) : 0;
  const balanceAmt = Math.round((soTotal - depositAmt) * 100) / 100;

  return {
    __mode: 'create',
    title: `ใบแจ้งหนี้ — ${so?.customerName || soNum}`,
    documentDate: today,
    customer: so?.customerCode || '',
    billTo: so?.customerName || '',
    paymentTerm: so?.paymentTerm || '',
    paymentMethod: 'Bank Transfer',
    referenceNo: soNum,
    status: 'Pending',
    remark: di
      ? `ใบแจ้งหนี้ หักมัดจำ ${depositAmt.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท ตาม ${diNum} อ้างอิงใบสั่งขาย ${soNum}`
      : `อ้างอิงใบสั่งขาย ${soNum}`,
    taxRate: String(7),
    linkedSOId: so?.id || '',
    linkedSONumber: soNum,
    linkedQuotationId: '',
    linkedQuotationNumber: '',
    depositAmountDeducted: String(depositAmt),
    linkedDepositReceiptId: di?.documentId || di?.id || '',
    linkedDepositReceiptNumber: diNum,
    total: String(di ? balanceAmt : soTotal),
    customerTaxId: customerExtra?.customerTaxId || '',
    customerBranch: customerExtra?.customerBranch || '',
    paymentStatus: 'PENDING',
    items: (so?.items || []).map((item: any) => ({
      id: '',
      productCode: item?.productCode || '',
      productName: item?.description || item?.productName || '',
      quantity: String(item?.qty || item?.quantity || ''),
      cost: '',
      margin: '',
      sellingPrice: String(item?.unitPrice || item?.sellingPrice || ''),
      totalCost: '',
      totalSellingPrice: String(item?.amount || item?.totalSellingPrice || ''),
      unitId: item?.unit || '',
    })),
  };
};
```

- [ ] **Step 2: Update handleSOtoBalanceInvoice in SalesDocuments.tsx**

Find `handleSOtoBalanceInvoice` (~line 283) and update it to pass customer tax data:

```typescript
  const handleSOtoBalanceInvoice = async (so: any) => {
    // Lookup customer tax data from already-loaded codes (no extra API call)
    const customer = customerCodes.find((c: any) => c.customerCode === so.customerCode);
    const customerExtra = {
      customerTaxId: customer?.gstId || '',
      customerBranch: customer?.shortName || '',
    };

    // 1. Check for deposit receipt (DR) — most complete path
    const drRes = await documentService.getAll('deposit_receipt');
    const drList: any[] = drRes?.data?.data || [];
    setDocs((prev) => ({ ...prev, deposit_receipt: drList }));
    loadedTabsRef.current.add('deposit_receipt');
    const dp = drList.find((d: any) => d.linkedSOId === so.id);
    if (dp) {
      const full = await fetchFullRecord(dp, 'deposit_receipt');
      setActiveTab('invoice');
      setSelectedRecord(null);
      setEditorState({ type: 'invoice', initialData: buildBalanceInvoiceFromDP(full) });
      return;
    }

    // 2. No DR — check for deposit invoice (DI) to deduct deposit amount
    const diRes = await documentService.getAll('deposit_invoice');
    const diList: any[] = diRes?.data?.data || [];
    setDocs((prev) => ({ ...prev, deposit_invoice: diList }));
    loadedTabsRef.current.add('deposit_invoice');
    const di = diList.find((d: any) => d.linkedSOId === so.id);

    // 3. Build invoice (with DI deduction if found, otherwise full invoice)
    setActiveTab('invoice');
    setSelectedRecord(null);
    setEditorState({ type: 'invoice', initialData: buildInvoiceFromSO(so, di || undefined, customerExtra) });
  };
```

- [ ] **Step 3: Build frontend to verify no type errors**

```bash
cd /home/po/DocKey/frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/documents/documentShared.ts frontend/src/pages/documents/SalesDocuments.tsx
git commit -m "feat: pre-fill customerTaxId and customerBranch from SO when creating invoice"
```

---

### Task 5: Frontend — Invoice form: new fields, paymentStatus badge, Mark Paid button, Due Date auto-calc

**Files:**
- Modify: `frontend/src/components/Documents/AllDocumentForm.tsx`

**Interfaces:**
- Consumes:
  - `initialData.customerTaxId`, `initialData.customerBranch`, `initialData.paymentStatus` (from Task 4)
  - `PATCH /api/documents/:id/mark-paid` (from Task 3)
  - `preloadedPaymentTerms` prop (already passed — `{ termId, days }[]`)
- Produces: Invoice form renders Tax ID, Branch, paymentStatus badge, Mark Paid button, auto-calculated dueDate

- [ ] **Step 1: Add new fields to getEmptyHeader**

Find `getEmptyHeader` function (returns object with all default header values). In the `invoice` section at the bottom, add:

```typescript
  // invoice tax fields
  customerTaxId: '',
  customerBranch: '',
  paymentStatus: 'PENDING',
```

(Add these 3 lines alongside the existing `linkedSOId`, `linkedSONumber`, etc.)

- [ ] **Step 2: Initialize new fields in the useEffect that reads initialData**

Find the `useEffect` that populates header from `initialData` (~line 470). Add after `depositAmountDeducted`:

```typescript
      customerTaxId: initialData.customerTaxId || '',
      customerBranch: initialData.customerBranch || '',
      paymentStatus: initialData.paymentStatus || 'PENDING',
```

- [ ] **Step 3: Add Due Date auto-calculation when paymentTerm or documentDate changes**

Add a new `useEffect` inside the component (after the existing effects):

```typescript
  // Auto-calculate dueDate when paymentTerm or documentDate changes (invoice only)
  useEffect(() => {
    if (documentType !== 'invoice') return;
    const termCode = String((header as any).paymentTerm || '').trim();
    if (!termCode) return;
    const matched = (preloadedPaymentTerms || []).find(
      (t: any) => String(t.termId || '').trim() === termCode,
    );
    const days = parseInt(matched?.days || '0', 10);
    if (!days) return;
    const base = (header as any).documentDate
      ? new Date((header as any).documentDate)
      : new Date();
    base.setDate(base.getDate() + days);
    const computed = base.toISOString().slice(0, 10);
    if ((header as any).dueDate !== computed) {
      setHeader((h: any) => ({ ...h, dueDate: computed }));
    }
  }, [(header as any).paymentTerm, (header as any).documentDate]);
```

- [ ] **Step 4: Add Tax ID, Branch display and paymentStatus badge to Invoice form UI**

Find the section in the JSX where invoice-specific fields render (where `dueDate` and `doNo` fields appear, inside the `documentType === 'invoice'` conditional). Add after those fields:

```tsx
{documentType === 'invoice' && (header as any).customerTaxId && (
  <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
    <span className="font-medium">เลขผู้เสียภาษี:</span>
    <span className="font-mono">{(header as any).customerTaxId}</span>
    {(header as any).customerBranch && (
      <>
        <span className="mx-1">·</span>
        <span>{(header as any).customerBranch}</span>
      </>
    )}
  </div>
)}
{documentType === 'invoice' && (() => {
  const ps = (header as any).paymentStatus || 'PENDING';
  const badge =
    ps === 'PAID'
      ? { label: 'ชำระแล้ว', cls: darkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700' }
      : ps === 'OVERDUE'
      ? { label: 'เกินกำหนด', cls: darkMode ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-700' }
      : { label: 'รอชำระ', cls: darkMode ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700' };
  return (
    <div className="flex items-center gap-2">
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>
        {badge.label}
      </span>
      {ps !== 'PAID' && (header as any).documentId && (
        <button
          type="button"
          onClick={async () => {
            if (!window.confirm('ยืนยันการชำระเงิน?')) return;
            await fetch(`/api/documents/${(header as any).documentId}/mark-paid`, { method: 'PATCH' });
            setHeader((h: any) => ({ ...h, paymentStatus: 'PAID' }));
          }}
          className={`text-xs rounded-lg px-2 py-0.5 font-semibold transition ${darkMode ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
        >
          Mark Paid
        </button>
      )}
    </div>
  );
})()}
```

- [ ] **Step 5: Ensure customerTaxId and customerBranch are included in form payload sent to backend**

Search for where the form payload is built before `POST /api/documents/:type`. The `header` state object is sent directly, so since we added the fields to the header state, they will be included automatically. Verify by searching for how `header` is submitted:

```bash
grep -n "header.*submit\|payload.*header\|post.*header\|save.*header" /home/po/DocKey/frontend/src/components/Documents/AllDocumentForm.tsx | head -10
```

Confirm the header object is sent as-is in the request body. If a field-allow-list exists, add `customerTaxId`, `customerBranch`, `paymentStatus` to it.

- [ ] **Step 6: Build frontend to verify no type errors**

```bash
cd /home/po/DocKey/frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/Documents/AllDocumentForm.tsx
git commit -m "feat: invoice form — tax ID/branch display, paymentStatus badge, Mark Paid button, due date auto-calc"
```

---

### Task 6: Frontend — SOTab: "ออกใบกำกับภาษี" button for CONFIRMED SO

**Files:**
- Modify: `frontend/src/pages/documents/SOTab.tsx`

**Interfaces:**
- Consumes: `onLinkToBalanceInvoice` prop (already exists), `workflowStatus.invoice` (already exists)
- Produces: New button appears when `SO.status === 'CONFIRMED'` and `!workflowStatus?.invoice`

Note: The existing button shows at `IN_PROGRESS` status. Tax invoice should also be accessible from `CONFIRMED` status (i.e., when user skips the deposit flow entirely). Both buttons can coexist.

- [ ] **Step 1: Add button in SO view mode action bar**

Find the section with existing action buttons inside `viewing` mode (~line 541-552):

```tsx
{viewing.status === 'CONFIRMED' && onLinkToDI && !workflowStatus?.di && (
  <button type="button" onClick={() => onLinkToDI(viewing)}
    className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${darkMode ? 'bg-teal-700 hover:bg-teal-600 text-white' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}>
    สร้างใบแจ้งหนี้มัดจำ
  </button>
)}
```

Add a new button **after** this block:

```tsx
{(viewing.status === 'CONFIRMED' || viewing.status === 'IN_PROGRESS') && onLinkToBalanceInvoice && !workflowStatus?.invoice && (
  <button
    type="button"
    onClick={() => onLinkToBalanceInvoice(viewing)}
    className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${darkMode ? 'bg-violet-700 hover:bg-violet-600 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}
  >
    ออกใบกำกับภาษี
  </button>
)}
```

Then **remove** the old `IN_PROGRESS`-only invoice button (lines ~547-551) to avoid duplicate buttons:

```tsx
{/* Remove this block — replaced by the button above */}
{viewing.status === 'IN_PROGRESS' && onLinkToBalanceInvoice && !workflowStatus?.invoice && (
  <button type="button" onClick={() => onLinkToBalanceInvoice(viewing)}
    ...>
    สร้างใบแจ้งหนี้
  </button>
)}
```

- [ ] **Step 2: Build to verify no type errors**

```bash
cd /home/po/DocKey/frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/documents/SOTab.tsx
git commit -m "feat: SO view — show ออกใบกำกับภาษี button from CONFIRMED or IN_PROGRESS status"
```

---

### Task 7: Frontend — InvoicePrintLayout: 3-page print component

**Files:**
- Create: `frontend/src/components/Documents/InvoicePrintLayout.tsx`
- Modify: `frontend/src/components/Documents/AllDocumentForm.tsx` (add Print button)

**Interfaces:**
- Consumes:
  ```typescript
  interface InvoicePrintProps {
    invoiceNo: string;
    invoiceDate: string;       // formatted display string
    dueDate: string;           // formatted display string
    customerName: string;
    customerAddress: string;
    customerTaxId: string;
    customerBranch: string;
    paymentTerm: string;       // display label
    items: Array<{
      lineNo: number;
      productCode: string;
      productName: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      totalAmount: number;
    }>;
    subtotal: number;
    vatRate: number;
    vatAmount: number;
    grandTotal: number;
    depositAmount: number;
    netPayable: number;
    netPayableText: string;    // bahttext output
    referenceNo: string;       // SO number
    depositReceiptNumber?: string;
    companyName: string;
    companyAddress: string;
    companyTaxId: string;
  }
  ```
- Produces: `<InvoicePrintLayout>` renders 3 pages; `window.print()` triggers CSS @media print

- [ ] **Step 1: Create InvoicePrintLayout.tsx**

Create `frontend/src/components/Documents/InvoicePrintLayout.tsx`:

```tsx
import React from 'react';

interface InvoicePrintItem {
  lineNo: number;
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
}

interface InvoicePrintProps {
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  customerName: string;
  customerAddress: string;
  customerTaxId: string;
  customerBranch: string;
  paymentTerm: string;
  items: InvoicePrintItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  grandTotal: number;
  depositAmount: number;
  netPayable: number;
  netPayableText: string;
  referenceNo: string;
  depositReceiptNumber?: string;
  companyName: string;
  companyAddress: string;
  companyTaxId: string;
}

const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PAGES = [
  'ต้นฉบับใบส่งสินค้า / ต้นฉบับใบแจ้งหนี้ / ต้นฉบับใบกำกับภาษี',
  'สำเนาใบส่งสินค้า',
  'สำเนาใบแจ้งหนี้ / สำเนาใบกำกับภาษี',
];

const InvoicePage: React.FC<InvoicePrintProps & { pageLabel: string }> = (props) => (
  <div style={{ width: '210mm', minHeight: '297mm', padding: '12mm', boxSizing: 'border-box', pageBreakAfter: 'always', fontFamily: 'Sarabun, sans-serif', fontSize: '11pt' }}>
    <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', marginBottom: '4mm', border: '1px solid #333', padding: '2mm' }}>
      {props.pageLabel}
    </div>

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6mm' }}>
      <div>
        <div style={{ fontWeight: 'bold', fontSize: '13pt' }}>{props.companyName}</div>
        <div style={{ whiteSpace: 'pre-line', fontSize: '9pt' }}>{props.companyAddress}</div>
        <div style={{ fontSize: '9pt' }}>เลขประจำตัวผู้เสียภาษี: {props.companyTaxId}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 'bold', fontSize: '13pt' }}>เลขที่: {props.invoiceNo}</div>
        <div style={{ fontSize: '9pt' }}>วันที่: {props.invoiceDate}</div>
        <div style={{ fontSize: '9pt' }}>ครบกำหนด: {props.dueDate}</div>
        {props.referenceNo && <div style={{ fontSize: '9pt' }}>อ้างอิง SO: {props.referenceNo}</div>}
      </div>
    </div>

    <div style={{ border: '1px solid #ccc', padding: '3mm', marginBottom: '4mm', fontSize: '9pt' }}>
      <div><strong>ลูกค้า:</strong> {props.customerName}</div>
      <div><strong>ที่อยู่:</strong> {props.customerAddress}</div>
      <div style={{ display: 'flex', gap: '20mm' }}>
        <div><strong>เลขผู้เสียภาษี:</strong> {props.customerTaxId || '-'}</div>
        <div><strong>สาขา:</strong> {props.customerBranch || 'สำนักงานใหญ่'}</div>
        <div><strong>เครดิต:</strong> {props.paymentTerm}</div>
      </div>
    </div>

    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '4mm' }}>
      <thead>
        <tr style={{ background: '#f0f0f0' }}>
          <th style={{ border: '1px solid #ccc', padding: '1mm 2mm', width: '6mm' }}>ที่</th>
          <th style={{ border: '1px solid #ccc', padding: '1mm 2mm', width: '22mm' }}>รหัส</th>
          <th style={{ border: '1px solid #ccc', padding: '1mm 2mm' }}>รายการ</th>
          <th style={{ border: '1px solid #ccc', padding: '1mm 2mm', width: '14mm' }}>จำนวน</th>
          <th style={{ border: '1px solid #ccc', padding: '1mm 2mm', width: '12mm' }}>หน่วย</th>
          <th style={{ border: '1px solid #ccc', padding: '1mm 2mm', width: '22mm', textAlign: 'right' }}>ราคา/หน่วย</th>
          <th style={{ border: '1px solid #ccc', padding: '1mm 2mm', width: '24mm', textAlign: 'right' }}>จำนวนเงิน</th>
        </tr>
      </thead>
      <tbody>
        {props.items.map((item) => (
          <tr key={item.lineNo}>
            <td style={{ border: '1px solid #ccc', padding: '1mm 2mm', textAlign: 'center' }}>{item.lineNo}</td>
            <td style={{ border: '1px solid #ccc', padding: '1mm 2mm' }}>{item.productCode}</td>
            <td style={{ border: '1px solid #ccc', padding: '1mm 2mm' }}>{item.productName}</td>
            <td style={{ border: '1px solid #ccc', padding: '1mm 2mm', textAlign: 'right' }}>{item.quantity.toLocaleString('th-TH')}</td>
            <td style={{ border: '1px solid #ccc', padding: '1mm 2mm', textAlign: 'center' }}>{item.unit}</td>
            <td style={{ border: '1px solid #ccc', padding: '1mm 2mm', textAlign: 'right' }}>{fmt(item.unitPrice)}</td>
            <td style={{ border: '1px solid #ccc', padding: '1mm 2mm', textAlign: 'right' }}>{fmt(item.totalAmount)}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4mm' }}>
      <table style={{ fontSize: '9pt', minWidth: '80mm' }}>
        <tbody>
          <tr>
            <td style={{ padding: '0.5mm 2mm' }}>รวมเป็นเงิน (Subtotal)</td>
            <td style={{ padding: '0.5mm 2mm', textAlign: 'right' }}>{fmt(props.subtotal)}</td>
          </tr>
          <tr>
            <td style={{ padding: '0.5mm 2mm' }}>ภาษีมูลค่าเพิ่ม {props.vatRate}%</td>
            <td style={{ padding: '0.5mm 2mm', textAlign: 'right' }}>{fmt(props.vatAmount)}</td>
          </tr>
          <tr style={{ borderTop: '1px solid #333' }}>
            <td style={{ padding: '0.5mm 2mm', fontWeight: 'bold' }}>จำนวนเงินรวมทั้งสิ้น</td>
            <td style={{ padding: '0.5mm 2mm', textAlign: 'right', fontWeight: 'bold' }}>{fmt(props.grandTotal)}</td>
          </tr>
          {props.depositAmount > 0 && (
            <tr>
              <td style={{ padding: '0.5mm 2mm' }}>หัก เงินมัดจำ</td>
              <td style={{ padding: '0.5mm 2mm', textAlign: 'right', color: '#b00' }}>({fmt(props.depositAmount)})</td>
            </tr>
          )}
          <tr style={{ borderTop: '1px solid #333' }}>
            <td style={{ padding: '0.5mm 2mm', fontWeight: 'bold' }}>จำนวนเงินที่ต้องชำระทั้งสิ้น</td>
            <td style={{ padding: '0.5mm 2mm', textAlign: 'right', fontWeight: 'bold' }}>{fmt(props.netPayable)}</td>
          </tr>
          <tr>
            <td colSpan={2} style={{ padding: '1mm 2mm', fontStyle: 'italic', fontSize: '8pt' }}>
              ({props.netPayableText})
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    {props.depositReceiptNumber && (
      <div style={{ fontSize: '8pt', color: '#555' }}>
        หมายเหตุ: อ้างอิงใบรับมัดจำ {props.depositReceiptNumber}
      </div>
    )}

    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20mm', fontSize: '9pt' }}>
      <div style={{ textAlign: 'center', minWidth: '50mm' }}>
        <div style={{ borderTop: '1px solid #333', paddingTop: '2mm' }}>ผู้รับสินค้า / Received by</div>
        <div style={{ marginTop: '12mm', borderTop: '1px solid #333', paddingTop: '2mm' }}>วันที่รับสินค้า</div>
      </div>
      <div style={{ textAlign: 'center', minWidth: '50mm' }}>
        <div style={{ borderTop: '1px solid #333', paddingTop: '2mm' }}>ผู้จัดทำ / Prepared by</div>
      </div>
      <div style={{ textAlign: 'center', minWidth: '50mm' }}>
        <div style={{ borderTop: '1px solid #333', paddingTop: '2mm' }}>ผู้มีอำนาจอนุมัติ / Authorized by</div>
      </div>
    </div>
  </div>
);

const InvoicePrintLayout: React.FC<InvoicePrintProps> = (props) => (
  <div>
    {PAGES.map((label, i) => (
      <InvoicePage key={i} {...props} pageLabel={label} />
    ))}
    <style>{`
      @media print {
        body > *:not(.invoice-print-root) { display: none !important; }
        .invoice-print-root { display: block !important; }
        @page { size: A4; margin: 0; }
      }
    `}</style>
  </div>
);

export default InvoicePrintLayout;
export type { InvoicePrintProps };
```

- [ ] **Step 2: Add Print button to AllDocumentForm for invoice view mode**

In `AllDocumentForm.tsx`, find the invoice view mode area (where the document is displayed in read-only mode, look for the existing print or action buttons). Add a Print button that:

1. Imports `bahttext` (already in package.json from earlier spec)
2. Builds `InvoicePrintProps` from the current `header` and `items` state
3. Renders `InvoicePrintLayout` in a hidden div with class `invoice-print-root`
4. Calls `window.print()`

Add near existing action buttons in invoice view mode:

```tsx
{documentType === 'invoice' && !isEditing && (
  <button
    type="button"
    onClick={() => window.print()}
    className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
  >
    พิมพ์ (3 ชุด)
  </button>
)}
```

And render the hidden print container at the bottom of the component (before the closing `</div>`):

```tsx
{documentType === 'invoice' && (
  <div className="invoice-print-root" style={{ display: 'none' }}>
    <InvoicePrintLayout
      invoiceNo={String((header as any).documentNumber || '')}
      invoiceDate={String((header as any).documentDate || '')}
      dueDate={String((header as any).dueDate || '')}
      customerName={String((header as any).billTo || '')}
      customerAddress={String((header as any).shipTo || (header as any).billTo || '')}
      customerTaxId={String((header as any).customerTaxId || '')}
      customerBranch={String((header as any).customerBranch || '')}
      paymentTerm={String((header as any).paymentTerm || '')}
      items={items.map((item: any, i: number) => ({
        lineNo: i + 1,
        productCode: item.productCode || '',
        productName: item.productName || '',
        quantity: Number(item.quantity || 0),
        unit: item.unitId || '',
        unitPrice: Number(item.sellingPrice || 0),
        totalAmount: Number(item.totalSellingPrice || 0),
      }))}
      subtotal={Number((header as any).totalSellingPrice || 0)}
      vatRate={Number((header as any).taxRate || 7)}
      vatAmount={Number((header as any).taxAmount || 0)}
      grandTotal={Number((header as any).totalAmount || 0)}
      depositAmount={Number((header as any).depositAmountDeducted || 0)}
      netPayable={Number((header as any).totalAmount || 0) - Number((header as any).depositAmountDeducted || 0)}
      netPayableText={''}
      referenceNo={String((header as any).linkedSONumber || (header as any).referenceNo || '')}
      depositReceiptNumber={(header as any).linkedDepositReceiptNumber || undefined}
      companyName={''}
      companyAddress={''}
      companyTaxId={''}
    />
  </div>
)}
```

Note: `companyName`, `companyAddress`, `companyTaxId` — pull from the existing company context already available in the component (look for existing `companyInfo` or similar prop/context; wire accordingly).

- [ ] **Step 3: Build to verify no type errors**

```bash
cd /home/po/DocKey/frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Documents/InvoicePrintLayout.tsx frontend/src/components/Documents/AllDocumentForm.tsx
git commit -m "feat: add 3-page print layout for tax invoice / delivery note"
```

---

### Task 8: Frontend — Dashboard: OVERDUE invoice counter

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `GET /api/documents/counts` now returns `overdueInvoice: number` (from Task 3)
- Produces: Dashboard displays a red badge/counter for overdue invoices

- [ ] **Step 1: Add overdueInvoice card to Dashboard**

In `frontend/src/pages/Dashboard.tsx`, find where the existing counts are displayed (the metrics grid). Add an "Invoice เกินกำหนด" card alongside existing cards:

```tsx
{counts?.overdueInvoice > 0 && (
  <div
    className={`rounded-2xl p-4 cursor-pointer transition ${darkMode ? 'bg-red-900/30 hover:bg-red-900/50 border border-red-700/40' : 'bg-red-50 hover:bg-red-100 border border-red-200'}`}
    onClick={() => onNavigate('documents')}
  >
    <div className={`text-2xl font-bold ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
      {counts.overdueInvoice}
    </div>
    <div className={`text-xs font-medium mt-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
      Invoice เกินกำหนด
    </div>
  </div>
)}
```

Place this card before or after the existing `invoice` count card so they appear together.

- [ ] **Step 2: Build to verify no type errors**

```bash
cd /home/po/DocKey/frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat: dashboard — show overdue invoice counter when count > 0"
```

---

## Self-Review Checklist

**Spec coverage:**

| Spec requirement | Task |
|-----------------|------|
| Add customerTaxId, customerBranch, paymentStatus to InvoiceDocument | Task 1 |
| Snapshot Customer data when saving invoice | Task 4 (frontend pre-fill) + Task 2 (backend save) |
| Due Date = invoiceDate + PaymentTerm.days | Task 5 (auto-calc useEffect) |
| OVERDUE computed runtime, not stored in DB | Task 2 (computePaymentStatus export) |
| Mark Paid endpoint | Task 3 |
| Remove DR gate, keep GR gate | Task 2 (Step 7) |
| "ออกใบกำกับภาษี" button in SO view | Task 6 |
| Print 3 copies with different headers | Task 7 |
| Payment status badge in Invoice form | Task 5 |
| Dashboard OVERDUE counter | Task 3 (getCounts) + Task 8 |

**All spec requirements covered.**
