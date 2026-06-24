# Design: Invoice Summary Section (ส่วนสรุปยอดใบแจ้งหนี้)

**Date:** 2026-06-24
**Scope:** Invoice form — display summary below item list

---

## Background

ปัจจุบัน invoice form แสดงแค่บรรทัด "ยอดรวม" เดียวใต้ items table ไม่มี breakdown ที่ชัดเจน ทำให้ผู้ใช้ไม่เห็น VAT, ยอดหักมัดจำ และยอดสุทธิที่ต้องชำระ

---

## Requirements

1. แสดงส่วนสรุปใต้ items ในทุก Invoice (`documentType === 'invoice'`)
2. แถว "หัก เงินมัดจำ" แสดงเฉพาะเมื่อ `depositAmount > 0` (มี `linkedDepositReceiptId`)
3. แสดงยอดสุทธิเป็นตัวอักษรภาษาไทยบรรทัดสุดท้าย
4. ถ้ามี `depositReceiptNumber` ให้แสดงในหมายเหตุใต้ตาราง
5. ตัวเลขทั้งหมดมีทศนิยม 2 ตำแหน่ง และ comma คั่นหลักพัน
6. ใช้ `bahttext` npm package สำหรับ Thai text

---

## Calculation Rules

| แถว | ค่า |
|-----|-----|
| รวมเป็นเงิน (Subtotal) | `totalSellingPrice` (sum of item line totals before VAT) |
| ภาษีมูลค่าเพิ่ม x% | `tax` (computed VAT from taxRate) |
| จำนวนเงินรวมทั้งสิ้น (Grand Total) | `totalSellingPrice + tax` |
| หัก เงินมัดจำ *(ถ้ามี)* | `depositAmount` — แสดงในวงเล็บ `(3,000.00)` สีแดง |
| จำนวนเงินที่ต้องชำระทั้งสิ้น (Net Payable) | `grandTotal - depositAmount` |
| *(Thai baht text)* | `bahttext(netPayable)` |

---

## Output Format

```
┌─────────────────────────────────────────────┐
│  รวมเป็นเงิน (Subtotal)          10,000.00  │
│  ภาษีมูลค่าเพิ่ม 7%                 700.00  │
│  ─────────────────────────────────────────  │
│  จำนวนเงินรวมทั้งสิ้น             10,700.00  │
│  หัก เงินมัดจำ                  (3,000.00)  │
│  ─────────────────────────────────────────  │
│  จำนวนเงินที่ต้องชำระทั้งสิ้น     7,700.00  │
│  (เจ็ดพันเจ็ดร้อยบาทถ้วน)                  │
└─────────────────────────────────────────────┘
หมายเหตุ: อ้างอิงใบรับมัดจำ DR-26-000001
```

---

## Files Changed

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/package.json` | Modify | Add `bahttext` dependency |
| `frontend/src/components/Documents/InvoiceSummary.tsx` | Create | Summary component |
| `frontend/src/components/Documents/AllDocumentForm.tsx` | Modify | Replace simple footer with `<InvoiceSummary>` |

---

## Component Interface

### `InvoiceSummary.tsx`

```typescript
interface InvoiceSummaryProps {
  subtotal: number;        // totalSellingPrice
  vat: number;             // tax
  grandTotal: number;      // subtotal + vat
  taxRate: number;         // e.g. 7
  depositAmount?: number;  // parseFloat(header.depositAmountDeducted) — optional
  depositReceiptNumber?: string; // header.linkedDepositReceiptNumber — optional
  darkMode?: boolean;
}
```

- `depositAmount` passed only when `> 0`
- `depositReceiptNumber` passed only when non-empty

### Usage in `AllDocumentForm.tsx`

Replace บรรทัด ~2219-2225 (simple "ยอดรวม" footer in invoice section):
```tsx
<InvoiceSummary
  subtotal={totalSellingPrice}
  vat={tax}
  grandTotal={totalSellingPrice + tax}
  taxRate={Number(header.taxRate) || 7}
  depositAmount={parseFloat(header.depositAmountDeducted) > 0
    ? parseFloat(header.depositAmountDeducted) : undefined}
  depositReceiptNumber={header.linkedDepositReceiptNumber || undefined}
  darkMode={darkMode}
/>
```

---

## Non-Goals

- ไม่แก้ Receipt form (มี `DepositDeductionSummary` อยู่แล้ว)
- ไม่แก้ Deposit Invoice form
- ไม่แสดงใน edit/create mode ของ invoice (เฉพาะ display-only view ที่มีอยู่แล้ว)
- ไม่แก้ print layout (เฉพาะ in-app display)

---

## Edge Cases

- **ไม่มีมัดจำ:** ไม่แสดงแถว "หัก เงินมัดจำ", Net Payable = Grand Total
- **taxRate = 0:** แถว VAT แสดง `0.00` ยังคงแสดง
- **depositAmount > grandTotal:** Net Payable แสดงติดลบ (แสดงตามจริง ไม่ clamp)
- **bahttext(0):** แสดง "ศูนย์บาทถ้วน"
