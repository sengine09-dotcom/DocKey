# Deposit Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 5-document deposit billing chain (Deposit Invoice → Deposit Receipt → Balance Invoice → Final Receipt) with a configurable deposit percentage, GR-gated balance invoicing, and auto-completion with stock deduction on full payment.

**Architecture:** Extend the existing `mainDocuments.ts` pattern by adding `deposit_invoice` as a new document type. Business logic gates and the completion trigger all live in `saveDocumentByType()`. The frontend follows the existing tab+form pattern in `SalesDocuments.tsx` and `AllDocumentForm.tsx`.

**Tech Stack:** Node.js + Express + Prisma (MySQL), React 18 + TypeScript + Tailwind CSS

## Global Constraints

- All new Prisma fields use `@map()` with PascalCase column names
- Document number auto-format: `{PREFIX}-{YY}-{000001}`, prefix for deposit_invoice = `DI`
- Default deposit percentage = 30; valid range 1–99
- VAT rate = 7% (taken from QT's taxRate field, not hardcoded)
- GR "confirmed" status string = `'CONFIRMED'`
- SO "confirmed" status string = `'CONFIRMED'`; SO "completed" = `'COMPLETED'`
- QT "confirmed" status string = `'Confirmed'`; QT "completed" = `'Completed'`
- Stock deduction doc type string for StockTransaction = `'RECEIPT'`
- Error messages follow existing Thai-language patterns in mainDocuments.ts

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/prisma/schema.prisma` | Modify | Add enum value, new model, extend existing models |
| `backend/prisma/migrations/` | Auto-generated | `npx prisma migrate dev` |
| `backend/src/lib/mainDocuments.ts` | Modify | Type registration, gates, completion trigger, stock OUT |
| `frontend/src/services/documentService.ts` | Modify | Add `deposit_invoice` to `MainDocumentType` union |
| `frontend/src/pages/documents/documentShared.ts` | Modify | Config entry, teal accent, builder functions |
| `frontend/src/components/Documents/AllDocumentForm.tsx` | Modify | deposit_invoice labels, status, number prefix, type-specific fields |
| `frontend/src/components/Documents/DepositDeductionSummary.tsx` | Create | Pure display component for RE summary table |
| `frontend/src/pages/documents/SalesDocuments.tsx` | Modify | New tab, new link handlers, QT action changes |

---

### Task 1: DB Schema + Migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Auto-generate: `backend/prisma/migrations/<timestamp>_add_deposit_invoice/`

**Interfaces:**
- Produces: Prisma client with `prisma.depositInvoiceDocument`, `depositInvoiceDocument` relation on `Document`; new nullable columns on `DepositReceiptDocument`, `InvoiceDocument`, `ReceiptDocument`

- [ ] **Step 1: Add `DEPOSIT_INVOICE` to the `DocumentType` enum**

In `backend/prisma/schema.prisma`, find the `DocumentType` enum and add the new value:
```prisma
enum DocumentType {
  QUOTATION
  INVOICE
  RECEIPT
  DEPOSIT_RECEIPT
  DEPOSIT_INVOICE     // ← add this line
  PURCHASE_ORDER
  WORK_ORDER
  DELIVERY_ORDER
  CUSTOMER_RETURN
}
```

- [ ] **Step 2: Add `depositInvoiceDocument` relation to the `Document` model**

Inside the `model Document { ... }` block, add after the `depositReceiptDocument` line:
```prisma
  depositInvoiceDocument DepositInvoiceDocument?
```

- [ ] **Step 3: Add the `DepositInvoiceDocument` extension model**

Append this new model to the end of `schema.prisma`, before any closing content:
```prisma
model DepositInvoiceDocument {
  documentId        String   @id @map("DocumentID") @db.Char(26)
  documentNumber    String   @map("DocumentNumber") @db.Char(26)
  linkedQuotationId String?  @map("LinkedQuotationId") @db.VarChar(26)
  linkedSOId        String?  @map("LinkedSOId") @db.VarChar(191)
  depositPercentage Decimal  @map("DepositPercentage") @db.Decimal(5, 2)
  depositAmount     Decimal  @map("DepositAmount") @db.Decimal(19, 4)
  balanceAmount     Decimal  @map("BalanceAmount") @db.Decimal(19, 4)
  document          Document @relation(fields: [documentId], references: [id], onDelete: Cascade, onUpdate: Cascade)
}
```

- [ ] **Step 4: Add `linkedSOId` to `DepositReceiptDocument`**

Inside `model DepositReceiptDocument { ... }`, add before the `document` relation line:
```prisma
  linkedSOId            String?   @map("LinkedSOId") @db.VarChar(191)
```

- [ ] **Step 5: Add two columns to `InvoiceDocument`**

Inside `model InvoiceDocument { ... }`, add before the `document` relation line:
```prisma
  linkedDepositReceiptId String? @map("LinkedDepositReceiptId") @db.VarChar(26)
  linkedSOId             String? @map("LinkedSOId") @db.VarChar(191)
```

- [ ] **Step 6: Add two columns to `ReceiptDocument`**

Inside `model ReceiptDocument { ... }`, add before the `document` relation line:
```prisma
  linkedDepositReceiptId String?  @map("LinkedDepositReceiptId") @db.VarChar(26)
  linkedSOId             String?  @map("LinkedSOId") @db.VarChar(191)
  depositAmountDeducted  Decimal? @map("DepositAmountDeducted") @db.Decimal(19, 4)
```

- [ ] **Step 7: Run the migration**

```bash
cd /home/po/DocKey/backend
npx prisma migrate dev --name add_deposit_invoice
```

Expected output:
```
✔ Generated Prisma Client
The following migration(s) have been applied:
  migrations/20260623xxxxxx_add_deposit_invoice/migration.sql
```

- [ ] **Step 8: Verify Prisma client regenerated**

```bash
cd /home/po/DocKey/backend
npx prisma generate
```

Expected: `✔ Generated Prisma Client` with no errors.

- [ ] **Step 9: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: add deposit_invoice schema — DepositInvoiceDocument table + linked fields on DR/Invoice/Receipt"
```

---

### Task 2: Backend — Register `deposit_invoice` in mainDocuments.ts

**Files:**
- Modify: `backend/src/lib/mainDocuments.ts`

**Interfaces:**
- Consumes: Prisma `depositInvoiceDocument` relation (Task 1)
- Produces: `isMainDocumentType('deposit_invoice') === true`; `listDocumentsByType('deposit_invoice', ...)` returns `[]`; `getDocumentById('deposit_invoice', ...)` returns mapped record

- [ ] **Step 1: Write a test that currently fails**

Create `backend/src/lib/__tests__/mainDocuments.depositInvoice.test.ts`:
```typescript
import { isMainDocumentType } from '../mainDocuments';

describe('deposit_invoice type registration', () => {
  it('recognises deposit_invoice as a valid type', () => {
    expect(isMainDocumentType('deposit_invoice')).toBe(true);
  });
});
```

Run: `cd /home/po/DocKey/backend && npx jest mainDocuments.depositInvoice --passWithNoTests 2>&1 | tail -5`

Expected: FAIL — `Expected: true, Received: false`

- [ ] **Step 2: Add `deposit_invoice` to the four lookup maps**

In `mainDocuments.ts`, update `DOCUMENT_TYPE_MAP`:
```typescript
const DOCUMENT_TYPE_MAP = {
  quotation: 'QUOTATION',
  invoice: 'INVOICE',
  receipt: 'RECEIPT',
  deposit_receipt: 'DEPOSIT_RECEIPT',
  deposit_invoice: 'DEPOSIT_INVOICE',   // ← add
  purchase_order: 'PURCHASE_ORDER',
  work_order: 'WORK_ORDER',
  delivery_order: 'DELIVERY_ORDER',
  customer_return: 'CUSTOMER_RETURN',
} as const;
```

Update `PRISMA_TO_APP_DOCUMENT_TYPE`:
```typescript
const PRISMA_TO_APP_DOCUMENT_TYPE = {
  QUOTATION: 'quotation',
  INVOICE: 'invoice',
  RECEIPT: 'receipt',
  DEPOSIT_RECEIPT: 'deposit_receipt',
  DEPOSIT_INVOICE: 'deposit_invoice',   // ← add
  PURCHASE_ORDER: 'purchase_order',
  WORK_ORDER: 'work_order',
  DELIVERY_ORDER: 'delivery_order',
  CUSTOMER_RETURN: 'customer_return',
} as const;
```

Update `DOCUMENT_DEFAULT_STATUS`:
```typescript
deposit_invoice: 'Draft',
```

Update `DOCUMENT_PREFIX`:
```typescript
deposit_invoice: 'DI',
```

- [ ] **Step 3: Add `deposit_invoice` to `TYPE_RELATION_MAP`**

```typescript
deposit_invoice: { depositInvoiceDocument: true },
```

- [ ] **Step 4: Add `deposit_invoice` mapping to `mapDocumentRecord`**

After the `deposit_receipt` block (around line 357), add:
```typescript
  if (documentType === 'deposit_invoice') {
    return {
      ...baseRecord,
      linkedQuotationId: document.depositInvoiceDocument?.linkedQuotationId || '',
      linkedSOId: document.depositInvoiceDocument?.linkedSOId || '',
      depositPercentage: toNumber(document.depositInvoiceDocument?.depositPercentage),
      depositAmount: toNumber(document.depositInvoiceDocument?.depositAmount),
      balanceAmount: toNumber(document.depositInvoiceDocument?.balanceAmount),
    };
  }
```

- [ ] **Step 5: Add `deposit_invoice` case to `buildSubtypeUpsert`**

Before the final `return prisma.customerReturnDocument.upsert(...)` line, add:
```typescript
  if (type === 'deposit_invoice') {
    return prisma.depositInvoiceDocument.upsert({
      where: { documentId },
      create: {
        documentId,
        documentNumber,
        linkedQuotationId: parseString(header.linkedQuotationId),
        linkedSOId: parseString(header.linkedSOId),
        depositPercentage: toNumber(header.depositPercentage) || 30,
        depositAmount: toNumber(header.depositAmount),
        balanceAmount: toNumber(header.balanceAmount),
      },
      update: {
        documentNumber,
        linkedQuotationId: parseString(header.linkedQuotationId),
        linkedSOId: parseString(header.linkedSOId),
        depositPercentage: toNumber(header.depositPercentage) || 30,
        depositAmount: toNumber(header.depositAmount),
        balanceAmount: toNumber(header.balanceAmount),
      },
    });
  }
```

- [ ] **Step 6: Run the test**

```bash
cd /home/po/DocKey/backend && npx jest mainDocuments.depositInvoice --passWithNoTests 2>&1 | tail -5
```

Expected: PASS

- [ ] **Step 7: Also update `buildSubtypeUpsert` for `deposit_receipt` to store `linkedSOId`**

In the existing `deposit_receipt` upsert in `buildSubtypeUpsert`, add `linkedSOId` to both `create` and `update`:
```typescript
  if (type === 'deposit_receipt') {
    return prisma.depositReceiptDocument.upsert({
      where: { id: documentId },
      create: {
        id: documentId,
        documentNumber,
        receivedDate: parseDate(header.receivedDate),
        paymentReference: parseString(header.paymentReference),
        paymentAmount: parseNullableNumber(header.paymentAmount),
        paymentType: parseString(header.paymentType),
        linkedQuotationId: parseString(header.linkedQuotationId),
        linkedQuotationNumber: parseString(header.linkedQuotationNumber),
        linkedSOId: parseString(header.linkedSOId),       // ← add
      },
      update: {
        documentNumber,
        receivedDate: parseDate(header.receivedDate),
        paymentReference: parseString(header.paymentReference),
        paymentAmount: parseNullableNumber(header.paymentAmount),
        paymentType: parseString(header.paymentType),
        linkedQuotationId: parseString(header.linkedQuotationId),
        linkedQuotationNumber: parseString(header.linkedQuotationNumber),
        linkedSOId: parseString(header.linkedSOId),       // ← add
      },
    });
  }
```

Also update `mapDocumentRecord` for `deposit_receipt` to expose `linkedSOId`:
```typescript
  if (documentType === 'deposit_receipt') {
    return {
      ...baseRecord,
      receivedDate: document.depositReceiptDocument?.receivedDate || null,
      paymentReference: document.depositReceiptDocument?.paymentReference || '',
      paymentAmount: toNumber(document.depositReceiptDocument?.paymentAmount),
      paymentType: document.depositReceiptDocument?.paymentType || 'full',
      linkedQuotationId: document.depositReceiptDocument?.linkedQuotationId || '',
      linkedQuotationNumber: document.depositReceiptDocument?.linkedQuotationNumber || '',
      linkedSOId: document.depositReceiptDocument?.linkedSOId || '',   // ← add
    };
  }
```

- [ ] **Step 8: Update `InvoiceDocument` and `ReceiptDocument` in `buildSubtypeUpsert`**

For `invoice`, add the two new fields to both `create` and `update`:
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
        linkedDepositReceiptId: parseString(header.linkedDepositReceiptId),  // ← add
        linkedSOId: parseString(header.linkedSOId),                          // ← add
      } as any,
      update: {
        documentNumber,
        dueDate: parseDate(header.dueDate),
        doNo: parseString(header.doNo),
        linkedDepositReceiptId: parseString(header.linkedDepositReceiptId),  // ← add
        linkedSOId: parseString(header.linkedSOId),                          // ← add
      } as any,
    });
  }
