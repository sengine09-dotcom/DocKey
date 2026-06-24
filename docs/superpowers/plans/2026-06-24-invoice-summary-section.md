# Invoice Summary Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** แสดงส่วนสรุปยอด (Subtotal / VAT / Grand Total / หักมัดจำ / Net Payable + Thai baht text) ใต้ items table ในทุก Invoice

**Architecture:** สร้าง `InvoiceSummary` component ใหม่ที่รับ props จาก `AllDocumentForm` และแสดง breakdown ทั้งหมด รวมถึงใช้ `bahttext` npm package แปลงยอดสุทธิเป็นตัวอักษรภาษาไทย

**Tech Stack:** React (TSX), TypeScript, `bahttext` npm package, Tailwind CSS

## Global Constraints

- ไม่แก้ Receipt form หรือ Deposit Invoice form — เฉพาะ `documentType === 'invoice'`
- ไม่แสดง section นี้ใน edit/create mode — เฉพาะ display-only view ที่มีอยู่แล้ว
- ไม่แก้ print layout
- `depositAmount` row แสดงเฉพาะเมื่อ `depositAmount > 0`
- ตัวเลขทั้งหมด: ทศนิยม 2 ตำแหน่ง, comma คั่นหลักพัน (locale `th-TH`)
- Thai words: `bahttext(netPayable)` — ห่อในวงเล็บ เช่น `(เจ็ดพันเจ็ดร้อยบาทถ้วน)`
- TypeScript: ไม่มี error ใหม่จาก `cd frontend && npx tsc --noEmit`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/package.json` + `frontend/package-lock.json` | Modify | เพิ่ม `bahttext` dependency |
| `frontend/src/types/bahttext.d.ts` | Create | TypeScript module declaration สำหรับ `bahttext` |
| `frontend/src/components/Documents/InvoiceSummary.tsx` | Create | Summary component |
| `frontend/src/components/Documents/AllDocumentForm.tsx` | Modify | แทน footer "ยอดรวม" บรรทัด 2219-2225 ด้วย `<InvoiceSummary>` |

---

## Task 1: ติดตั้ง `bahttext` + TypeScript declaration

**Files:**
- Modify: `frontend/package.json`, `frontend/package-lock.json`
- Create: `frontend/src/types/bahttext.d.ts`

**Interfaces:**
- Produces: `import bahttext from 'bahttext'` ใช้ได้จาก TSX โดยไม่มี type error

- [ ] **Step 1: ติดตั้ง package**

```bash
cd /home/po/DocKey/frontend && npm install bahttext
```

Expected: `package.json` มี `"bahttext": "..."` ใน dependencies

- [ ] **Step 2: สร้าง TypeScript declaration**

สร้างไฟล์ `frontend/src/types/bahttext.d.ts`:

```typescript
declare module 'bahttext' {
  function bahttext(amount: number): string;
  export default bahttext;
}
```

- [ ] **Step 3: ตรวจสอบ TypeScript ไม่มี error**

```bash
cd /home/po/DocKey/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: ไม่มี error ใหม่ (อาจมี warning เก่าที่ไม่ใช่ error)

- [ ] **Step 4: ทดสอบ import ใช้งานได้**

สร้างไฟล์ทดสอบชั่วคราวใน scratchpad เพื่อยืนยัน:

```bash
node -e "const bahttext = require('/home/po/DocKey/frontend/node_modules/bahttext'); console.log(bahttext(7700));"
```

Expected output: `เจ็ดพันเจ็ดร้อยบาทถ้วน` (หรือรูปแบบใกล้เคียง)

- [ ] **Step 5: Commit**

