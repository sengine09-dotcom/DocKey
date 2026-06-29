# Group A — Direct Cash Sale (จ่ายเต็ม) + Stock-Out Single Source of Truth

> วันที่: 2026-06-29
> สถานะ: อนุมัติแล้ว — พร้อมเขียน Implementation Plan

---

## 1. ขอบเขต (Scope)

spec นี้ครอบคลุม 2 เรื่องที่ผูกกัน:

1. **Direct Cash Sale ("จ่ายเต็ม")** — เพิ่มปุ่มบน SO ที่ออก INV + RC + DO ในคลิกเดียว สำหรับการขายหน้าร้านที่ไม่ต้องผ่าน DI/DR
2. **Stock-Out Single Source of Truth** — ยึด DO เป็นจุดเดียวที่ตัดสต๊อก ลบ trigger จาก RC และบังคับให้มี DO ก่อนออก RC ทุก flow

---

## 2. Flow ใหม่

### 2A. Cash SO — 2 ทางเลือก

SO ที่ `status = CONFIRMED` และ `paymentTerm = cash (Days=0)` และยังไม่มี DI จะมีปุ่ม 2 ปุ่ม:

```
SO (CONFIRMED, cash, ไม่มี DI)
        │
        ├──► [ออก DI]        → flow มัดจำเดิม (ไม่เปลี่ยน)
        │
        └──► [จ่ายเต็ม]     → POST /api/so/:id/pay-full
                                      │
                              ┌───── Prisma transaction ──────┐
                              │  1. สร้าง INV (full amount)   │
                              │  2. สร้าง RC  (full amount)   │
                              │  3. สร้าง DO  (items จาก SO)  │
                              │  4. recordStockMove OUT (DO)  │
                              │  5. SO.status → COMPLETED     │
                              └───────────────────────────────┘
                                      │
                              redirect → /documents/sales/rc/{rcId}
                              (RC view mode: ปุ่ม "พิมพ์ RC" + "พิมพ์ DO")
```

### 2B. Credit / Cash+DI flow — gate ใหม่

```
ทุก flow ที่ออก RC:
        │
        └──► ตรวจก่อน: มี DO ที่ linkedSOId = SO นี้ หรือไม่?
               ├── มี DO  → ออก RC ได้ (stock ถูกตัดตั้งแต่สร้าง DO แล้ว)
               └── ไม่มี → ❌ Error: "กรุณาออกใบส่งสินค้า (DO) ก่อน"
               * ข้ามกรณี RC ที่ไม่มี linkedSOId (RC แบบ standalone)
```

---

## 3. DO Document UI (ใหม่ทั้งหมด)

Backend schema (`DeliveryOrderDocument`) และ generic document route มีอยู่แล้ว แต่ **ยังไม่มีหน้า UI** ต้องสร้างใหม่:

### 3A. ไฟล์ใหม่: `frontend/src/pages/documents/DODocuments.tsx`

- **List view**: DO number, วันที่, linked SO number, status, ยอดรวม
- **Create form**: picker เลือก SO → auto-fill items จาก SO items → บันทึก → Stock OUT trigger ทันที
- **View mode**: รายการสินค้า + ปุ่ม "พิมพ์ DO"
- **Status options**: Draft, Delivered, Cancelled (ตาม `DELIVERY_ORDER_STATUS_OPTIONS` ที่มีใน `AllDocumentForm.tsx` แล้ว)

### 3B. Route ใหม่ใน `App.tsx`

```
/documents/operations/do  →  <DODocuments />
```

### 3C. อัปเดต `DocumentsHub.tsx` — Operations card

```
ระบบหลังบ้าน (Operations):
  🛠️  Work Order  (มีอยู่แล้ว)
  🚚  Delivery Order  (เพิ่มใหม่ → /documents/operations/do)
```

### 3D. DO สร้างได้ 2 ทาง