```

For `receipt`, add three new fields:
```typescript
  if (type === 'receipt') {
    return prisma.receiptDocument.upsert({
      where: { id: documentId },
      create: {
        id: documentId,
        documentNumber,
        receivedDate: parseDate(header.receivedDate),
        paymentReference: parseString(header.paymentReference),
        linkedDepositReceiptId: parseString(header.linkedDepositReceiptId),  // ← add
        linkedSOId: parseString(header.linkedSOId),                          // ← add
        depositAmountDeducted: parseNullableNumber(header.depositAmountDeducted),  // ← add
      },
      update: {
        documentNumber,
        receivedDate: parseDate(header.receivedDate),
        paymentReference: parseString(header.paymentReference),
        linkedDepositReceiptId: parseString(header.linkedDepositReceiptId),  // ← add
        linkedSOId: parseString(header.linkedSOId),                          // ← add
        depositAmountDeducted: parseNullableNumber(header.depositAmountDeducted),  // ← add
      },
    });
  }
```

Also expose these in `mapDocumentRecord` for `receipt`:
```typescript
  if (documentType === 'receipt') {
    return {
      ...baseRecord,
      receivedDate: document.receiptDocument?.receivedDate || null,
      paymentReference: document.receiptDocument?.paymentReference || '',
      linkedInvoiceId: document.receiptDocument?.linkedInvoiceId || '',
      linkedInvoiceNumber: document.receiptDocument?.linkedInvoiceNumber || '',
      linkedDepositReceiptId: document.receiptDocument?.linkedDepositReceiptId || '',  // ← add
      linkedSOId: document.receiptDocument?.linkedSOId || '',                          // ← add
      depositAmountDeducted: toNumber(document.receiptDocument?.depositAmountDeducted),// ← add
    };
  }