```bash
cd /home/po/DocKey && git add frontend/package.json frontend/package-lock.json frontend/src/types/bahttext.d.ts
git commit -m "$(cat <<'EOF'
chore: install bahttext + add TypeScript declaration

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: สร้าง `InvoiceSummary` component

**Files:**
- Create: `frontend/src/components/Documents/InvoiceSummary.tsx`

**Interfaces:**
- Consumes: `import bahttext from 'bahttext'` (จาก Task 1)
- Produces:
  ```typescript
  export default function InvoiceSummary(props: InvoiceSummaryProps): JSX.Element
  
  interface InvoiceSummaryProps {
    subtotal: number;
    vat: number;
    grandTotal: number;
    taxRate: number;
    depositAmount?: number;        // ถ้า undefined หรือ 0 = ไม่แสดงแถว deposit
    depositReceiptNumber?: string; // ถ้า non-empty = แสดงหมายเหตุใต้ตาราง
    darkMode?: boolean;
  }
  ```

- [ ] **Step 1: สร้าง `InvoiceSummary.tsx`**

สร้างไฟล์ `frontend/src/components/Documents/InvoiceSummary.tsx`:

```tsx
import bahttext from 'bahttext';

interface InvoiceSummaryProps {
  subtotal: number;
  vat: number;
  grandTotal: number;
  taxRate: number;
  depositAmount?: number;
  depositReceiptNumber?: string;
  darkMode?: boolean;
}

