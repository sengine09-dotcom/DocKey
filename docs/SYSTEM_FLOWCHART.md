# DocKey — System Flowchart (เวอร์ชันปัจจุบัน)

> อัปเดต: 2026-06-27

---

## 1. ภาพรวมระบบ

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DocKey ERP System                            │
│                                                                     │
│  ┌─────────────┐   ┌──────────────────┐   ┌────────────────────┐   │
│  │    SALES    │   │    PURCHASE      │   │    OPERATIONS      │   │
│  │  (ฝ่ายขาย) │   │  (ฝ่ายจัดซื้อ) │   │  (ฝ่ายปฏิบัติ)   │   │
│  │             │   │                  │   │                    │   │
│  │ QT→SO→INV   │   │  PR→PO→GR        │   │  WO / DO / CR      │   │
│  │ SO→DI→DR    │   │                  │   │                    │   │
│  │ →INV→RC     │   │                  │   │                    │   │
│  └──────┬──────┘   └────────┬─────────┘   └────────┬───────────┘   │
│         │                   │                       │               │
│         └───────────────────┴───────────────────────┘               │
│                             │                                       │
│                    ┌────────▼────────┐                              │
│                    │  คลังสินค้า     │                              │
│                    │  (Stock)        │                              │
│                    │  IN / OUT / INIT│                              │
│                    └─────────────────┘                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. กระบวนการขาย (Sales Flow)

### 2A. เส้นทางลูกค้าเครดิต (Credit Term — ไม่ต้องวางมัดจำ)

```
[QT สร้างใบเสนอราคา]
        │
        ▼
[SO สร้างใบสั่งขาย]
  status: DRAFT
        │
        ▼ (ผู้ใช้กด "ยืนยัน")
  status: CONFIRMED
        │
        ▼ (กด "ออกใบแจ้งหนี้")
[INV สร้างใบแจ้งหนี้]
  status: Pending
  paymentStatus: PENDING
        │
        ▼ (กด "ออกใบเสร็จรับเงิน")
[RC สร้างใบเสร็จรับเงิน]
  status: Received
        │
        ▼ (backend trigger: RC.total >= INV.total)
  SO.status → COMPLETED ✅
```

**เงื่อนไข:** SO.paymentTerm เป็น credit (Days > 0)

---

### 2B. เส้นทางลูกค้าเงินสด (Cash Term — ต้องวางมัดจำก่อน)

```
[QT สร้างใบเสนอราคา]  ← ไม่จำเป็น สร้าง SO โดยตรงได้
        │
        ▼
[SO สร้างใบสั่งขาย]
  status: DRAFT
  paymentTerm: เงินสด (Days=0)
        │
        ▼ (ผู้ใช้กด "ยืนยัน")
  status: CONFIRMED
        │
        ▼ (กด "ออกใบแจ้งหนี้" → redirect ไป DI อัตโนมัติ)
[DI สร้างใบแจ้งหนี้มัดจำ]
  status: Draft
  depositPercentage: X%
        │
        ▼ (เปลี่ยนสถานะ Sent → Awaiting_Verify → Paid)
  DI.status → Paid (เมื่อออก DR)
        │
        ▼ (กด "ออกใบรับมัดจำ")
[DR สร้างใบรับมัดจำ]
  status: Received
  paymentAmount: ยอดมัดจำ
        │
        ▼ (กด "ออกใบแจ้งหนี้ยอดคงเหลือ")
[INV สร้างใบแจ้งหนี้ (ยอดคงเหลือ)]
  status: Pending
  depositAmountDeducted: ยอดมัดจำที่หัก
        │
        ▼ (กด "ออกใบเสร็จรับเงิน")
[RC สร้างใบเสร็จรับเงิน]
  status: Received
        │
        ▼ (backend trigger: DR.amount + RC.total >= QT.totalAmount)
  QT.status → Completed
  SO.status → COMPLETED ✅
  Stock OUT (ตัดสต็อกสินค้าตาม RC items)
```

**เงื่อนไข:** SO.paymentTerm เป็น เงินสด (Days=0)

---

### 2C. เส้นทาง Quotation → SO → DI (เมื่อมี QT)

```
[QT ใบเสนอราคา]
  status: Draft
        │
        ▼ (กด "สร้าง SO")
[SO ใบสั่งขาย]  ← link กับ QT
        │
        ▼ (กด "ออก DI")
[DI ใบแจ้งหนี้มัดจำ]
  linkedQuotationId: QT.id
  linkedSOId: SO.id
        │
        ▼ ... (ดู 2B ต่อ) ...
```

---

## 3. Status ของเอกสารขาย

### Sales Order (SO)

```
DRAFT ──► CONFIRMED ──► IN_PROGRESS ──► PARTIALLY_DELIVERED
                │                               │
                │                        DELIVERED
                │                               │
                └──► CANCELLED            COMPLETED ✅
```