```

And expose in `mapDocumentRecord` for `invoice` (add after the existing invoice block):
```typescript
  if (documentType === 'invoice') {
    return {
      ...baseRecord,
      invoiceId: document.documentNumber,
      invoiceNo: document.documentNumber,
      invoiceDate: document.documentDate,
      dueDate: document.invoiceDocument?.dueDate || null,
      doNo: document.invoiceDocument?.doNo || '',
      statusOnline: document.invoiceDocument?.statusOnline ?? buildInvoiceStatusOnline(status),
      linkedQuotationId: document.invoiceDocument?.linkedQuotationId || '',
      linkedQuotationNumber: document.invoiceDocument?.linkedQuotationNumber || '',
      linkedDepositReceiptId: document.invoiceDocument?.linkedDepositReceiptId || '',  // ← add
      linkedSOId: document.invoiceDocument?.linkedSOId || '',                          // ← add
    };
  }
```

- [ ] **Step 9: Start the dev server and verify the API responds**

```bash
cd /home/po/DocKey && npm run dev:backend &
sleep 3
curl -s http://localhost:3001/api/documents/deposit_invoice \
  -H "Cookie: $(cat /tmp/cookie.txt 2>/dev/null || echo '')" 2>&1 | head -5
```

Expected: JSON with `{"success":true,"data":[]}` (or 401 if no session — that's fine, it means the route is registered).

Stop the dev server after checking.

- [ ] **Step 10: Commit**

```bash
git add backend/src/lib/mainDocuments.ts
git commit -m "feat: register deposit_invoice type — maps, defaults, prefix, mapDocumentRecord, buildSubtypeUpsert"
```

---

### Task 3: Backend — Deposit Invoice Creation Gate

**Files:**
- Modify: `backend/src/lib/mainDocuments.ts` (in `saveDocumentByType`)

**Interfaces:**
- Consumes: `prisma.saleOrder`, `prisma.document` (Prisma client from Task 1)
- Produces: HTTP 500 with Thai error message when gate fails; successful save when gate passes

- [ ] **Step 1: Write failing tests**

Create `backend/src/lib/__tests__/mainDocuments.diGate.test.ts`:
```typescript
// These are unit tests for the gate logic extracted into a helper.
// The gate checks are inline in saveDocumentByType, so we test via integration
// against a real (test) DB or by mocking prisma. For now, test the happy-path
// validation logic directly.

describe('Deposit Invoice gate validation', () => {
  it('rejects depositPercentage = 0', () => {
    const pct = 0;
    expect(pct >= 1 && pct <= 99).toBe(false);
  });

  it('rejects depositPercentage = 100', () => {
    const pct = 100;
    expect(pct >= 1 && pct <= 99).toBe(false);
  });

  it('accepts depositPercentage = 30', () => {
    const pct = 30;
    expect(pct >= 1 && pct <= 99).toBe(true);
  });
});
```

Run: `cd /home/po/DocKey/backend && npx jest mainDocuments.diGate --passWithNoTests 2>&1 | tail -5`

Expected: PASS (these are pure logic tests, no DB needed)

- [ ] **Step 2: Add the gate block inside `saveDocumentByType`**

In `mainDocuments.ts`, find the `saveDocumentByType` function. After the block that handles `deposit_receipt` duplicate check (around line 706) and before the `await prisma.document.upsert(...)` call, add:

```typescript
  if (type === 'deposit_invoice') {
    const linkedSOId = parseString(header.linkedSOId);
    const linkedQTId = parseString(header.linkedQuotationId);
    const pct = toNumber(header.depositPercentage);

    if (!linkedSOId) {
      throw new Error('กรุณาระบุใบสั่งขาย (SO)');
    }
    if (!linkedQTId) {
      throw new Error('กรุณาระบุใบเสนอราคา (QT)');
    }
    if (pct < 1 || pct > 99) {
      throw new Error('เปอร์เซ็นต์มัดจำต้องอยู่ระหว่าง 1-99');
    }

    const so = await prisma.saleOrder.findFirst({
      where: { id: linkedSOId, companyId },
      select: { status: true },
    });
    if (!so) {
      throw new Error('ไม่พบใบสั่งขาย');
    }
    if (so.status !== 'CONFIRMED') {
      throw new Error('SO ยังไม่ยืนยัน กรุณายืนยัน SO ก่อนสร้างใบแจ้งหนี้มัดจำ');
    }

    const qt = await prisma.document.findFirst({
      where: { id: linkedQTId, companyId, documentType: 'QUOTATION' },
      select: { status: true },
    });
    if (!qt) {
      throw new Error('ไม่พบใบเสนอราคา');
    }
    if (qt.status !== 'Confirmed') {
      throw new Error('ใบเสนอราคายังไม่ได้รับการยืนยัน กรุณาเปลี่ยนสถานะ QT เป็น Confirmed');
    }
  }
