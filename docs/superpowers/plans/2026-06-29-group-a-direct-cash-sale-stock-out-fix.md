# Group A — Direct Cash Sale + Stock-Out Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-click "จ่ายเต็ม" (Pay Full) path for cash-term SOs that atomically creates INV+DO+RC, and fix stock-out so DO is the single source of truth (remove duplicate trigger from RC).

**Architecture:** Atomic backend endpoint `POST /api/so/:id/pay-full` handles the entire transaction. A new DO document UI is built for the Operations module. The RC save path gains a hard gate requiring a DO to exist before allowing receipt creation.

**Tech Stack:** Node.js + Express + Prisma (MySQL), React + Vite + Tailwind CSS, TypeScript

## Global Constraints

- All Prisma schema changes must use nullable fields (`?`) — backward-compatible with existing records
- New `delivery_order` document numbers follow the existing pattern: `DO-YY-NNNNNN`
- Pay-full is only valid for SO `status = CONFIRMED` with cash payment term (`days = 0`) and no existing DI
- DO gate skips when RC has no `linkedSOId` (standalone receipts are allowed)
- `buildFallbackDocumentNumber` race condition is acceptable — same pattern already used for SO numbering
- Follow existing patterns: `accentClasses`, `documentTypeConfigs`, `loadTabDocuments`, `AllDocumentForm`

---

### Task 1: Prisma Schema Migration + mainDocuments Type Mapping

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/src/lib/mainDocuments.ts:419-425` (delivery_order mapDocumentRecord)
- Modify: `backend/src/lib/mainDocuments.ts:360-371` (receipt mapDocumentRecord)
- Modify: `backend/src/lib/mainDocuments.ts:514-535` (receipt buildSubtypeUpsert)
- Modify: `backend/src/lib/mainDocuments.ts:622-637` (delivery_order buildSubtypeUpsert)

**Interfaces:**
- Produces: `linkedSOId` field on DO records returned from `getDocumentById` and `listDocuments`
- Produces: `linkedDOId` field on RC records returned from `getDocumentById`
- These new fields are consumed by Task 3 (DO gate) and Task 5 (print DO button)

- [ ] **Step 1: Add `linkedSOId` to `DeliveryOrderDocument` in schema**

In `backend/prisma/schema.prisma`, find `model DeliveryOrderDocument` and add `linkedSOId`:

```prisma
model DeliveryOrderDocument {
  id              String   @id @map("ID") @db.Char(26)
  documentNumber  String   @map("DocumentNumber") @db.Char(26)
  quotationId     String?  @map("QuotationId") @db.VarChar(26)
  quotationNumber String?  @map("QuotationNumber") @db.VarChar(50)
  linkedSOId      String?  @map("LinkedSOId") @db.VarChar(191)
  document        Document @relation(fields: [id], references: [id], onDelete: Cascade, onUpdate: Cascade)
}
```

- [ ] **Step 2: Add `linkedDOId` to `ReceiptDocument` in schema**

In the same file, find `model ReceiptDocument` and add `linkedDOId` after `depositAmountDeducted`:

```prisma
model ReceiptDocument {
  id                     String    @id @map("ID") @db.Char(26)
  documentNumber         String    @map("DocumentNumber") @db.Char(26)
  receivedDate           DateTime? @map("ReceivedDate")
  paymentReference       String?   @map("PaymentReference") @db.VarChar(100)
  linkedDepositReceiptId String?   @map("LinkedDepositReceiptId") @db.VarChar(26)
  linkedSOId             String?   @map("LinkedSOId") @db.VarChar(191)
  depositAmountDeducted  Decimal?  @map("DepositAmountDeducted") @db.Decimal(19, 4)
  linkedDOId             String?   @map("LinkedDOId") @db.VarChar(26)
  document               Document  @relation(fields: [id], references: [id], onDelete: Cascade, onUpdate: Cascade)
}
```

- [ ] **Step 3: Run Prisma migration**

```bash
cd /home/po/DocKey/backend
npx prisma migrate dev --name add-do-linked-so-id-and-rc-linked-do-id
```

Expected: Migration created and applied, Prisma client regenerated.

- [ ] **Step 4: Update `mapDocumentRecord` for `delivery_order`**

In `backend/src/lib/mainDocuments.ts`, find the block starting with `if (documentType === 'delivery_order')` (~line 419):

```typescript
  if (documentType === 'delivery_order') {
    return {
      ...baseRecord,
      quotationId: document.deliveryOrderDocument?.quotationId || '',
      quotationNumber: document.deliveryOrderDocument?.quotationNumber || '',
      linkedSOId: document.deliveryOrderDocument?.linkedSOId || '',
    };
  }
```

- [ ] **Step 5: Update `mapDocumentRecord` for `receipt`**

Find the block starting with `if (documentType === 'receipt')` (~line 360):

```typescript
  if (documentType === 'receipt') {
    return {
      ...baseRecord,
      receivedDate: document.receiptDocument?.receivedDate || null,
      paymentReference: document.receiptDocument?.paymentReference || '',
      linkedInvoiceId: document.receiptDocument?.linkedInvoiceId || '',
      linkedInvoiceNumber: document.receiptDocument?.linkedInvoiceNumber || '',
      linkedDepositReceiptId: document.receiptDocument?.linkedDepositReceiptId || '',
      linkedSOId: document.receiptDocument?.linkedSOId || '',
      depositAmountDeducted: parseNullableNumber(document.receiptDocument?.depositAmountDeducted),
      linkedDOId: document.receiptDocument?.linkedDOId || '',
    };
  }
