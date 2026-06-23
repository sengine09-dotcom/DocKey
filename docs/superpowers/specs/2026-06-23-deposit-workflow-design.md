# Advanced Deposit Workflow — Design Spec

**Date:** 2026-06-23
**Status:** Approved

---

## 1. Overview

Implement a structured 5-document deposit billing workflow on top of the existing sales subsystem. The workflow enforces payment-stage separation, prevents VAT double-counting, gates balance billing on goods receipt, and auto-completes the order with stock deduction once full payment is confirmed.

---

## 2. Document Chain

```
QT (Confirmed)
  └─► SO (Confirmed)
        └─► [PR → PO → GR]         ← existing operations chain (stock IN)
        └─► Deposit Invoice (DI)    ← NEW: ใบแจ้งหนี้งวดมัดจำ
              └─► DP (deposit_receipt)
                    └─► Balance Invoice (invoice)
                          └─► RE (receipt)
                                └─► QT = Completed + Stock OUT
```

**Rules:**
- SO must exist and be `CONFIRMED` before Deposit Invoice can be created.
- Balance Invoice is hard-gated: a completed GR linked to the same SO must exist.
- RE confirmation triggers the completion check and stock deduction.

---

## 3. Database Changes

### 3.1 New enum value
```prisma
enum DocumentType {
  // existing values ...
  DEPOSIT_INVOICE   // ← add
}
```

### 3.2 New extension table
```prisma
model DepositInvoiceDocument {
  documentId         String   @id @map("DocumentID") @db.Char(26)
  linkedQuotationId  String?  @map("LinkedQuotationID") @db.Char(26)
  linkedSOId         String?  @map("LinkedSOID") @db.VarChar(26)
  depositPercentage  Decimal  @map("DepositPercentage") @db.Decimal(5, 2)
  depositAmount      Decimal  @map("DepositAmount") @db.Decimal(19, 4)
  balanceAmount      Decimal  @map("BalanceAmount") @db.Decimal(19, 4)
  document           Document @relation(fields: [documentId], references: [id])
}
```

### 3.3 Column additions to existing extension tables

**`DepositReceiptDocument`** — add:
- `linkedSOId` VARCHAR(26) nullable (carried over from the Deposit Invoice that triggered it)

**`InvoiceDocument`** — add:
- `linkedDepositReceiptId` VARCHAR(26) nullable
- `linkedSOId` VARCHAR(26) nullable

**`ReceiptDocument`** — add:
- `linkedDepositReceiptId` VARCHAR(26) nullable
- `depositAmountDeducted` DECIMAL(19,4) nullable

### 3.4 QT status
Add `'Completed'` as a valid status value. No schema migration needed — the `status` column is a free VARCHAR(30); only backend validation changes.

---

## 4. Backend Logic

### 4.1 New API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/documents/deposit_invoice` | List with search/filter |
| POST | `/api/documents/deposit_invoice` | Create |
| GET | `/api/documents/deposit_invoice/:id` | Fetch single |
| PUT | `/api/documents/deposit_invoice/:id` | Update (Draft only) |
| DELETE | `/api/documents/deposit_invoice/:id` | Delete (Draft only) |

All routes go through the existing `DocumentController` / `documentRoutes` pattern.

### 4.2 Creation validation gates

**Deposit Invoice:**
1. `linkedSOId` must exist and `SaleOrder.status = CONFIRMED`
2. `linkedQuotationId` must exist and `Document.status = Confirmed`
3. `depositPercentage` must be between 1 and 99

**DP (Deposit Receipt):**
- Accepts optional `linkedDepositInvoiceId` for traceability (not enforced, backward compatible)

**Balance Invoice:**
1. A `DepositReceiptDocument` must exist with `linkedSOId` matching the request's `linkedSOId`
2. GR gate — `GoodsReceipt` has no direct `soId`; the check is a 3-hop join:
   - Find `SOItem` rows where `soId = linkedSOId` and `convertedToPr = true` → collect `prNumber` values
   - Find `PRItem` rows where `prNumber IN (above)` and `convertedToPo = true` → collect `poNumber` values
   - Find any `GoodsReceipt` where `poNumber IN (above)` and `status = 'CONFIRMED'`
   - If none found → return HTTP 422 "ยังไม่มีการรับสินค้า (GR) สำหรับ SO นี้"
3. Returns HTTP 422 with a descriptive message if either gate fails

**RE (Final Receipt) — on confirm:**
1. Save RE normally
2. Run completion check:
   - `paidTotal = SUM(paymentAmount from all DPs where linkedSOId = SO.id) + RE.totalAmount`
     (requires `linkedSOId` on `DepositReceiptDocument` — see Section 3.3)
   - If `paidTotal >= QT.totalAmount`:
     - Set QT `status = Completed`
     - Set SO `status = COMPLETED`
     - Write one `StockTransaction` `OUT` per RE line item (productCode, quantity, linkedDocumentNumber = RE.documentNumber)

### 4.3 VAT calculation rules