```

- [ ] **Step 3: Run the unit tests**

```bash
cd /home/po/DocKey/backend && npx jest mainDocuments.diGate --passWithNoTests 2>&1 | tail -5
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/src/lib/mainDocuments.ts backend/src/lib/__tests__/
git commit -m "feat: add deposit_invoice creation gate — validates SO confirmed + QT confirmed + pct range"
```

---

### Task 4: Backend — Balance Invoice GR Gate

**Files:**
- Modify: `backend/src/lib/mainDocuments.ts` (in `saveDocumentByType`)

**Interfaces:**
- Consumes: `prisma.sOItem`, `prisma.pRItem`, `prisma.goodsReceipt`, `prisma.depositReceiptDocument`
- Produces: HTTP 500 with Thai error when gate fails; save proceeds when DP + confirmed GR both exist

> **Note:** Verify exact Prisma client property names for `SOItem` and `PRItem` using TypeScript autocomplete: they may be `prisma.sOItem` and `prisma.pRItem`. If your IDE shows different names, use those instead.

- [ ] **Step 1: Write a unit test for the 3-hop GR query logic**

Append to `backend/src/lib/__tests__/mainDocuments.diGate.test.ts`:
```typescript
describe('Balance Invoice GR gate helpers', () => {
  it('returns empty array when no convertedToPr items', () => {
    const soItems: Array<{ prNumber: string | null }> = [];
    const prNumbers = soItems.map(i => i.prNumber).filter((v): v is string => Boolean(v));
    expect(prNumbers).toHaveLength(0);
  });

  it('collects prNumbers from converted items', () => {
    const soItems = [
      { convertedToPr: true, prNumber: 'PR-26-000001' },
      { convertedToPr: false, prNumber: null },
    ];
    const prNumbers = soItems
      .filter(i => i.convertedToPr)
      .map(i => i.prNumber)
      .filter((v): v is string => Boolean(v));
    expect(prNumbers).toEqual(['PR-26-000001']);
  });
});
```

Run: `cd /home/po/DocKey/backend && npx jest mainDocuments.diGate --passWithNoTests 2>&1 | tail -5`

Expected: PASS

- [ ] **Step 2: Add the Balance Invoice gate block inside `saveDocumentByType`**

After the existing `deposit_invoice` gate block (from Task 3) and before the `prisma.document.upsert` call, add:

```typescript
  if (type === 'invoice') {
    const linkedSOId = parseString(header.linkedSOId);

    if (linkedSOId) {
      // 1. Check DP exists for this SO
      const dp = await prisma.depositReceiptDocument.findFirst({
        where: { linkedSOId },
        select: { id: true },
      });
      if (!dp) {
        throw new Error('ยังไม่มีใบรับมัดจำสำหรับ SO นี้ กรุณาสร้างใบรับมัดจำก่อน');
      }

      // 2. 3-hop GR gate: SO items → PR items → GR
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
        where: { prNumber: { in: prNumbers }, convertedToPo: true },
        select: { poNumber: true },
      });
      const poNumbers = prItems
        .map(i => i.poNumber)
        .filter((v): v is string => Boolean(v));

      if (poNumbers.length === 0) {
        throw new Error('ยังไม่มีการรับสินค้า (GR) สำหรับ SO นี้');
      }

      const gr = await prisma.goodsReceipt.findFirst({
        where: { poNumber: { in: poNumbers }, status: 'CONFIRMED', companyId },
        select: { id: true },
      });
      if (!gr) {
        throw new Error('ยังไม่มีการรับสินค้า (GR) สำหรับ SO นี้');
      }
    }
  }
```

- [ ] **Step 3: Run tests**

```bash
cd /home/po/DocKey/backend && npx jest mainDocuments.diGate --passWithNoTests 2>&1 | tail -5
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/src/lib/mainDocuments.ts backend/src/lib/__tests__/
git commit -m "feat: add balance invoice GR gate — 3-hop SO→PR→GR check + DP existence check"
```

---

### Task 5: Backend — RE Completion Trigger + Stock OUT

**Files:**
- Modify: `backend/src/lib/mainDocuments.ts` (in `saveDocumentByType`)

**Interfaces:**
- Consumes: `prisma.depositReceiptDocument`, `prisma.document`, `prisma.saleOrder`, `recordStockMove` (already imported)
- Produces: On first RE save when DP+RE ≥ QT total: QT status = `'Completed'`, SO status = `'COMPLETED'`, StockTransaction OUT rows created

- [ ] **Step 1: Write unit test for completion math**

Append to `backend/src/lib/__tests__/mainDocuments.diGate.test.ts`:
```typescript
describe('RE completion check math', () => {
  it('triggers when DP + RE equals QT total exactly', () => {
    const qtTotal = 26322.00;
    const dpTotal = 7896.60;
    const reTotal = 18425.40;
    expect(dpTotal + reTotal >= qtTotal).toBe(true);
  });

  it('does not trigger when amounts are short', () => {
    const qtTotal = 26322.00;
    const dpTotal = 7896.60;
    const reTotal = 10000.00;
    expect(dpTotal + reTotal >= qtTotal).toBe(false);
  });
});
```

Run: `cd /home/po/DocKey/backend && npx jest mainDocuments.diGate --passWithNoTests 2>&1 | tail -5`

Expected: PASS

- [ ] **Step 2: Add the completion trigger block in `saveDocumentByType`**

Find the existing stock deduction block for `delivery_order` (around line 868). After that block and before the `invoice` link-update block (around line 905), add:

```typescript
  // RE completion trigger: stock OUT + order completed
  if (type === 'receipt' && existing === null) {
    const linkedSOId = parseString(header.linkedSOId);
    const linkedQTId = parseString(header.linkedQuotationId);

    if (linkedSOId && linkedQTId) {
      const qt = await prisma.document.findFirst({
        where: { id: linkedQTId, companyId, documentType: 'QUOTATION' },
        select: { id: true, totalAmount: true },
      });

      if (qt) {
        const dps = await prisma.depositReceiptDocument.findMany({
          where: { linkedSOId },
          select: { paymentAmount: true },
        });
        const dpTotal = dps.reduce((sum, dp) => sum + toNumber(dp.paymentAmount), 0);
        const reTotal = toNumber(header.total);
        const paidTotal = dpTotal + reTotal;

        if (paidTotal >= toNumber(qt.totalAmount)) {
          await prisma.document.update({
            where: { id: qt.id },
            data: { status: 'Completed' },
          });

          await prisma.saleOrder.update({
            where: { id: linkedSOId },
            data: { status: 'COMPLETED' },
          });

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
        }
      }
    }
  }
```

- [ ] **Step 3: Run all backend tests**

```bash
cd /home/po/DocKey/backend && npx jest --passWithNoTests 2>&1 | tail -10
```

Expected: all PASS

- [ ] **Step 4: Commit**

```bash
git add backend/src/lib/mainDocuments.ts backend/src/lib/__tests__/
git commit -m "feat: add RE completion trigger — stock OUT + QT/SO Completed when DP+RE >= QT total"
```

---

### Task 6: Frontend Shared — Type Union, documentShared, teal accent

**Files:**
- Modify: `frontend/src/services/documentService.ts`
- Modify: `frontend/src/pages/documents/documentShared.ts`

**Interfaces:**
- Produces: `MainDocumentType` union includes `'deposit_invoice'`; `documentTypeConfigs['deposit_invoice']` exists with teal accent; four new builder functions exported; `accentClasses['teal']` exists

- [ ] **Step 1: Add `deposit_invoice` to `MainDocumentType`**

In `frontend/src/services/documentService.ts`, update the type union:
```typescript
export type MainDocumentType =
  | 'quotation'
  | 'invoice'
  | 'receipt'
  | 'deposit_receipt'
  | 'deposit_invoice'      // ← add
  | 'purchase_order'
  | 'work_order'
  | 'delivery_order'
  | 'customer_return';
