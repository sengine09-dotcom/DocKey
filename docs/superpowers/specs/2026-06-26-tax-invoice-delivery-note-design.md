# Design: ใบส่งสินค้า / ใบแจ้งหนี้ / ใบกำกับภาษี (Tax Invoice & Delivery Note)

**Date:** 2026-06-26
**Scope:** ขยาย INVOICE DocumentType ให้รองรับการออกใบกำกับภาษีพร้อมใบส่งสินค้า 3-in-1 จาก SO

---

## Background

ระบบปัจจุบันมี `INVOICE` DocumentType อยู่แล้ว พร้อม `InvoiceDocument` extension table
แต่ขาด:
- Snapshot ข้อมูลลูกค้าสำหรับภาษี (Tax ID, Branch)
- Payment status แยกต่างหากจาก workflow status
- การสร้าง Invoice โดย pre-fill จาก SO โดยตรง
- ระบบพิมพ์ 3 ชุดตามมาตรฐานไทย

---

## Decisions

| คำถาม | คำตอบ |
|--------|--------|
| ใช้ DocumentType ใหม่หรือเดิม? | ใช้ `INVOICE` เดิม |
| Invoice มาจากไหน? | จาก SO เสมอ |
| Invoice คืออะไร? | คือใบส่งสินค้าด้วย (สร้าง = ส่งของแล้ว) |
| Tax ID / Branch มาจากไหน? | Customer master (snapshot ณ วันออกบิล) |
| Credit Term มาจากไหน? | PaymentTerm master (ดึง `days` → คำนวณ Due Date) |
| Payment Status | 3 สถานะ: PENDING / OVERDUE / PAID ไม่ต้องสร้าง Receipt ใหม่ |

---

## Section 1 — Database Schema

### การเปลี่ยนแปลง: เพิ่ม 3 columns ใน `InvoiceDocument`

```prisma
model InvoiceDocument {
  // ...fields เดิมทั้งหมด...

  customerTaxId   String?  @map("CustomerTaxId")   @db.VarChar(20)
  customerBranch  String?  @map("CustomerBranch")  @db.VarChar(100)
  paymentStatus   String   @default("PENDING")     @map("PaymentStatus") @db.VarChar(20)
}
```

**ค่า paymentStatus:** `PENDING` | `OVERDUE` | `PAID`

**เหตุผล snapshot Tax ID/Branch:** ถ้าลูกค้าเปลี่ยนข้อมูลภายหลัง ใบกำกับภาษีเดิมต้องถูกต้องตามกฎหมาย ณ วันที่ออก

**Migration impact:** เพิ่ม 3 columns ใน `InvoiceDocument` table เท่านั้น ไม่กระทบ table อื่น

---

## Section 2 — Backend Logic

### A. สร้าง Invoice จาก SO

`POST /api/documents` (ประเภท `invoice`) รับ `linkedSOId` แล้ว:

1. ดึง SO + SOItems → pre-fill items
2. ดึง Customer จาก SO → snapshot `taxId` → `customerTaxId`, `branch` → `customerBranch`
3. ดึง PaymentTerm ผ่าน `paymentTermId` → อ่าน `days` → คำนวณ `dueDate = invoiceDate + days`
4. ตั้ง `paymentStatus = "PENDING"`, `Document.status = "Issued"`

### B. OVERDUE Detection (Runtime — ไม่ใช้ Scheduled Job)

ใน controller เมื่อ GET invoice:
```typescript
const effectivePaymentStatus =
  invoice.paymentStatus === 'PENDING' && invoice.dueDate < new Date()
    ? 'OVERDUE'
    : invoice.paymentStatus;
```
ไม่ update DB — ส่งค่า computed กลับ frontend เท่านั้น

### C. Mark Paid

`PATCH /api/documents/:id/mark-paid`
- `paymentStatus = "PAID"`
- `Document.status = "Completed"`

### D. SO Workflow Status

ขยาย `GET /api/so/:id/deposit-status` (หรือสร้าง endpoint ใหม่ถ้าจำเป็น)
ให้แสดง Invoice ที่ `linkedSOId` ตรงกับ SO นั้น พร้อม `paymentStatus`