| ทาง | ที่มา |
|-----|-------|
| Manual | เปิดหน้า DO → สร้างใหม่ → เลือก SO |
| Auto | กด "จ่ายเต็ม" ใน SO → ระบบสร้างให้อัตโนมัติ |

---

## 4. Backend Changes

### 4A. Endpoint ใหม่: `POST /api/so/:id/pay-full`

**ไฟล์:** `backend/src/routes/so.ts` (route) + `backend/src/controllers/SOController.ts` (handler)

**Validation ก่อนทำ transaction:**
- SO ต้อง `status = CONFIRMED`
- SO ต้อง `paymentTerm = cash (Days = 0)`
- ต้องไม่มี DI ที่ `linkedSOId = SO.id` อยู่แล้ว

**Transaction (Prisma) — ลำดับสำคัญ DO ก่อน RC:**
```
1. สร้าง Document (INV)
   - type: invoice
   - items: copy จาก SOItems
   - linkedSOId: SO.id
   - total: SO total (คำนวณจาก items)

2. สร้าง Document (DO)
   - type: delivery_order
   - items: copy จาก SOItems
   - DeliveryOrderDocument.linkedSOId: SO.id  ← field ใหม่ (ดู 4C)
   - remark: "auto:pay-full"  ← สำหรับ audit trail

3. recordStockMove(tx, { type: OUT, docType: DELIVERY_ORDER, ... })
   ← ใช้ logic เดิมใน stockService.ts

4. สร้าง Document (RC)
   - type: receipt
   - items: copy จาก SOItems
   - linkedSOId: SO.id
   - linkedInvoiceId: INV.id
   - linkedDOId: DO.id  ← field ใหม่ (ดู 4C)
   - status: Received
   (pay-full สร้าง RC โดยตรงผ่าน Prisma ไม่ผ่าน saveDocument()
    จึงไม่ถูก DO gate บล็อก — gate มีผลเฉพาะ manual RC เท่านั้น)

5. SO.status → COMPLETED
6. INV paymentStatus → PAID
```

**Response:**
```json
{ "success": true, "data": { "rcId": "...", "doId": "...", "invId": "..." } }
```

### 4B. Stock-Out Fix ใน `mainDocuments.ts`

| การเปลี่ยนแปลง | ตำแหน่ง | รายละเอียด |
|----------------|---------|------------|
| **ลบ** stock-out trigger จาก RC | ~line 1138 (cash-term path) | `recordStockMove` ที่ทำงานตอน SO complete via RC → ลบออก |
| **เพิ่ม** DO gate ก่อน save RC | ต้น logic ของ receipt type | ถ้า `linkedSOId` มีค่า → query `DeliveryOrderDocument` ว่ามี DO ที่ link SO นี้ไหม → ถ้าไม่มี throw Error |

**Edge cases:**
- RC ที่ไม่มี `linkedSOId` → ข้าม gate ไม่บังคับ DO
- RC ที่สร้างผ่าน pay-full endpoint → สร้างโดยตรงผ่าน Prisma ไม่ผ่าน `saveDocument()` จึงไม่ถูก gate บล็อก
- DO ที่ถูกสร้างผ่าน pay-full จะมี `remark: "auto:pay-full"` เพื่อแยกออกจาก DO ที่ user สร้างเอง

---

## 5. Frontend Changes

### 5A. SO View Mode (`SOTab.tsx` หรือ `AllDocumentForm.tsx`)

เพิ่มปุ่ม "จ่ายเต็ม" เมื่อเงื่อนไขครบ:

```
SO.status === 'CONFIRMED'
&& SO.paymentTerm.days === 0  (cash)
&& ไม่มี DI ที่ linkedSOId = SO.id
```

**UX flow:**
1. กด "จ่ายเต็ม" → confirm dialog: *"ยืนยันรับชำระเงินเต็มจำนวน {total} บาท?"*
2. กด ยืนยัน → loading state (ป้องกัน double-click)
3. call `POST /api/so/:id/pay-full`
4. สำเร็จ → `navigate('/documents/sales/rc/{rcId}')`
5. ล้มเหลว → แสดง error message