| Status | ความหมาย |
|--------|----------|
| DRAFT | สร้างใหม่ ยังไม่ยืนยัน |
| CONFIRMED | ยืนยันแล้ว พร้อมออกเอกสารต่อ |
| IN_PROGRESS | กำลังดำเนินการ |
| PARTIALLY_DELIVERED | ส่งสินค้าบางส่วน |
| DELIVERED | ส่งสินค้าครบแล้ว |
| COMPLETED | ชำระเงินครบ / เสร็จสมบูรณ์ ✅ |
| CANCELLED | ยกเลิก |

### Quotation (QT)

```
Draft → Confirmed → Link Invoice → Completed
```

### Deposit Invoice (DI)

```
Draft → Sent → Awaiting_Verify → Paid
```
> Paid: trigger อัตโนมัติเมื่อออก DR

### Invoice (INV)

```
Pending → Link Receipt
```
> paymentStatus: PENDING → (mark paid manually หรือ RC trigger)

### Deposit Receipt / Receipt

```
status: Received  (ค่า default ตั้งแต่สร้าง)
```

---

## 4. Logic การ Complete SO (Backend Trigger)

เมื่อบันทึก Receipt (RC) ใหม่ backend ตรวจสอบ:

```
สร้าง RC ใหม่
    │
    ├─► หา linkedSOId
    │     ├─ จาก RC.header โดยตรง
    │     ├─ fallback: จาก DepositReceipt.linkedSOId
    │     └─ fallback: จาก InvoiceDocument.linkedSOId
    │
    ├─► หา linkedQTId
    │     ├─ จาก RC.header โดยตรง
    │     └─ fallback: จาก DepositInvoiceDocument.linkedQuotationId
    │
    ├─► ตรวจ SO.paymentTerm → isCash (Days = 0)
    │
    ├─ [isCash = true AND linkedQTId มี]
    │     → เปรียบ: DR.paymentAmount + RC.total >= QT.totalAmount
    │     → ถ้าผ่าน: QT.status = Completed
    │                SO.status = COMPLETED
    │                Stock OUT (ตาม RC items)
    │
    └─ [isCash = false OR ไม่มี QT]
          → เปรียบ: RC.total >= INV.totalAmount
          → ถ้าผ่าน: SO.status = COMPLETED
```

---

## 5. กระบวนการจัดซื้อ (Purchase Flow)

```
[PR ใบขอซื้อ]
  status: DRAFT
        │
        ▼ (ผู้มีอำนาจกด Approve)
  status: APPROVED
        │
        ▼ (สร้าง PO จาก PR หรือจาก SO)
[PO ใบสั่งซื้อ]
  status: Open
        │
        ▼ (ส่ง PO ให้ Supplier → Ordered)
  status: Approved / Ordered
        │
        ▼ (รับสินค้าบางส่วน)
  status: Partial
        │
        ▼ (รับสินค้าครบ)
  status: Received
        │
        ▼ (กด Complete)
  status: Completed ✅
        │
        ▼ (สร้าง GR)
[GR ใบรับสินค้า]
        │
        ▼ (บันทึก GR)
  Stock IN ✅ (เพิ่มสต็อกตาม GR items)
```

### PR Status

```
DRAFT → APPROVED → (ออก PO)
      ↓
   REJECTED
```

### PO Status

```
Open → Approved → Ordered → Partial → Received → Completed
                                                → Cancelled
                                                → Closed
```

---

## 6. กระบวนการปฏิบัติการ (Operations Flow)

### Work Order (WO)

```
[WO ใบสั่งงาน]
  status: Draft → Open → In Progress → On Hold → Completed → Closed
                                                            → Cancelled
```

### Delivery Order (DO) — ตัดสต็อก

```
[DO ใบส่งสินค้า]
  สร้างครั้งแรก → Stock OUT อัตโนมัติ
  status: Draft
```

### Customer Return (CR) — คืนสต็อก

```
[CR ใบคืนสินค้าจากลูกค้า]
  สร้างครั้งแรก → Stock IN อัตโนมัติ (คืนสินค้าเข้าคลัง)
  status: Draft
```

---

## 7. การเคลื่อนไหวสต็อก (Stock Movements)

| เหตุการณ์ | ทิศทาง | เอกสาร |
|----------|--------|---------|
| รับสินค้าจาก Supplier | Stock **IN** | GR (Goods Receipt) |
| ลูกค้าคืนสินค้า | Stock **IN** | CR (Customer Return) |
| ส่งสินค้าให้ลูกค้า | Stock **OUT** | DO (Delivery Order) |
| ชำระเงินสดครบ (Cash flow) | Stock **OUT** | RC (Receipt) — เมื่อ SO Complete |