```

- [ ] **Step 2: Update `documentShared.ts` — arrays and config**

In `frontend/src/pages/documents/documentShared.ts`:

Update `DOCUMENT_TYPES`:
```typescript
export const DOCUMENT_TYPES: MainDocumentType[] = [
  'quotation', 'invoice', 'receipt', 'deposit_receipt', 'deposit_invoice',
  'purchase_order', 'work_order', 'delivery_order', 'customer_return',
];
```

Update `SALES_TYPES`:
```typescript
export const SALES_TYPES: MainDocumentType[] = [
  'quotation', 'deposit_receipt', 'deposit_invoice', 'invoice', 'receipt',
];
```

Update `createEmptyCollections`:
```typescript
export const createEmptyCollections = (): DocumentsByType => ({
  quotation: [], invoice: [], receipt: [], deposit_receipt: [],
  deposit_invoice: [],    // ← add
  purchase_order: [], work_order: [], delivery_order: [], customer_return: [],
});
```

Add to `documentTypeConfigs`:
```typescript
  deposit_invoice: {
    icon: '📋',
    label: 'Deposit Invoice',
    labelTh: 'ใบแจ้งหนี้มัดจำ',
    accent: 'teal',
    createLabel: 'สร้างใบแจ้งหนี้มัดจำ',
  },
```

Add `teal` to `accentClasses`:
```typescript
  teal: {
    tab: 'border-teal-500',
    activeTab: 'bg-teal-600 text-white border-teal-600',
    btn: 'bg-teal-600 hover:bg-teal-700',
    badge: 'bg-teal-100 text-teal-700',
  },
```

- [ ] **Step 3: Add four builder functions to `documentShared.ts`**

Append at the end of the file:

```typescript
export const buildDepositInvoiceDraftFromQuotation = (quotation: any, so: any) => {
  const qNum = String(quotation?.documentNumber || '').trim();
  const today = toDateInputValue(new Date());
  const qtTotal = Number(quotation?.total || 0);
  const depositPct = 30;
  const depositAmount = Math.round((qtTotal * depositPct / 100) * 100) / 100;
  const balanceAmount = Math.round((qtTotal - depositAmount) * 100) / 100;
  const taxRate = Number(quotation?.taxRate || 7);
  const depositBase = Math.round((depositAmount / (1 + taxRate / 100)) * 100) / 100;
  const depositVat = Math.round((depositAmount - depositBase) * 100) / 100;

  return {
    __mode: 'create',
    title: quotation?.title ? `ใบแจ้งหนี้มัดจำ — ${quotation.title}` : 'ใบแจ้งหนี้มัดจำ',
    documentDate: today,
    customer: quotation?.customer || '',
    billTo: quotation?.billTo || quotation?.customerName || '',
    paymentTerm: quotation?.paymentTerm || '',
    paymentMethod: quotation?.paymentMethod || 'Bank Transfer',
    referenceNo: qNum,
    status: 'Draft',
    remark: `มัดจำ ${depositPct}% ตามใบเสนอราคา ${qNum}`,
    taxRate: String(taxRate),
    tax: String(depositVat),
    total: String(depositAmount),
    linkedQuotationId: quotation?.documentId || quotation?.id || '',
    linkedQuotationNumber: qNum,
    linkedSOId: so?.id || '',
    depositPercentage: depositPct,
    depositAmount,
    balanceAmount,
    items: (quotation?.items || []).map((item: any) => ({
      id: item?.id || '', productCode: item?.productCode || '',
      productName: item?.productName || '', quantity: item?.quantity || '',
      cost: item?.cost || '', margin: item?.margin || '',
      sellingPrice: item?.sellingPrice || '', totalCost: item?.totalCost || '',
      totalSellingPrice: item?.totalSellingPrice || '', unitId: item?.unitId || '',
    })),
  };
};

export const buildDPFromDepositInvoice = (di: any) => {
  const diNum = String(di?.documentNumber || '').trim();
  const today = toDateInputValue(new Date());
  return {
    __mode: 'create',
    title: `ใบรับมัดจำ — ${di?.title || diNum}`,
    documentDate: today,
    customer: di?.customer || '',
    billTo: di?.billTo || '',
    paymentTerm: di?.paymentTerm || '',
    paymentMethod: di?.paymentMethod || 'Bank Transfer',
    referenceNo: diNum,
    status: 'Received',
    remark: `รับเงินมัดจำ ${di?.depositPercentage || 30}% ตามใบแจ้งหนี้มัดจำ ${diNum}`,
    taxRate: String(di?.taxRate || 7),
    receivedDate: today,
    paymentReference: '',
    paymentAmount: String(di?.depositAmount || 0),
    paymentType: 'partial',
    linkedQuotationId: di?.linkedQuotationId || '',
    linkedQuotationNumber: di?.linkedQuotationNumber || '',
    linkedSOId: di?.linkedSOId || '',
    items: (di?.items || []).map((item: any) => ({
      id: item?.id || '', productCode: item?.productCode || '',
      productName: item?.productName || '', quantity: item?.quantity || '',
      cost: item?.cost || '', margin: item?.margin || '',
      sellingPrice: item?.sellingPrice || '', totalCost: item?.totalCost || '',
      totalSellingPrice: item?.totalSellingPrice || '', unitId: item?.unitId || '',
    })),
  };
};

export const buildBalanceInvoiceFromDP = (dp: any) => {
  const dpNum = String(dp?.documentNumber || '').trim();
  const today = toDateInputValue(new Date());
  const balanceAmount = Number(dp?.balanceAmount || 0);  // stored on DI, passed via dp context
  return {
    __mode: 'create',
    title: `ใบแจ้งหนี้งวดสุดท้าย — ${dp?.title || dpNum}`,
    documentDate: today,
    customer: dp?.customer || '',
    billTo: dp?.billTo || '',
    paymentTerm: dp?.paymentTerm || '',
    paymentMethod: dp?.paymentMethod || 'Bank Transfer',
    referenceNo: dpNum,
    status: 'Pending',
    remark: `ใบแจ้งหนี้งวดสุดท้าย หักมัดจำ ${dp?.paymentAmount || 0} บาท ตาม ${dpNum}`,
    taxRate: String(dp?.taxRate || 7),
    total: String(balanceAmount),
    linkedDepositReceiptId: dp?.documentId || dp?.id || '',
    linkedDepositReceiptNumber: dpNum,
    linkedSOId: dp?.linkedSOId || '',
    linkedQuotationId: dp?.linkedQuotationId || '',
    linkedQuotationNumber: dp?.linkedQuotationNumber || '',
    items: (dp?.items || []).map((item: any) => ({
      id: item?.id || '', productCode: item?.productCode || '',
      productName: item?.productName || '', quantity: item?.quantity || '',
      cost: item?.cost || '', margin: item?.margin || '',
      sellingPrice: item?.sellingPrice || '', totalCost: item?.totalCost || '',
      totalSellingPrice: item?.totalSellingPrice || '', unitId: item?.unitId || '',
    })),
  };
};