---

## Section 3 — Frontend

### A. ปุ่ม "ออกใบกำกับภาษี" ใน SO View

ตำแหน่ง: ส่วน workflow status ของ SO (เดียวกับที่มีปุ่ม DI/DR อยู่แล้ว)

กดแล้ว → navigate ไป Invoice form พร้อม query param `?soId=<id>`
Invoice form ดึง SO data แล้ว pre-fill:
- Customer name, Tax ID, Branch, ที่อยู่ (billTo/shipTo)
- รายการสินค้าทุกบรรทัดจาก SOItems
- PaymentTerm → Due Date อัตโนมัติ

### B. Invoice Form — ฟิลด์ที่เพิ่ม/เปลี่ยน

| ฟิลด์ | Behavior |
|-------|----------|
| เลขผู้เสียภาษี | Read-only snapshot จาก Customer |
| สาขา | Read-only snapshot จาก Customer |
| วันครบกำหนด (Due Date) | คำนวณอัตโนมัติ, แก้ override ได้ |
| สถานะชำระเงิน | Badge แสดงผล + ปุ่ม "Mark Paid" |

**Payment Status Badge:**
- `PENDING` → สีเหลือง "รอชำระ"
- `OVERDUE` → สีแดง "เกินกำหนด"
- `PAID` → สีเขียว "ชำระแล้ว"

### C. ระบบพิมพ์ 3 ชุด

Component: `InvoicePrintLayout.tsx`

render 3 หน้าใน `@media print` — แต่ละหน้าใช้ข้อมูลเดียวกัน ต่างกันแค่ header text:

| หน้า | Header |
|------|--------|
| 1 | ต้นฉบับใบส่งสินค้า / ต้นฉบับใบแจ้งหนี้ / ต้นฉบับใบกำกับภาษี |
| 2 | สำเนาใบส่งสินค้า |
| 3 | สำเนาใบแจ้งหนี้ / สำเนาใบกำกับภาษี |

Print trigger: ปุ่ม "พิมพ์" ใน Invoice view → `window.print()` หรือ `react-to-print`

### D. Dashboard — OVERDUE Counter

เพิ่ม counter "Invoice เกินกำหนด" ใน Dashboard metrics
Query: Invoice ที่ `paymentStatus = PENDING` และ `dueDate < today`

---

## Files ที่คาดว่าต้องแก้ไข

### Backend
| File | Action |
|------|--------|
| `backend/prisma/schema.prisma` | เพิ่ม 3 fields ใน InvoiceDocument |
| `backend/prisma/migrations/` | สร้าง migration ใหม่ |
| `backend/src/lib/mainDocuments.ts` | เพิ่ม snapshot logic + paymentStatus computed |
| `backend/src/controllers/DocumentController.ts` | เพิ่ม mark-paid endpoint |
| `backend/src/routes/documents.ts` | เพิ่ม PATCH route mark-paid |
| `backend/src/controllers/SOController.ts` | ขยาย workflow status ให้รวม Invoice |

### Frontend
| File | Action |
|------|--------|
| `frontend/src/pages/documents/SalesDocuments.tsx` | ปรับ Invoice form เพิ่มฟิลด์ใหม่ |
| `frontend/src/components/Documents/AllDocumentForm.tsx` | เพิ่ม Tax ID, Branch, Due Date, Payment Status |
| `frontend/src/components/Documents/InvoicePrintLayout.tsx` | สร้างใหม่ — 3-page print component |
| `frontend/src/pages/Dashboard.tsx` | เพิ่ม OVERDUE Invoice counter |
| `frontend/src/pages/documents/SOTab.tsx` | เพิ่มปุ่ม "ออกใบกำกับภาษี" |

---

## Out of Scope

- การสร้าง Receipt เมื่อชำระเงิน (ใช้ระบบ Receipt เดิมแยกกัน)
- การออก Invoice โดยไม่มี SO
- Scheduled job สำหรับ OVERDUE (ใช้ runtime detection แทน)
- การออกใบลดหนี้ / ใบเพิ่มหนี้