> Stock INIT: บันทึกสต็อกตั้งต้นผ่านหน้า Inventory

---

## 8. ความสัมพันธ์ระหว่างเอกสาร (Document Linkage)

```
QT ─── linkedInvoiceId ──────────────────► INV
QT ◄── linkedQuotationId ─────────────── DI, DR

SO ◄── linkedSOId ─── DI, DR, INV, RC, DO

DI ─── linkedDRId ──────────────────────► DR
DR ─── linkedDIId ──────────────────────► DI (backlink)

INV ─── linkedDepositReceiptId ─────────► DR
INV ─── linkedReceiptId ────────────────► RC

RC ─── linkedDepositReceiptId ──────────► DR
RC ─── linkedSOId ──────────────────────► SO

PO ◄── poId ──────────────────────────── GR
PR ─── poNumber ─────────────────────────► PO (line level)
```

---

## 9. สรุป Document Types ทั้งหมด

| ประเภท | รหัส | Module | หมายเหตุ |
|--------|------|--------|----------|
| ใบเสนอราคา | QT | Sales | เริ่มต้น Sales cycle |
| ใบสั่งขาย | SO | Sales | หลัก — มี status machine |
| ใบแจ้งหนี้มัดจำ | DI | Sales | เฉพาะลูกค้าเงินสด |
| ใบรับมัดจำ | DR | Sales | เฉพาะลูกค้าเงินสด |
| ใบแจ้งหนี้ | INV | Sales | ทั้ง 2 เส้นทาง |
| ใบเสร็จรับเงิน | RC | Sales | trigger SO Complete |
| ใบส่งสินค้า | DO | Operations | ตัด Stock OUT |
| ใบคืนสินค้า | CR | Operations | คืน Stock IN |
| ใบสั่งงาน | WO | Operations | Work Order |
| ใบขอซื้อ | PR | Purchase | ขออนุมัติซื้อ |
| ใบสั่งซื้อ | PO | Purchase | สั่งซื้อ Supplier |
| ใบรับสินค้า | GR | Purchase | Stock IN |

---

## 10. การตรวจสอบเงื่อนไขชำระเงิน (Payment Term Gate)

```
เมื่อกดปุ่ม "ออกใบแจ้งหนี้" จาก SO:

SO.paymentTerm
    │
    ├─ มี DR แล้ว → ออก Balance INV (หักมัดจำ DR)
    │
    ├─ มี DI แล้ว → ออก INV (หักมัดจำ DI)
    │
    ├─ เงินสด (Days=0) + ไม่มี DI
    │       → ❌ Alert: "ต้องออกใบแจ้งหนี้มัดจำก่อน"
    │       → redirect ไปสร้าง DI อัตโนมัติ
    │
    └─ เครดิต (Days>0) + ไม่มี DI
            → ✅ ออก INV เต็มจำนวนโดยตรง
```

---

## 11. โครงสร้างระบบ (Architecture)

```
┌─────────────────────────────────────────────────────┐
│              Frontend (React + Vite)                 │
│                                                     │
│  SalesDocuments.tsx    PurchaseDocuments.tsx         │
│  SOTab.tsx             PRTab.tsx / GRTab.tsx         │
│  OperationsDocuments.tsx                            │
│  AllDocumentForm.tsx   (shared form for all docs)   │
│  DocumentsHub.tsx      (hub page เลือก module)      │
└──────────────────────────┬──────────────────────────┘
                           │ REST API (Axios)
┌──────────────────────────▼──────────────────────────┐
│              Backend (Node.js + Express)             │
│                                                     │
│  routes/documents.ts   routes/so.ts                 │
│  routes/purchase.ts    routes/codes.ts              │
│                                                     │
│  lib/mainDocuments.ts  ← business logic หลัก        │
│  lib/stockService.ts   ← stock movement             │
│  controllers/SOController.ts                        │
│  controllers/GRController.ts                        │
└──────────────────────────┬──────────────────────────┘
                           │ Prisma ORM
┌──────────────────────────▼──────────────────────────┐
│              Database (MySQL)                        │
│                                                     │
│  Document + subtypes (InvoiceDocument, etc.)        │
│  SaleOrder + SOItem                                 │
│  PurchaseRequisition + GoodsReceipt                 │
│  StockTransaction                                   │
└─────────────────────────────────────────────────────┘
```

---

## 12. User Roles

| Role | สิทธิ์พิเศษ |
|------|------------|
| admin | ลบเอกสารที่ไม่ใช่ Draft ได้, จัดการ Users |
| user | สร้าง/แก้ไขเอกสาร, ยืนยัน SO |

> เฉพาะ SO status DRAFT เท่านั้นที่แก้ไขได้ (user ทั่วไป)
> Admin ลบได้ทุก status