```

- [ ] **Step 6: Update `buildSubtypeUpsert` for `delivery_order`**

Find the block `if (type === 'delivery_order')` (~line 622):

```typescript
  if (type === 'delivery_order') {
    return prisma.deliveryOrderDocument.upsert({
      where: { id: documentId },
      create: {
        id: documentId,
        documentNumber,
        quotationId: parseString(header.quotationId),
        quotationNumber: parseString(header.quotationNumber),
        linkedSOId: parseString(header.linkedSOId),
      },
      update: {
        documentNumber,
        quotationId: parseString(header.quotationId),
        quotationNumber: parseString(header.quotationNumber),
        linkedSOId: parseString(header.linkedSOId),
      },
    });
  }
```

- [ ] **Step 7: Update `buildSubtypeUpsert` for `receipt`**

Find `if (type === 'receipt')` (~line 514):

```typescript
  if (type === 'receipt') {
    return prisma.receiptDocument.upsert({
      where: { id: documentId },
      create: {
        id: documentId,
        documentNumber,
        receivedDate: parseDate(header.receivedDate),
        paymentReference: parseString(header.paymentReference),
        linkedDepositReceiptId: parseString(header.linkedDepositReceiptId),
        linkedSOId: parseString(header.linkedSOId),
        depositAmountDeducted: parseNullableNumber(header.depositAmountDeducted),
        linkedDOId: parseString(header.linkedDOId),
      },
      update: {
        documentNumber,
        receivedDate: parseDate(header.receivedDate),
        paymentReference: parseString(header.paymentReference),
        linkedDepositReceiptId: parseString(header.linkedDepositReceiptId),
        linkedSOId: parseString(header.linkedSOId),
        depositAmountDeducted: parseNullableNumber(header.depositAmountDeducted),
        linkedDOId: parseString(header.linkedDOId),
      },
    });
  }
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd /home/po/DocKey/backend
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add backend/prisma/schema.prisma backend/src/lib/mainDocuments.ts
git commit -m "feat: add linkedSOId to DeliveryOrderDocument and linkedDOId to ReceiptDocument schema"
```

---

### Task 2: Stock-Out Fix — DO Gate + Remove RC Duplicate Trigger

**Files:**
- Modify: `backend/src/lib/mainDocuments.ts` (receipt save path ~lines 1044-1168)
- Test: `backend/src/lib/__tests__/mainDocuments.invoice.test.ts` (add DO gate tests)

**Interfaces:**
- Consumes: `linkedSOId` on RC header, `deliveryOrderDocument.linkedSOId` from Task 1
- Produces: RC save now throws `'กรุณาออกใบส่งสินค้า (DO) ก่อน'` when no DO for SO

- [ ] **Step 1: Write failing tests for the DO gate**

Add to `backend/src/lib/__tests__/mainDocuments.invoice.test.ts`:

```typescript
describe('DO gate on RC save', () => {
  it('throws when saving RC for a linked SO that has no DO', async () => {
    // Setup: mock prisma.deliveryOrderDocument.findFirst to return null
    // This verifies the gate blocks RC creation
    const mockPrisma = {
      deliveryOrderDocument: { findFirst: jest.fn().mockResolvedValue(null) },
      // ... minimal mocks for the receipt path
    };
    // Expect: Error('กรุณาออกใบส่งสินค้า (DO) ก่อน')
    // Note: if the test suite uses real DB, create a SO without DO and attempt RC
    await expect(
      saveDocumentByType('receipt', {
        header: { linkedSOId: 'test-so-id', status: 'Received', total: 100 },
        items: [],
      }, 'test-company')
    ).rejects.toThrow('กรุณาออกใบส่งสินค้า (DO) ก่อน');
  });

  it('allows RC when linkedSOId is empty (standalone receipt)', async () => {
    // RC with no linkedSOId should not trigger the gate
    // This verifies backward compatibility
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /home/po/DocKey/backend
npx jest --testPathPattern="mainDocuments" --no-coverage 2>&1 | tail -20
```

Expected: Tests fail because the gate doesn't exist yet.

- [ ] **Step 3: Add DO gate in `mainDocuments.ts`**

In `backend/src/lib/mainDocuments.ts`, find the line:
```typescript
  // RE completion trigger: stock OUT + QT/SO Completed when DP+RE >= QT total
  if (type === 'receipt' && existing === null) {
    let linkedSOId = parseString(header.linkedSOId);
```

After the section that resolves `linkedSOId` (after the fallback from `linkedInvoiceId`, ~line 1065) and BEFORE the `if (linkedSOId && isCashPaymentTerm && linkedQTId)` branch, insert:

```typescript
    // DO gate: SO must have a DO before RC can be created
    if (linkedSOId) {
      const doForSO = await prisma.deliveryOrderDocument.findFirst({
        where: { linkedSOId },
      });
      if (!doForSO) {
        throw new Error('กรุณาออกใบส่งสินค้า (DO) ก่อน');
      }
    }
```

Place this block after line ~1089 (`isCashPaymentTerm = ...` assignment) and before line 1091 (`if (linkedSOId && isCashPaymentTerm && linkedQTId)`).

- [ ] **Step 4: Remove stock-out trigger from RC cash-term path**

Find the block in the cash-term branch (~lines 1118-1148):

```typescript
          const stockItems = validItems
            .map((item: any) => ({
              productCode: String(parseString(item.productCode) || ''),
              qty: toNumber(item.quantity),
            }))
            .filter((i) => i.productCode && i.qty > 0);

          if (stockItems.length > 0) {
            const productRows = await prisma.product.findMany({
              where: { companyId, productCode: { in: stockItems.map((i) => i.productCode) } },
              select: { id: true, productCode: true },
            });
            const productIdMap = new Map(productRows.map((p) => [p.productCode, p.id]));

            const moveItems = stockItems
              .map((i) => ({ ...i, productId: productIdMap.get(i.productCode) || '' }))
              .filter((i) => i.productId);

            if (moveItems.length > 0) {
              await prisma.$transaction(async (tx) => {
                await recordStockMove(tx, {
                  items: moveItems,
                  docNumber: documentNumber,
                  docType: 'RECEIPT',
                  direction: 'OUT',
                  companyId,
                  docId: documentId,
                  userId: parseString(header.createdBy) ?? undefined,
                });
              });
            }
          }
```

**Delete this entire block.** Stock-out now only happens when DO is first saved (existing logic at ~line 1005-1041 — do not touch that block).

- [ ] **Step 5: Run tests — verify they pass**

```bash
cd /home/po/DocKey/backend
npx jest --testPathPattern="mainDocuments" --no-coverage 2>&1 | tail -20
```

Expected: All tests pass including the new DO gate tests.

- [ ] **Step 6: Compile check**

```bash
cd /home/po/DocKey/backend
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add backend/src/lib/mainDocuments.ts backend/src/lib/__tests__/
git commit -m "feat: DO gate on RC save + remove duplicate stock-out from RC path"
```

---

### Task 3: `payFullSO` Function + Backend Endpoint

**Files:**
- Modify: `backend/src/lib/mainDocuments.ts` (export `buildFallbackDocumentNumber`, add `payFullSO`)
- Modify: `backend/src/controllers/SOController.ts` (add `payFull` handler)
- Modify: `backend/src/routes/so.ts` (add route)

**Interfaces:**
- Produces: `POST /api/so/:id/pay-full` → `{ success: true, data: { rcId, doId, invId } }`
- Consumes: Task 1 schema fields (`linkedSOId` on DO, `linkedDOId` on RC)

- [ ] **Step 1: Export `buildFallbackDocumentNumber` from `mainDocuments.ts`**

Find line 131:
```typescript
const buildFallbackDocumentNumber = async (type: MainDocumentType, companyId: string) => {
```

Change to:
```typescript
export const buildFallbackDocumentNumber = async (type: MainDocumentType, companyId: string) => {
```

- [ ] **Step 2: Add `payFullSO` exported function to `mainDocuments.ts`**

Add this at the bottom of `backend/src/lib/mainDocuments.ts`, after all existing exports:

```typescript
export async function payFullSO(
  soId: string,
  companyId: string,
  userName?: string,
): Promise<{ rcId: string; doId: string; invId: string }> {
  const so = await prisma.saleOrder.findFirst({
    where: { id: soId, companyId },
    include: { items: { orderBy: { lineNo: 'asc' } } },
  });
  if (!so) throw new Error('SO not found');
  if (so.status !== 'CONFIRMED') throw new Error('SO ต้องอยู่ในสถานะ CONFIRMED');

  if (!so.paymentTerm) throw new Error('SO ไม่มีเงื่อนไขการชำระเงิน');
  const pt = await prisma.paymentTerm.findFirst({
    where: { termCode: so.paymentTerm, companyId },
    select: { days: true },
  });
  if (Number(pt?.days ?? -1) !== 0) throw new Error('ใช้ได้เฉพาะ SO ที่มีเงื่อนไขชำระเงินสด (Days=0)');

  const existingDI = await prisma.depositInvoiceDocument.findFirst({
    where: { linkedSOId: soId },
  });
  if (existingDI) throw new Error('SO นี้มีใบแจ้งหนี้มัดจำแล้ว ให้ใช้ flow มัดจำแทน');

  // Generate document numbers before transaction to avoid async issues inside tx
  const [invNumber, doNumber, rcNumber] = await Promise.all([
    buildFallbackDocumentNumber('invoice', companyId),
    buildFallbackDocumentNumber('delivery_order', companyId),
    buildFallbackDocumentNumber('receipt', companyId),
  ]);

  const invId = ulid();
  const doId = ulid();
  const rcId = ulid();
  const today = new Date();

  // Calculate totals from SO items
  const soItems = so.items;
  const subtotal = soItems.reduce((sum, i) => sum + Number(i.amount), 0);
  const TAX_RATE = 7;
  const taxAmount = Math.round(subtotal * TAX_RATE / 100 * 100) / 100;
  const totalAmt = Math.round((subtotal + taxAmount) * 100) / 100;

  // Resolve product IDs for stock move
  const stockCandidates = soItems.filter((i) => i.productCode && Number(i.qty) > 0);
  let productIdMap = new Map<string, string>();
  if (stockCandidates.length > 0) {
    const products = await prisma.product.findMany({
      where: { companyId, productCode: { in: stockCandidates.map((i) => i.productCode!) } },
      select: { id: true, productCode: true },
    });
    productIdMap = new Map(products.map((p) => [p.productCode, p.id]));
  }
  const moveItems = stockCandidates
    .map((i) => ({ productCode: i.productCode!, qty: Number(i.qty), productId: productIdMap.get(i.productCode!) || '' }))
    .filter((i) => i.productId);

  // Map SO items to DocumentItem fields
  const buildItemRows = (docId: string, docNumber: string, docType: 'INVOICE' | 'DELIVERY_ORDER' | 'RECEIPT') =>
    soItems.map((i, idx) => ({
      id: ulid(),
      documentId: docId,
      documentNumber: docNumber,
      documentType: docType as any,
      lineNo: idx + 1,
      productCode: i.productCode || null,
      quantity: Number(i.qty),
      sellingPrice: Number(i.unitPrice),
      totalSellingPrice: Number(i.amount),
      unitId: i.unit || null,
      cost: null,
      margin: null,
      totalCost: null,
    }));

  await prisma.$transaction(async (tx) => {
    // 1. Create INV
    await tx.document.create({
      data: {
        id: invId,
        documentType: 'INVOICE',
        documentNumber: invNumber,
        title: `ใบแจ้งหนี้ — ${so.customerName}`,
        documentDate: today,
        customerId: so.customerCode,
        billTo: so.customerName,
        status: 'Pending',
        companyId,
        taxRate: TAX_RATE,
        taxAmount,
        totalAmount: totalAmt,
        totalSellingPrice: subtotal,
        referenceNo: so.soNumber,
      },
    });
    await tx.documentItem.createMany({ data: buildItemRows(invId, invNumber, 'INVOICE') });
    await tx.invoiceDocument.create({
      data: {
        id: invId,
        documentNumber: invNumber,
        linkedSOId: soId,
        paymentStatus: 'PAID',
        linkedReceiptId: rcId,
        linkedReceiptNumber: rcNumber,
      },
    });

    // 2. Create DO
    await tx.document.create({
      data: {
        id: doId,
        documentType: 'DELIVERY_ORDER',
        documentNumber: doNumber,
        title: `ใบส่งสินค้า — ${so.customerName}`,
        documentDate: today,
        customerId: so.customerCode,
        billTo: so.customerName,
        status: 'Draft',
        companyId,
        remark: 'auto:pay-full',
        referenceNo: so.soNumber,
        taxRate: TAX_RATE,
        taxAmount,
        totalAmount: totalAmt,
        totalSellingPrice: subtotal,
      },
    });
    await tx.documentItem.createMany({ data: buildItemRows(doId, doNumber, 'DELIVERY_ORDER') });
    await tx.deliveryOrderDocument.create({
      data: { id: doId, documentNumber: doNumber, linkedSOId: soId },
    });

    // 3. Stock OUT via DO
    if (moveItems.length > 0) {
      await recordStockMove(tx, {
        items: moveItems,
        docNumber: doNumber,
        docType: 'DELIVERY_ORDER',
        direction: 'OUT',
        companyId,
        docId: doId,
        userId: userName,
      });
    }

    // 4. Create RC
    await tx.document.create({
      data: {
        id: rcId,
        documentType: 'RECEIPT',
        documentNumber: rcNumber,
        title: `ใบเสร็จรับเงิน — ${so.customerName}`,
        documentDate: today,
        customerId: so.customerCode,
        billTo: so.customerName,
        status: 'Received',
        companyId,
        taxRate: TAX_RATE,
        taxAmount,
        totalAmount: totalAmt,
        totalSellingPrice: subtotal,
        referenceNo: invNumber,
      },
    });
    await tx.documentItem.createMany({ data: buildItemRows(rcId, rcNumber, 'RECEIPT') });
    await tx.receiptDocument.create({
      data: {
        id: rcId,
        documentNumber: rcNumber,
        receivedDate: today,
        linkedSOId: soId,
        linkedDOId: doId,
      },
    });

    // 5. Complete SO
    await tx.saleOrder.update({
      where: { id: soId },
      data: { status: 'COMPLETED' },
    });
  });

  return { rcId, doId, invId };
}
```

- [ ] **Step 3: Add `payFull` handler to `SOController.ts`**

In `backend/src/controllers/SOController.ts`, add this method inside the `SOController` object after `complete`:

```typescript
  async payFull(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });
    try {
      const result = await payFullSO(req.params.id, ctx.companyId, ctx.userName ?? undefined);
      return res.json({ success: true, data: result });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'Pay full failed' });
    }
  },
```

Also add the import at the top of the file:
```typescript
import { payFullSO } from '../lib/mainDocuments';
```

- [ ] **Step 4: Add route to `so.ts`**

In `backend/src/routes/so.ts`, add after the existing `patch` routes:

```typescript
router.post('/so/:id/pay-full', SOController.payFull);
```

- [ ] **Step 5: Verify compile**

```bash
cd /home/po/DocKey/backend
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Manual smoke test**

```bash
# Start backend
cd /home/po/DocKey/backend && npm run dev &
# In another terminal, confirm a DRAFT SO first, then call pay-full
# Replace TOKEN and SO_ID with actual values
curl -s -X POST http://localhost:3000/api/so/SO_ID/pay-full \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" | jq .
```

Expected: `{ success: true, data: { rcId: "...", doId: "...", invId: "..." } }`

- [ ] **Step 7: Commit**

```bash
git add backend/src/lib/mainDocuments.ts backend/src/controllers/SOController.ts backend/src/routes/so.ts
git commit -m "feat: payFullSO — atomic INV+DO+RC transaction endpoint"
```

---

### Task 4: DO Documents Frontend Page

**Files:**
- Modify: `frontend/src/pages/documents/documentShared.ts` (add orange accent, add delivery_order to OPERATIONS_TYPES)
- Create: `frontend/src/pages/documents/DODocuments.tsx`
- Modify: `frontend/src/App.tsx` (add route)
- Modify: `frontend/src/pages/documents/DocumentsHub.tsx` (add DO to Operations card)

**Interfaces:**
- Consumes: `documentTypeConfigs['delivery_order']`, `accentClasses['orange']`, `loadTabDocuments('delivery_order')`
- Produces: Route `/documents/operations/do` renders list+create+view for DO documents

- [ ] **Step 1: Add `orange` accent and update `OPERATIONS_TYPES` in `documentShared.ts`**

In `frontend/src/pages/documents/documentShared.ts`, find `accentClasses`:

```typescript
export const accentClasses: Record<string, { tab: string; activeTab: string; btn: string; badge: string }> = {
  blue:    { tab: 'border-blue-500',    activeTab: 'bg-blue-600 text-white border-blue-600',    btn: 'bg-blue-600 hover:bg-blue-700',    badge: 'bg-blue-100 text-blue-700' },
  cyan:    { tab: 'border-cyan-500',    activeTab: 'bg-cyan-600 text-white border-cyan-600',    btn: 'bg-cyan-600 hover:bg-cyan-700',    badge: 'bg-cyan-100 text-cyan-700' },
  teal:    { tab: 'border-teal-500',    activeTab: 'bg-teal-600 text-white border-teal-600',    btn: 'bg-teal-600 hover:bg-teal-700',    badge: 'bg-teal-100 text-teal-700' },
  emerald: { tab: 'border-emerald-500', activeTab: 'bg-emerald-600 text-white border-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  amber:   { tab: 'border-amber-500',   activeTab: 'bg-amber-500 text-white border-amber-500',  btn: 'bg-amber-500 hover:bg-amber-600',  badge: 'bg-amber-100 text-amber-700' },
  violet:  { tab: 'border-violet-500',  activeTab: 'bg-violet-600 text-white border-violet-600', btn: 'bg-violet-600 hover:bg-violet-700', badge: 'bg-violet-100 text-violet-700' },
  rose:    { tab: 'border-rose-500',    activeTab: 'bg-rose-600 text-white border-rose-600',    btn: 'bg-rose-600 hover:bg-rose-700',    badge: 'bg-rose-100 text-rose-700' },
  orange:  { tab: 'border-orange-500',  activeTab: 'bg-orange-600 text-white border-orange-600', btn: 'bg-orange-600 hover:bg-orange-700', badge: 'bg-orange-100 text-orange-700' },
  pink:    { tab: 'border-pink-500',    activeTab: 'bg-pink-600 text-white border-pink-600',    btn: 'bg-pink-600 hover:bg-pink-700',    badge: 'bg-pink-100 text-pink-700' },
};
```

Also update `OPERATIONS_TYPES`:
```typescript
export const OPERATIONS_TYPES: MainDocumentType[] = ['work_order', 'delivery_order'];
```

- [ ] **Step 2: Create `DODocuments.tsx`**

Create `frontend/src/pages/documents/DODocuments.tsx` — copy the pattern from `OperationsDocuments.tsx` but for `delivery_order`:

```typescript
import { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../../components/Layout/Layout';
import AllDocumentForm from '../../components/Documents/AllDocumentForm';
import useThemePreference from '../../hooks/useThemePreference';
import { showAppConfirm } from '../../services/dialogService';
import documentService, { MainDocumentType } from '../../services/documentService';
import {
  documentTypeConfigs, accentClasses, createEmptyCollections, DocumentsByType,
  getRecordKey, formatDate, formatCurrency, replaceRecord, loadTabDocuments,
} from './documentShared';

const TYPE: MainDocumentType = 'delivery_order';
const DO_STATUS_OPTIONS = ['All', 'Draft', 'Delivered', 'Cancelled'];

export default function DODocuments({ onNavigate = () => { }, currentPage = 'documents' }: any) {
  const [darkMode, setDarkMode] = useThemePreference();
  const [docs, setDocs] = useState<DocumentsByType>(createEmptyCollections());
  const [editorState, setEditorState] = useState<{ type: MainDocumentType; initialData: any } | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const cfg = documentTypeConfigs[TYPE];
  const acc = accentClasses[cfg.accent];

  useEffect(() => {
    loadTabDocuments(TYPE).then((rows) => {
      setDocs((prev) => ({ ...prev, [TYPE]: rows }));
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!editorState) return;
    window.requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [editorState]);

  const records = docs[TYPE] || [];

  const filteredRecords = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return records.filter((r) => {
      const matchKw = !kw || [r.documentNumber, r.title, r.referenceNo, r.status, r.remark, r.linkedSOId]
        .some((v) => String(v ?? '').toLowerCase().includes(kw));
      const matchStatus = statusFilter === 'All' || String(r.status || '').trim() === statusFilter;
      return matchKw && matchStatus;
    });
  }, [records, search, statusFilter]);

  const handleCreate = () => { setSelectedRecord(null); setEditorState({ type: TYPE, initialData: null }); };

  const handleView = async (record: any) => {
    setEditorState(null);
    try {
      const id = record?.documentId || record?.id || record?.documentNumber;
      const res = await documentService.getById(TYPE, id);
      setSelectedRecord(res?.data?.data || record);
    } catch { setSelectedRecord(record); }
  };

  const handleEdit = (record: any) => {
    setSelectedRecord(null);
    setEditorState({ type: TYPE, initialData: { ...record, __mode: 'edit' } });
  };

  const handleDelete = async (record: any) => {
    const confirmed = await showAppConfirm({
      title: 'ลบใบส่งสินค้า',
      message: `ต้องการลบ ${record.documentNumber || 'เอกสารนี้'}?\n\nไม่สามารถกู้คืนได้`,
      confirmText: 'ลบ', cancelText: 'ยกเลิก', tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await documentService.delete(TYPE, getRecordKey(record));
      setDocs((prev) => ({ ...prev, [TYPE]: prev[TYPE].filter((r) => getRecordKey(r) !== getRecordKey(record)) }));
      if (getRecordKey(selectedRecord) === getRecordKey(record)) setSelectedRecord(null);
    } catch { /* ignore */ }
  };

  const handleSaved = (saved: any) => {
    setDocs((prev) => ({ ...prev, [TYPE]: replaceRecord(prev[TYPE], saved) }));
    setEditorState(null);
    setSelectedRecord(saved);
  };

  const backToList = () => { setEditorState(null); setSelectedRecord(null); };

  return (
    <Layout darkMode={darkMode} setDarkMode={setDarkMode} currentPage={currentPage} onNavigate={onNavigate}>
      <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {cfg.icon} {cfg.labelTh}
            </h1>
            <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              จัดการใบส่งสินค้า — ตัดสต๊อกเมื่อสร้าง
            </p>
          </div>
          {!editorState && !selectedRecord && (
            <button type="button" onClick={handleCreate}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${acc.btn}`}>
              + {cfg.createLabel}
            </button>
          )}
        </div>

        {/* Editor */}
        {editorState && (
          <div ref={editorRef}>
            <AllDocumentForm
              documentType={editorState.type}
              initialData={editorState.initialData}
              darkMode={darkMode}
              onSaved={handleSaved}
              onCancel={backToList}
            />
          </div>
        )}

        {/* View */}
        {selectedRecord && !editorState && (
          <AllDocumentForm
            documentType={TYPE}
            initialData={{ ...selectedRecord, __mode: 'view' }}
            darkMode={darkMode}
            onSaved={handleSaved}
            onCancel={backToList}
            onEdit={() => handleEdit(selectedRecord)}
            onDelete={() => handleDelete(selectedRecord)}
          />
        )}

        {/* List */}
        {!editorState && !selectedRecord && (
          <div className={`rounded-2xl border shadow-sm ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            <div className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <input
                type="text"
                placeholder="ค้นหา เลขเอกสาร, อ้างอิง SO, สถานะ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`rounded-xl border px-3 py-2 text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-orange-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900'}`}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`rounded-xl border px-3 py-2 text-sm focus:outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                {DO_STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-gray-400">กำลังโหลด...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-gray-400">ไม่พบเอกสาร</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b text-left ${darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-100 text-gray-500'}`}>
                      <th className="px-5 py-3 font-medium">เลขเอกสาร</th>
                      <th className="px-5 py-3 font-medium">วันที่</th>
                      <th className="px-5 py-3 font-medium">อ้างอิง SO</th>
                      <th className="px-5 py-3 font-medium">สถานะ</th>
                      <th className="px-5 py-3 font-medium text-right">ยอดรวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r) => (
                      <tr key={getRecordKey(r)}
                        onClick={() => handleView(r)}
                        className={`cursor-pointer border-b transition ${darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-50 hover:bg-orange-50'}`}>
                        <td className="px-5 py-3 font-mono font-medium">{r.documentNumber}</td>
                        <td className="px-5 py-3">{formatDate(r.documentDate)}</td>
                        <td className="px-5 py-3 text-gray-500">{r.linkedSOId || r.referenceNo || '-'}</td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${acc.badge}`}>{r.status}</span>
                        </td>
                        <td className="px-5 py-3 text-right font-mono">{formatCurrency(r.total || r.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
```

- [ ] **Step 3: Add route in `App.tsx`**

In `frontend/src/App.tsx`, add import and route:

After the existing `OperationsDocuments` import:
```typescript
import DODocuments from './pages/documents/DODocuments';
```

After the `pageRouteMap` entry for `documents-operations`:
```typescript
  'documents-operations-do': '/documents/operations/do',
```

After the existing `/documents/operations` route in `ActivationAwareRoutes`:
```typescript
      <Route
        path="/documents/operations/do"
        element={<RoutedPage component={DODocuments} currentPage="documents-operations-do" />}
      />
```

- [ ] **Step 4: Update `DocumentsHub.tsx` — Operations card**

In `frontend/src/pages/documents/DocumentsHub.tsx`, find the `operations` entry in the `SYSTEMS` array and add DO:

```typescript
  {
    key: 'operations',
    route: '/documents/operations',
    icon: '🛠️',
    title: 'ระบบหลังบ้าน',
    subtitle: 'Operations System',
    description: 'จัดการใบสั่งงาน ใบส่งสินค้า และการดำเนินงานภายใน',
    color: 'rose',
    types: [
      { key: 'work_order',      label: 'ใบสั่งงาน',     icon: '🛠️' },
      { key: 'delivery_order',  label: 'ใบส่งสินค้า',   icon: '🚚' },
    ],
    flow: 'สร้างงาน → มอบหมาย → ส่งสินค้า (ตัดสต๊อก) → ปิดงาน',
  },
```

The hub card for `operations` is a single `<button>` element (line ~127 in DocumentsHub.tsx) — no nested buttons. Simply update the `types` array and `flow` text as shown above so the DO badge appears in the card. Users navigate to DO directly via the `App.tsx` route `/documents/operations/do` or via the `Layout` sidebar if present.

- [ ] **Step 5: Verify frontend compiles**

```bash
cd /home/po/DocKey/frontend
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/documents/DODocuments.tsx frontend/src/App.tsx frontend/src/pages/documents/DocumentsHub.tsx frontend/src/pages/documents/documentShared.ts
git commit -m "feat: add DO document page + route + hub card update"
```

---

### Task 5: "จ่ายเต็ม" Button on SO + "พิมพ์ DO" Button on RC View

**Files:**
- Modify: `frontend/src/services/soService.ts` (add `payFull`)
- Modify: `frontend/src/pages/documents/SOTab.tsx` (add `onPayFull` prop + button)
- Modify: `frontend/src/pages/documents/SalesDocuments.tsx` (wire `onPayFull` handler)
- Modify: `frontend/src/components/Documents/AllDocumentForm.tsx` (add print DO button in RC view)

**Interfaces:**
- Consumes: `POST /api/so/:id/pay-full` (Task 3), `linkedDOId` on RC record (Task 1)
- Produces: "จ่ายเต็ม" button visible on cash CONFIRMED SO without DI; navigates to RC view on success

- [ ] **Step 1: Add `payFull` to `soService.ts`**

In `frontend/src/services/soService.ts`, add inside the `soService` object:

```typescript
  payFull: (id: string) =>
    axios.post<{ success: boolean; data: { rcId: string; doId: string; invId: string } }>(
      `${BASE}/${encodeURIComponent(id)}/pay-full`
    ),
```

- [ ] **Step 2: Add `onPayFull` prop to `SOTab.tsx`**

In `frontend/src/pages/documents/SOTab.tsx`, update the `Props` interface:

```typescript
interface Props {
  darkMode: boolean;
  isAdmin?: boolean;
  initialQuotation?: any;
  onLinkToDI?: (so: any) => void;
  onLinkToBalanceInvoice?: (so: any) => void;
  onNavigateToDI?: (diDocumentNumber: string) => void;
  onNavigateToInvoice?: (invDocumentNumber: string) => void;
  onCountChange?: (count: number) => void;
  onPayFull?: (so: any) => void;
}
```

Update the function signature to destructure `onPayFull`:
```typescript
export default function SOTab({ darkMode, isAdmin = false, initialQuotation, onLinkToDI, onLinkToBalanceInvoice, onNavigateToDI, onNavigateToInvoice, onCountChange, onPayFull }: Props) {
```

In the view mode action buttons (after the `onLinkToDI` button at ~line 541), add the "จ่ายเต็ม" button:

```tsx
{(() => {
  if (viewing.status !== 'CONFIRMED' || !onPayFull || workflowStatus?.di || workflowStatus?.receipt) return null;
  const termCode = String(viewing.paymentTerm || '').trim();
  const pt = paymentTermCodes.find((t: any) => String(t.termId || '').trim() === termCode);
  const isCash = termCode && (!pt || Number(pt.days ?? -1) === 0);
  if (!isCash) return null;
  return (
    <button type="button" onClick={() => onPayFull(viewing)}
      className="rounded-xl px-3 py-1.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition">
      ✓ จ่ายเต็ม
    </button>
  );
})()}
```

- [ ] **Step 3: Wire `onPayFull` in `SalesDocuments.tsx`**

In `frontend/src/pages/documents/SalesDocuments.tsx`, add the handler after `handleSOtoDI`:

```typescript
  const handlePayFull = async (so: any) => {
    const confirmed = await showAppConfirm({
      title: 'ยืนยันรับชำระเงินเต็มจำนวน',
      message: `ยืนยันรับชำระเงินเต็มจำนวนสำหรับ ${so.soNumber}?\nระบบจะออกใบแจ้งหนี้ ใบเสร็จ และใบส่งสินค้าให้อัตโนมัติ`,
      confirmText: 'ยืนยัน',
      cancelText: 'ยกเลิก',
      tone: 'info',
    });
    if (!confirmed) return;
    try {
      const res = await soService.payFull(so.id);
      const { rcId } = res.data.data;
      // Switch to receipt tab and show the newly created RC
      setActiveTab('receipt');
      loadedTabsRef.current.delete('receipt'); // force reload
      const [rcRes, rows] = await Promise.all([
        documentService.getById('receipt', rcId),
        loadTabDocuments('receipt'),
      ]);
      setDocs((prev) => ({ ...prev, receipt: rows }));
      loadedTabsRef.current.add('receipt');
      setSelectedRecord(rcRes?.data?.data || null);
      setEditorState(null);
    } catch (err: any) {
      await showAppAlert({
        title: 'เกิดข้อผิดพลาด',
        message: err?.response?.data?.message || 'ไม่สามารถดำเนินการได้',
        tone: 'danger',
      });
    }
  };
```

Pass it to `SOTab`:
```tsx
<SOTab
  key={pendingSO ? (pendingSO.documentNumber || pendingSO.documentId || Date.now()) : 'default'}
  darkMode={darkMode}
  isAdmin={isAdmin}
  initialQuotation={pendingSO ?? undefined}
  onLinkToDI={handleSOtoDI}
  onLinkToBalanceInvoice={handleSOtoBalanceInvoice}
  onNavigateToDI={handleNavigateToDI}
  onNavigateToInvoice={handleNavigateToInvoice}
  onCountChange={setSoCount}
  onPayFull={handlePayFull}
/>
```

Also add `soService` import if not already present:
```typescript
import soService from '../../services/soService';
```

- [ ] **Step 4: Add "พิมพ์ DO" button in RC view mode in `AllDocumentForm.tsx`**

In `frontend/src/components/Documents/AllDocumentForm.tsx`, find the RC view mode section. Search for where the print/action buttons appear for `receipt` type documents. Add a "พิมพ์ DO" button when `initialData.linkedDOId` is truthy:

```tsx
{documentType === 'receipt' && initialData?.linkedDOId && (
  <button
    type="button"
    onClick={async () => {
      try {
        const res = await documentService.getById('delivery_order', initialData.linkedDOId);
        const doDoc = res?.data?.data;
        if (doDoc) {
          // Open DO in a new tab/window for printing
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`<html><head><title>DO ${doDoc.documentNumber}</title></head><body>`);
            printWindow.document.write(`<h2>ใบส่งสินค้า ${doDoc.documentNumber}</h2>`);
            printWindow.document.write(`<p>ลูกค้า: ${doDoc.billTo || '-'}</p>`);
            printWindow.document.write(`<p>อ้างอิง SO: ${doDoc.referenceNo || '-'}</p>`);
            printWindow.document.close();
            printWindow.print();
          }
        }
      } catch { /* ignore */ }
    }}
    className="rounded-xl px-3 py-1.5 text-sm font-semibold border border-orange-400 text-orange-600 hover:bg-orange-50 transition">
    🚚 พิมพ์ใบส่งสินค้า (DO)
  </button>
)}
```

> **Note:** This is a minimal print implementation. The full print layout can be enhanced later to match the existing `InvoicePrintLayout` component. The button is only shown on RC records that have `linkedDOId` set (i.e., created via pay-full).

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /home/po/DocKey/frontend
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Manual end-to-end test**

1. Open the app → go to Sales → SO tab
2. Create a new SO with a cash payment term (Days=0) and add items
3. Confirm the SO → should see "✓ จ่ายเต็ม" button
4. Click "✓ จ่ายเต็ม" → confirm dialog → should redirect to RC view
5. RC view should show "🚚 พิมพ์ใบส่งสินค้า (DO)" button
6. Go to Operations → Delivery Order → verify DO was auto-created
7. Check Stock Inventory → verify stock was deducted
8. Verify SO status = COMPLETED

- [ ] **Step 7: Commit**

```bash
git add frontend/src/services/soService.ts frontend/src/pages/documents/SOTab.tsx frontend/src/pages/documents/SalesDocuments.tsx frontend/src/components/Documents/AllDocumentForm.tsx
git commit -m "feat: จ่ายเต็ม button on SO + print DO button on RC view"
```