### 5B. RC View Mode (`AllDocumentForm.tsx`)

เพิ่มปุ่มในหน้า view RC ที่มี `linkedDOId`:

```
[พิมพ์ใบเสร็จ (RC)]   [พิมพ์ใบส่งสินค้า (DO)]
```

- **พิมพ์ RC** → เปิด print layout เดิม
- **พิมพ์ DO** → เปิด DO view แล้ว trigger print (หรือเปิด tab ใหม่)

---

## 4C. Schema Migration (Prisma)

ต้องเพิ่ม 2 fields ใหม่:

```prisma
model DeliveryOrderDocument {
  id              String   @id @map("ID") @db.Char(26)
  documentNumber  String   @map("DocumentNumber") @db.Char(26)
  quotationId     String?  @map("QuotationId") @db.VarChar(26)
  quotationNumber String?  @map("QuotationNumber") @db.VarChar(50)
  linkedSOId      String?  @map("LinkedSOId") @db.VarChar(191)  // ← เพิ่มใหม่
  document        Document @relation(...)
}

model ReceiptDocument {
  // ... fields เดิม ...
  linkedDOId      String?  @map("LinkedDOId") @db.VarChar(26)   // ← เพิ่มใหม่ (สำหรับ pay-full)
}
```

**Migration strategy:** nullable fields ทั้งคู่ → backward-compatible, ไม่กระทบ records เดิม

---

## 6. Data Linkage ของ Documents ที่สร้างจาก pay-full

```
SO
├── INV.linkedSOId = SO.id
├── RC.linkedSOId  = SO.id
│   RC.linkedInvoiceId = INV.id
│   RC.linkedDOId = DO.id  ← ใหม่
└── DO.linkedSOId  = SO.id  (ผ่าน DeliveryOrderDocument)
```

---

## 7. สิ่งที่ไม่เปลี่ยน

- Flow มัดจำ (DI → DR → INV → RC) — ไม่แตะ
- DO ที่ user สร้างเองผ่านหน้า Operations — ยังตัดสต๊อกเหมือนเดิม
- CR (Customer Return) — stock IN เหมือนเดิม
- GR (Goods Receipt) — stock IN เหมือนเดิม

---

## 8. ไฟล์ที่ต้องแก้ไข / สร้างใหม่

| ไฟล์ | เปลี่ยนแปลง |
|------|-------------|
| `backend/prisma/schema.prisma` | เพิ่ม `linkedSOId` ใน `DeliveryOrderDocument`, `linkedDOId` ใน `ReceiptDocument` |
| `backend/src/routes/so.ts` | เพิ่ม route POST `/so/:id/pay-full` |
| `backend/src/controllers/SOController.ts` | เพิ่ม `payFull` handler (transaction: INV→DO→recordStock→RC→COMPLETE) |
| `backend/src/lib/mainDocuments.ts` | ลบ RC stock-out (~line 1138), เพิ่ม DO gate ใน receipt save path |
| `frontend/src/pages/documents/DODocuments.tsx` | **สร้างใหม่** (list + create + view) |
| `frontend/src/App.tsx` | เพิ่ม route `/documents/operations/do` |
| `frontend/src/pages/documents/DocumentsHub.tsx` | เพิ่ม DO ใน Operations card |
| `frontend/src/pages/documents/documentShared.ts` | ตรวจ/เพิ่ม DO config (มีบางส่วนแล้ว) |
| `frontend/src/components/Documents/AllDocumentForm.tsx` | เพิ่มปุ่ม "จ่ายเต็ม" ใน SO view, ปุ่ม "พิมพ์ DO" ใน RC view |
| `frontend/src/services/soService.ts` | เพิ่ม `payFull(soId)` API call |