const fmt = (n: number): string =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InvoiceSummary({
  subtotal,
  vat,
  grandTotal,
  taxRate,
  depositAmount,
  depositReceiptNumber,
  darkMode = false,
}: InvoiceSummaryProps) {
  const hasDeposit = (depositAmount ?? 0) > 0;
  const netPayable = grandTotal - (depositAmount ?? 0);

  const border = darkMode ? 'border-gray-700' : 'border-gray-200';
  const bg = darkMode ? 'bg-gray-800/60' : 'bg-gray-50';
  const text = darkMode ? 'text-white' : 'text-gray-900';
  const muted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const divider = darkMode ? 'border-gray-600' : 'border-gray-300';

  return (
    <div className={`rounded-b-xl border-t ${border} ${bg} px-4 py-4`}>
      <div className="ml-auto max-w-xs space-y-1.5 text-sm">
        {/* Subtotal */}
        <div className={`flex justify-between ${muted}`}>
          <span>รวมเป็นเงิน</span>
          <span>{fmt(subtotal)}</span>
        </div>

        {/* VAT */}
        <div className={`flex justify-between ${muted}`}>
          <span>ภาษีมูลค่าเพิ่ม {taxRate}%</span>
          <span>{fmt(vat)}</span>
        </div>

        {/* Grand Total */}
        <div className={`flex justify-between border-t pt-1.5 font-semibold ${divider} ${text}`}>
          <span>จำนวนเงินรวมทั้งสิ้น</span>
          <span>{fmt(grandTotal)}</span>
        </div>

        {/* Deposit deduction (conditional) */}
        {hasDeposit && (
          <div className={`flex justify-between ${muted}`}>
            <span>หัก เงินมัดจำ</span>
            <span className="text-red-500">({fmt(depositAmount!)})</span>
          </div>
        )}

        {/* Net Payable */}
        <div className={`flex justify-between border-t pt-1.5 font-bold ${divider} ${text}`}>
          <span>จำนวนเงินที่ต้องชำระทั้งสิ้น</span>
          <span>฿{fmt(netPayable)}</span>
        </div>

        {/* Thai baht text */}
        <div className={`pt-0.5 text-xs italic ${muted}`}>
          ({bahttext(Math.round(netPayable * 100) / 100)})
        </div>
      </div>

      {/* Deposit receipt reference note */}
      {depositReceiptNumber && (
        <p className={`mt-3 border-t pt-3 text-xs ${divider} ${muted}`}>
          หมายเหตุ: อ้างอิงใบรับมัดจำ {depositReceiptNumber}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: ตรวจสอบ TypeScript ไม่มี error**

```bash
cd /home/po/DocKey/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: ไม่มี error ใหม่

- [ ] **Step 3: Commit**

```bash
cd /home/po/DocKey && git add frontend/src/components/Documents/InvoiceSummary.tsx
git commit -m "$(cat <<'EOF'
feat: add InvoiceSummary component with deposit deduction and Thai baht text

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: แทน footer "ยอดรวม" ใน `AllDocumentForm.tsx` ด้วย `<InvoiceSummary>`

**Files:**
- Modify: `frontend/src/components/Documents/AllDocumentForm.tsx`

**Interfaces:**
- Consumes (Task 2): `InvoiceSummary` component — import default export
- Consumes (existing, บรรทัด 540-545):
  ```typescript
  const taxRate = Number(header.taxRate || 0);
  const totalSellingPrice = items.reduce(...);   // subtotal (before VAT)
  const tax = totalSellingPrice * (taxRate / 100);
  const total = totalSellingPrice + tax;
  ```
- Consumes (existing header state, บรรทัด 216-217):
  ```typescript
  header.depositAmountDeducted: string   // "0" when none
  header.linkedDepositReceiptNumber: string  // "" when none
  ```

- [ ] **Step 1: เพิ่ม import `InvoiceSummary`**

เปิดไฟล์ `frontend/src/components/Documents/AllDocumentForm.tsx`

หาบรรทัด 10:
```typescript
import DepositDeductionSummary from './DepositDeductionSummary';
```

เพิ่ม import ต่อท้ายบรรทัดนั้น:
```typescript
import DepositDeductionSummary from './DepositDeductionSummary';
import InvoiceSummary from './InvoiceSummary';
```

- [ ] **Step 2: แทนที่ footer "ยอดรวม" ด้วย `<InvoiceSummary>`**

หา block บรรทัด 2219-2225 (ใน `documentType === 'invoice'` section):
```tsx
                  <div className={`flex items-center justify-end gap-4 border-t px-4 py-3
                    ${darkMode ? 'border-gray-700 bg-gray-800 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                    <span className="text-xs font-semibold uppercase tracking-wide">ยอดรวม</span>
                    <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      ฿{formatDisplayAmount(totalSellingPrice + tax)}
                    </span>
                  </div>
```

แทนด้วย:
```tsx
                  <InvoiceSummary
                    subtotal={totalSellingPrice}
                    vat={tax}
                    grandTotal={totalSellingPrice + tax}
                    taxRate={taxRate}
                    depositAmount={parseFloat(header.depositAmountDeducted) > 0
                      ? parseFloat(header.depositAmountDeducted) : undefined}
                    depositReceiptNumber={header.linkedDepositReceiptNumber || undefined}
                    darkMode={darkMode}
                  />
```

- [ ] **Step 3: ตรวจสอบ TypeScript ไม่มี error**

```bash
cd /home/po/DocKey/frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: ไม่มี error ใหม่

- [ ] **Step 4: Commit**

```bash
cd /home/po/DocKey && git add frontend/src/components/Documents/AllDocumentForm.tsx
git commit -m "$(cat <<'EOF'
feat: wire InvoiceSummary into invoice display — replaces simple total footer

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Manual Verification (หลังทำครบทุก task)

1. รัน frontend dev server: `cd /home/po/DocKey/frontend && npm run dev`
2. เปิดแท็บ **ใบแจ้งหนี้ (Invoice)**
3. คลิกเปิด Invoice ที่มีรายการสินค้า — ตรวจสอบใต้ items มี:
   - แถว "รวมเป็นเงิน" + จำนวน
   - แถว "ภาษีมูลค่าเพิ่ม x%" + จำนวน
   - เส้นคั่น + แถว "จำนวนเงินรวมทั้งสิ้น" font bold
   - *(ถ้า Invoice มีมัดจำ)* แถว "หัก เงินมัดจำ" สีแดง ในวงเล็บ
   - เส้นคั่น + แถว "จำนวนเงินที่ต้องชำระทั้งสิ้น" font bold
   - บรรทัดอักษรไทย เช่น "(หนึ่งหมื่นเจ็ดร้อยบาทถ้วน)"
4. Invoice ที่ไม่มีมัดจำ — ตรวจสอบว่าไม่มีแถว "หัก เงินมัดจำ"
5. Invoice ที่มี `linkedDepositReceiptNumber` — ตรวจสอบหมายเหตุ "อ้างอิงใบรับมัดจำ DR-XX-XXXXXX" ปรากฏ
6. ทดสอบ dark mode — ตรวจสอบสีถูกต้อง