All three billing documents compute their own VAT on their own base only:

| Document | VAT base |
|----------|----------|
| Deposit Invoice | `depositAmount` |
| DP | `depositAmount` (mirrors Deposit Invoice) |
| Balance Invoice | `QT.totalAmount − depositAmount` |
| RE | balance portion only; `depositAmountDeducted` stored separately |

The backend enforces this in the save handler — the frontend sends the computed values, the backend validates the math before persisting.

---

## 5. Frontend

### 5.1 Tab order in SalesDocuments

```
ใบเสนอราคา | ใบสั่งขาย | ใบแจ้งหนี้มัดจำ | ใบรับมัดจำ | ใบแจ้งหนี้ | ใบเสร็จรับเงิน
    QT            SO         deposit_invoice      DP         invoice        receipt
```

Accent color for `deposit_invoice`: **teal**.

### 5.2 documentTypeConfigs entry

```ts
deposit_invoice: {
  icon: '📋',
  label: 'Deposit Invoice',
  labelTh: 'ใบแจ้งหนี้มัดจำ',
  accent: 'teal',
  createLabel: 'สร้างใบแจ้งหนี้มัดจำ',
}
```

Add `teal` accent to `accentClasses`.

### 5.3 Deposit Invoice form

- **QT picker**: dropdown of QTs with status `Confirmed` that have at least one linked `CONFIRMED` SO
- **SO field**: auto-filled after QT selected, read-only
- **`depositPercentage`** input: number, 1–99, default 30
- **Computed display** (auto-updated as percentage changes):
  - Deposit Amount = `QT.totalAmount × depositPercentage / 100`
  - Balance Amount = `QT.totalAmount − depositAmount`
  - VAT on deposit = `depositAmount × taxRate`
  - Total this invoice = `depositAmount + vatOnDeposit`
- **Line items**: copied from QT, display-only (quantities at 100%)

### 5.4 Builder functions in documentShared.ts

| Function | Replaces / New |
|----------|----------------|
| `buildDepositInvoiceDraftFromQuotation(qt, so)` | New |
| `buildDPFromDepositInvoice(di)` | Replaces `buildDepositReceiptDraftFromQuotation` |
| `buildBalanceInvoiceFromDP(dp, soId)` | New — carries `linkedDepositReceiptId` |
| `buildReceiptDraftFromBalanceInvoice(inv, dp)` | Extends existing `buildReceiptDraftFromInvoice` with DP fields |

The existing `buildDepositReceiptDraftFromQuotation` is kept for backward compatibility but no longer exposed in the QT quick-actions.

### 5.5 QT list action button changes

| Before | After |
|--------|-------|
| 🏦 มัดจำ (opens DP directly) | 📋 แจ้งหนี้มัดจำ (opens Deposit Invoice) |
| 🧾 Invoice | 🧾 Invoice — renamed to "Balance Invoice", locked with tooltip if GR gate fails |

DP is now created from the Deposit Invoice view, not directly from QT.

### 5.6 DepositDeductionSummary component

New component rendered in the RE form footer when `linkedDepositReceiptId` is present:

```
รวมมูลค่าสินค้าทั้งสิ้น (Total 100%)           {qtTotal}
หัก เงินมัดจำตามใบ {dpNumber} ({pct}%)         -{depositAmount}
ยอดสุทธิที่รับชำระครั้งนี้                        {balanceNet}
──────────────────────────────────────────────
ฐานภาษีงวดนี้ (ก่อน VAT 7%)                   {balanceBase}
ภาษีมูลค่าเพิ่มงวดนี้ (VAT 7%)                  {vatAmount}
```

Props: `qtTotal`, `dpNumber`, `depositPercentage`, `depositAmount`, `balanceNet`, `balanceBase`, `vatAmount`. Pure display component, no state.

---

## 6. Error Handling

| Scenario | Behavior |
|----------|----------|
| Create Deposit Invoice, SO not confirmed | HTTP 422 "SO ยังไม่ยืนยัน" |
| Create Balance Invoice, no GR | HTTP 422 "ยังไม่มีการรับสินค้า (GR) สำหรับ SO นี้" |
| Create Balance Invoice, no DP | HTTP 422 "ยังไม่มีใบรับมัดจำสำหรับ SO นี้" |
| RE confirm, completion check fails (underpaid) | Save succeeds; no status change; no stock deduction |
| Stock deduction fails (product not found) | Log error, roll back RE confirmation, return HTTP 500 |
| Delete locked document (non-Draft) | HTTP 409 "ไม่สามารถลบเอกสารที่ยืนยันแล้ว" |

---

## 7. Testing Considerations

- Unit test: VAT computation for deposit-only and balance-only scenarios
- Integration test: full chain creation QT → SO → DI → DP → Invoice → RE, verify QT = Completed and StockTransaction OUT rows exist
- Gate test: attempt Balance Invoice creation without GR, expect 422
- Backward compat test: existing `deposit_receipt` documents created directly from QT still load and display correctly