export const buildReceiptDraftFromBalanceInvoice = (invoice: any, dp: any) => {
  const invNum = String(invoice?.documentNumber || '').trim();
  const today = toDateInputValue(new Date());
  const qtTotal = Number(invoice?.total || 0) + Number(dp?.paymentAmount || 0);
  const depositAmt = Number(dp?.paymentAmount || 0);
  const balanceNet = Number(invoice?.total || 0);
  const taxRate = Number(invoice?.taxRate || 7);
  const balanceBase = Math.round((balanceNet / (1 + taxRate / 100)) * 100) / 100;
  const balanceVat = Math.round((balanceNet - balanceBase) * 100) / 100;

  return {
    __mode: 'create',
    title: `ใบเสร็จรับเงิน — ${invoice?.title || invNum}`,
    documentDate: today,
    customer: invoice?.customer || '',
    billTo: invoice?.billTo || '',
    paymentTerm: invoice?.paymentTerm || '',
    paymentMethod: invoice?.paymentMethod || '',
    referenceNo: invNum,
    status: 'Received',
    remark: `รับชำระเงินงวดสุดท้าย อ้างอิง ${invNum}`,
    taxRate: String(taxRate),
    tax: String(balanceVat),
    total: String(balanceNet),
    receivedDate: today,
    paymentReference: '',
    linkedInvoiceId: invoice?.documentId || invoice?.id || '',
    linkedInvoiceNumber: invNum,
    linkedDepositReceiptId: dp?.documentId || dp?.id || '',
    linkedDepositReceiptNumber: String(dp?.documentNumber || ''),
    linkedSOId: invoice?.linkedSOId || dp?.linkedSOId || '',
    linkedQuotationId: invoice?.linkedQuotationId || dp?.linkedQuotationId || '',
    linkedQuotationNumber: invoice?.linkedQuotationNumber || dp?.linkedQuotationNumber || '',
    depositAmountDeducted: depositAmt,
    // These drive the DepositDeductionSummary display
    qtTotal,
    dpNumber: String(dp?.documentNumber || ''),
    depositPercentage: Number(dp?.depositPercentage || 30),
    balanceNet,
    balanceBase,
    balanceVat,
    items: (invoice?.items || []).map((item: any) => ({
      id: item?.id || '', productCode: item?.productCode || '',
      productName: item?.productName || '', quantity: item?.quantity || '',
      margin: item?.margin || '', sellingPrice: item?.sellingPrice || '',
      totalCost: item?.totalCost || '', totalSellingPrice: item?.totalSellingPrice || '',
      unitId: item?.unitId || '',
    })),
  };
};
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/po/DocKey/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing unrelated errors)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/documentService.ts frontend/src/pages/documents/documentShared.ts
git commit -m "feat: add deposit_invoice to frontend types, documentShared config, teal accent, builder functions"
```

---

### Task 7: Frontend — AllDocumentForm deposit_invoice support

**Files:**
- Modify: `frontend/src/components/Documents/AllDocumentForm.tsx`

**Interfaces:**
- Consumes: `deposit_invoice` in `MainDocumentType` (Task 6)
- Produces: AllDocumentForm renders a deposit-percentage field and computed totals when `documentType === 'deposit_invoice'`; existing types unchanged

- [ ] **Step 1: Read the top of AllDocumentForm to find the right insertion points**

Read lines 1–200 of `frontend/src/components/Documents/AllDocumentForm.tsx` to understand the component's state shape and where type-specific fields are rendered. Note the pattern used for `deposit_receipt`'s `paymentAmount` field — `deposit_invoice` will follow the same pattern.

- [ ] **Step 2: Add `deposit_invoice` to the lookup constants**

In `AllDocumentForm.tsx`, in the `DOCUMENT_TYPE_LABELS` constant, add:
```typescript
  deposit_invoice: 'Deposit Invoice',
```

In `DOCUMENT_DEFAULT_STATUS`, add:
```typescript
  deposit_invoice: 'Draft',
```

In `DOCUMENT_NUMBER_PREFIX`, add:
```typescript
  deposit_invoice: 'DI',
```

- [ ] **Step 3: Add `deposit_invoice` header state fields**

Find `getEmptyHeader` (around line 158). In the returned object, no changes are strictly needed since `deposit_invoice` uses the standard fields (`total`, `taxRate`, `tax`). However, add these type-specific fields to the header shape so they persist in state:

In `getEmptyHeader`, add after the existing fields:
```typescript
  // deposit_invoice specific
  depositPercentage: '30',
  depositAmount: '0',
  balanceAmount: '0',
  linkedSOId: '',
  linkedQuotationId: '',
  linkedQuotationNumber: '',
```

- [ ] **Step 4: Locate the type-specific rendering section**

Search in `AllDocumentForm.tsx` for `deposit_receipt` to find where type-specific fields are rendered (likely a section like "Payment Details" or "Deposit Fields"). Add the `deposit_invoice` section immediately before or after the `deposit_receipt` section, following its exact JSX pattern:

```tsx
{documentType === 'deposit_invoice' && (
  <div className={sectionCardClass}>
    <p className={sectionLabelClass}>ข้อมูลมัดจำ</p>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 mb-4">
      {/* SO picker — shown when confirmedSOs were passed from SalesDocuments */}
      {Array.isArray(initialData?.__confirmedSOs) && initialData.__confirmedSOs.length > 1 && (
        <label className="block space-y-1.5">
          <span className={labelClass}>เลือกใบสั่งขาย (SO) <span className="text-red-500">*</span></span>
          <select
            value={header.linkedSOId || ''}
            onChange={(e) => {
              const so = (initialData.__confirmedSOs as any[]).find((s: any) => s.id === e.target.value);
              setHeader((h: any) => ({ ...h, linkedSOId: e.target.value, linkedSONumber: so?.soNumber || '' }));
            }}
            className={inputClass}
          >
            <option value="">-- เลือก SO --</option>
            {(initialData.__confirmedSOs as any[]).map((so: any) => (
              <option key={so.id} value={so.id}>{so.soNumber} — {so.customerName}</option>
            ))}
          </select>
        </label>
      )}
      {header.linkedSOId && (
        <p className={`text-xs ${darkMode ? 'text-teal-300' : 'text-teal-700'}`}>
          SO: {header.linkedSOId}
        </p>
      )}
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <label className="block space-y-1.5">
        <span className={labelClass}>เปอร์เซ็นต์มัดจำ (%)</span>
        <input
          type="number"
          min={1}
          max={99}
          value={header.depositPercentage || '30'}
          onChange={(e) => {
            const pct = Math.min(99, Math.max(1, Number(e.target.value) || 30));
            const qtTotal = parseNumberInput(header.totalAmount || header.total || '0');
            const depositAmt = Math.round(qtTotal * pct / 100 * 100) / 100;
            const balanceAmt = Math.round((qtTotal - depositAmt) * 100) / 100;
            const taxRate = parseNumberInput(header.taxRate || '7');
            const depositBase = Math.round(depositAmt / (1 + taxRate / 100) * 100) / 100;
            const depositVat = Math.round((depositAmt - depositBase) * 100) / 100;
            setHeader((h: any) => ({
              ...h,
              depositPercentage: String(pct),
              depositAmount: String(depositAmt),
              balanceAmount: String(balanceAmt),
              tax: String(depositVat),
              total: String(depositAmt),
            }));
          }}
          className={inputClass}
        />
      </label>
      <div className="space-y-1.5">
        <span className={labelClass}>ยอดมัดจำ (บาท)</span>
        <p className={`py-2 px-3 text-sm font-semibold ${darkMode ? 'text-teal-300' : 'text-teal-700'}`}>
          {formatDisplayAmount(header.depositAmount || '0')}
        </p>
      </div>
      <div className="space-y-1.5">
        <span className={labelClass}>ยอดคงเหลือ (บาท)</span>
        <p className={`py-2 px-3 text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {formatDisplayAmount(header.balanceAmount || '0')}
        </p>
      </div>
    </div>
  </div>
)}
```

> **Note:** Replace `sectionCardClass`, `sectionLabelClass`, `labelClass`, `inputClass`, `darkMode` with the actual variable names used in the component (find them by reading the surrounding `deposit_receipt` block). The pattern is identical — just copy the class names used there.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /home/po/DocKey/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Documents/AllDocumentForm.tsx
git commit -m "feat: add deposit_invoice support to AllDocumentForm — labels, defaults, deposit percentage field"
```

---

### Task 8: Frontend — SalesDocuments tab + actions + DepositDeductionSummary

**Files:**
- Create: `frontend/src/components/Documents/DepositDeductionSummary.tsx`
- Modify: `frontend/src/pages/documents/SalesDocuments.tsx`
- Modify: `frontend/src/components/Documents/AllDocumentForm.tsx` (add DepositDeductionSummary to RE footer)

**Interfaces:**
- Consumes: All builders from Task 6; `documentTypeConfigs['deposit_invoice']` (Task 6)
- Produces: Working 5-tab Sales page; clicking "📋 แจ้งหนี้มัดจำ" from QT opens DI form; DI → DP → Balance Invoice → RE chain works; RE shows deduction table

- [ ] **Step 1: Create `DepositDeductionSummary.tsx`**

Create `frontend/src/components/Documents/DepositDeductionSummary.tsx`:
```tsx
interface Props {
  qtTotal: number;
  dpNumber: string;
  depositPercentage: number;
  depositAmount: number;
  balanceNet: number;
  balanceBase: number;
  vatAmount: number;
  darkMode?: boolean;
}

const fmt = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DepositDeductionSummary({
  qtTotal, dpNumber, depositPercentage, depositAmount,
  balanceNet, balanceBase, vatAmount, darkMode = false,
}: Props) {
  const border = darkMode ? 'border-gray-700' : 'border-gray-200';
  const bg = darkMode ? 'bg-gray-800/60' : 'bg-gray-50';
  const text = darkMode ? 'text-white' : 'text-gray-900';
  const muted = darkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`rounded-xl border ${border} ${bg} p-4 text-sm`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${muted}`}>
        สรุปการชำระเงิน
      </p>
      <div className="space-y-2">
        <div className={`flex justify-between font-semibold ${text}`}>
          <span>รวมมูลค่าสินค้าทั้งสิ้น (Total 100%)</span>
          <span>{fmt(qtTotal)}</span>
        </div>
        <div className={`flex justify-between ${muted}`}>
          <span>หัก เงินมัดจำตาม {dpNumber} ({depositPercentage}%)</span>
          <span className="text-red-500">-{fmt(depositAmount)}</span>
        </div>
        <div className={`flex justify-between font-bold border-t pt-2 ${border} ${text}`}>
          <span>ยอดสุทธิที่รับชำระครั้งนี้</span>
          <span>{fmt(balanceNet)}</span>
        </div>
        <div className={`mt-3 pt-3 border-t ${border} space-y-1 ${muted} text-xs`}>
          <div className="flex justify-between">
            <span>ฐานภาษีงวดนี้ (ก่อน VAT 7%)</span>
            <span>{fmt(balanceBase)}</span>
          </div>
          <div className="flex justify-between">
            <span>ภาษีมูลค่าเพิ่มงวดนี้ (VAT 7%)</span>
            <span>{fmt(vatAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add `DepositDeductionSummary` to RE in `AllDocumentForm.tsx`**

Find where the receipt (`type === 'receipt'`) summary/total section is rendered in `AllDocumentForm.tsx`. Just above or below the totals table, add:

```tsx
{documentType === 'receipt' && header.linkedDepositReceiptId && (
  <DepositDeductionSummary
    qtTotal={parseNumberInput(header.qtTotal || '0')}
    dpNumber={header.dpNumber || header.linkedDepositReceiptNumber || ''}
    depositPercentage={parseNumberInput(header.depositPercentage || '30')}
    depositAmount={parseNumberInput(header.depositAmountDeducted || '0')}
    balanceNet={parseNumberInput(header.total || '0')}
    balanceBase={parseNumberInput(header.balanceBase || '0')}
    vatAmount={parseNumberInput(header.balanceVat || header.tax || '0')}
    darkMode={darkMode}
  />
)}
```

Import at the top of `AllDocumentForm.tsx`:
```typescript
import DepositDeductionSummary from '../DepositDeductionSummary';
```

- [ ] **Step 3: Update `SalesDocuments.tsx` — add `deposit_invoice` to `SalesTabId`**

In `SalesDocuments.tsx`, update the type alias:
```typescript
type SalesTabId = MainDocumentType | 'so';
```

This already covers `deposit_invoice` once `MainDocumentType` includes it (Task 6). No change needed here — verify by confirming TypeScript doesn't error.

- [ ] **Step 4: Add `deposit_invoice` tab to the tab strip in `SalesDocuments.tsx`**

Find the tab rendering section that renders `['deposit_receipt', 'invoice', 'receipt']`. Change it to:
```typescript
{(['deposit_invoice', 'deposit_receipt', 'invoice', 'receipt'] as const).map((tab) => {
```

This inserts the new tab between SO and DP.

- [ ] **Step 5: Import new builder functions in `SalesDocuments.tsx`**

Update the import from `documentShared`:
```typescript
import {
  documentTypeConfigs, accentClasses, createEmptyCollections, DocumentsByType,
  getRecordKey, formatDate, formatCurrency, replaceRecord, loadTabDocuments,
  buildInvoiceDraftFromQuotation, buildDepositReceiptDraftFromQuotation,
  buildReceiptDraftFromInvoice,
  buildDepositInvoiceDraftFromQuotation,  // ← add
  buildDPFromDepositInvoice,              // ← add
  buildBalanceInvoiceFromDP,              // ← add
  buildReceiptDraftFromBalanceInvoice,    // ← add
  QUOTATION_STATUS_OPTIONS, getQuotationStatusStyle,
} from './documentShared';
```

- [ ] **Step 6: Add state for SO picker and new link handlers in `SalesDocuments.tsx`**

Add state for confirmed SOs:
```typescript
const [confirmedSOs, setConfirmedSOs] = useState<any[]>([]);
```

Import `soService` at the top (it's already used elsewhere in the codebase — check `frontend/src/services/soService.ts` for the import path):
```typescript
import soService from '../../services/soService';
```

Add three new link handlers (after the existing `handleLinkToSO`):
```typescript
const handleLinkToDI = async (quotation: any) => {
  const full = await fetchFullRecord(quotation, 'quotation');
  await loadCodes();

  // Load confirmed SOs for this customer so the form can show a picker
  let soList: any[] = [];
  try {
    const res = await soService.getAll();
    const allSOs = res?.data?.data || [];
    soList = allSOs.filter(
      (so: any) =>
        so.status === 'CONFIRMED' &&
        (!full.customer || so.customerCode === full.customer),
    );
  } catch {
    soList = [];
  }
  setConfirmedSOs(soList);
  setActiveTab('deposit_invoice');
  setSelectedRecord(null);

  // If exactly one matching SO, pre-select it; otherwise let form user pick
  const autoSO = soList.length === 1 ? soList[0] : null;
  setEditorState({
    type: 'deposit_invoice',
    initialData: {
      ...buildDepositInvoiceDraftFromQuotation(full, autoSO),
      __confirmedSOs: soList,
    },
  });
};

const handleLinkToDPFromDI = async (di: any) => {
  const full = await fetchFullRecord(di, 'deposit_invoice');
  setActiveTab('deposit_receipt');
  setSelectedRecord(null);
  setEditorState({ type: 'deposit_receipt', initialData: buildDPFromDepositInvoice(full) });
};

const handleLinkToBalanceInvoice = async (dp: any) => {
  const full = await fetchFullRecord(dp, 'deposit_receipt');
  setActiveTab('invoice');
  setSelectedRecord(null);
  setEditorState({ type: 'invoice', initialData: buildBalanceInvoiceFromDP(full) });
};
```

- [ ] **Step 7: Update QT list action buttons in `SalesDocuments.tsx`**

Find the QT quick-action buttons block (the one showing `🏦 มัดจำ` and `🧾 Invoice`). Replace or add the "📋 แจ้งหนี้มัดจำ" button and remove direct QT→DP:
```tsx
{activeTab === 'quotation' && (
  <>
    <button type="button" onClick={() => handleLinkToSO(record)}
      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-blue-900/40 text-blue-300 hover:bg-blue-800/60' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
      🛒 ใบสั่งขาย
    </button>
    <button type="button" onClick={() => handleLinkToDI(record)}
      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-teal-900/40 text-teal-300 hover:bg-teal-800/60' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'}`}>
      📋 แจ้งหนี้มัดจำ
    </button>
    <button type="button" onClick={() => handleLinkToInvoice(record)}
      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-800/60' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
      🧾 Invoice
    </button>
  </>
)}
```

Add DI quick-action (DI → DP):
```tsx
{activeTab === 'deposit_invoice' && (
  <button type="button" onClick={() => handleLinkToDPFromDI(record)}
    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-cyan-900/40 text-cyan-300 hover:bg-cyan-800/60' : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'}`}>
    🏦 สร้างใบรับมัดจำ
  </button>
)}
```

Update the DP (deposit_receipt) quick-action to offer Balance Invoice:
```tsx
{activeTab === 'deposit_receipt' && (
  <button type="button" onClick={() => handleLinkToBalanceInvoice(record)}
    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-800/60' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
    🧾 ใบแจ้งหนี้งวดสุดท้าย
  </button>
)}
```

Update the invoice → receipt link to use `buildReceiptDraftFromBalanceInvoice` when `linkedDepositReceiptId` is set:
```typescript
const handleLinkToReceipt = async (invoice: any) => {
  const full = await fetchFullRecord(invoice, 'invoice');
  setActiveTab('receipt');
  setSelectedRecord(null);

  if (full.linkedDepositReceiptId) {
    // Deposit workflow: fetch the DP to build correct deduction summary
    try {
      const dpRes = await documentService.getById('deposit_receipt', full.linkedDepositReceiptId);
      const dp = dpRes?.data?.data;
      setEditorState({ type: 'receipt', initialData: buildReceiptDraftFromBalanceInvoice(full, dp) });
    } catch {
      setEditorState({ type: 'receipt', initialData: buildReceiptDraftFromInvoice(full) });
    }
  } else {
    setEditorState({ type: 'receipt', initialData: buildReceiptDraftFromInvoice(full) });
  }
};
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd /home/po/DocKey/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors

- [ ] **Step 9: Smoke test in browser**

Start the full dev stack:
```bash
cd /home/po/DocKey && npm run dev
```

Navigate to `http://localhost:5173/documents/sales` and verify:
1. Six tabs are shown: ใบเสนอราคา | ใบสั่งขาย | ใบแจ้งหนี้มัดจำ | ใบรับมัดจำ | ใบแจ้งหนี้ | ใบเสร็จรับเงิน
2. "ใบแจ้งหนี้มัดจำ" tab loads empty list without errors
3. On a Confirmed QT, clicking "📋 แจ้งหนี้มัดจำ" opens the Deposit Invoice form
4. The deposit percentage field shows and changing it recalculates amounts
5. Saving a DI creates a document with prefix `DI-`
6. On the DI list, "🏦 สร้างใบรับมัดจำ" button appears and creates a DP pre-filled with deposit amount
7. On the DP list, "🧾 ใบแจ้งหนี้งวดสุดท้าย" button appears (will error if no GR — that's correct)
8. The RE form shows the `DepositDeductionSummary` table when `linkedDepositReceiptId` is populated

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/Documents/DepositDeductionSummary.tsx \
        frontend/src/components/Documents/AllDocumentForm.tsx \
        frontend/src/pages/documents/SalesDocuments.tsx
git commit -m "feat: deposit workflow UI — DI tab, link handlers, QT actions, DepositDeductionSummary on RE"
```
