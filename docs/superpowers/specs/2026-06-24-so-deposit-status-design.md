# Design: SO Workflow Status Section (สถานะการดำเนินการใน Sale Order)

**Date:** 2026-06-24
**Scope:** SO view mode — complete workflow status section in header

---

## Background

ปัจจุบัน SO view mode แสดงแค่ข้อมูล SO และ action buttons ไม่มีข้อมูล workflow ว่า DI / DR / Invoice / Receipt สร้างแล้วหรือยัง ผู้ใช้ต้องสลับแท็บเพื่อดูสถานะแต่ละขั้นตอน

---

## Requirements

1. แสดง section "สถานะการดำเนินการ" ใน SO view mode เท่านั้น (ไม่แสดงใน list หรือ create/edit mode)
2. Section แสดงเฉพาะเมื่อมีเอกสารอย่างน้อย 1 ใบที่ linked กับ SO — ถ้าไม่มีเลยไม่แสดง section
3. แสดงครบ 4 ประเภทเอกสาร: DI → DR → Invoice → Receipt ตามลำดับ workflow
4. เอกสารที่ยังไม่สร้าง: ไม่แสดงแถวนั้น (ไม่แสดง placeholder "รอ...")
5. ยกเว้น: ถ้ามี DI แต่ไม่มี DR → แสดงแถว "รอรับมัดจำ" เพื่อบอก next step
6. ดึงข้อมูลเมื่อ enter view mode เท่านั้น (ไม่ fetch ตอน list)
7. แถว DI มีปุ่ม "เปิด →" เมื่อ DI มีอยู่ — กดแล้วสลับไปแท็บ deposit_invoice และเปิด DI นั้น
8. แถว Invoice มีปุ่ม "เปิด →" เมื่อ Invoice มีอยู่ — กดแล้วสลับไปแท็บ invoice และเปิด Invoice นั้น
9. DR และ Receipt ไม่มีปุ่มนำทางจาก SO (เข้าถึงจาก DI และ Invoice ตามลำดับ)

---

## Workflow Display

```
สถานะการดำเนินการ
├─ ใบแจ้งหนี้มัดจำ   DI-26-000001  [Paid]      30% / ฿7,380
├─ ใบรับมัดจำ        DR-26-000001  [Received]  ฿7,380   24/06/2569
├─ ใบแจ้งหนี้        INV-26-000001 [Sent]      ฿24,620
└─ ใบเสร็จรับเงิน    RE-26-000001  [Received]  ฿24,620  24/06/2569
```

**SO จบ workflow:** เมื่อ RE ปรากฏและ status = Received

---

## Architecture

### Backend — `SOController.ts`

เพิ่ม route ใหม่:
```
GET /api/so/:id/deposit-status
```

Handler ทำ 4 parallel queries:
```typescript
const [diDoc, drDoc, invDoc, reDoc] = await Promise.all([
  prisma.document.findFirst({
    where: { depositInvoiceDocument: { linkedSOId: soId }, companyId },
    select: {
      documentNumber: true, status: true,
      depositInvoiceDocument: { select: { depositPercentage: true, depositAmount: true } },
    },
  }),
  prisma.document.findFirst({
    where: { depositReceiptDocument: { linkedSOId: soId }, companyId },
    select: {
      documentNumber: true, status: true,
      depositReceiptDocument: { select: { paymentAmount: true, receivedDate: true } },
    },
  }),
  prisma.document.findFirst({
    where: { invoiceDocument: { linkedSOId: soId }, companyId },
    select: { documentNumber: true, status: true, total: true },
  }),
  prisma.document.findFirst({
    where: { receiptDocument: { linkedSOId: soId }, companyId },
    select: {
      documentNumber: true, status: true, total: true,
      receiptDocument: { select: { receivedDate: true } },
    },
  }),
]);
```

Response shape:
```json
{
  "di": {
    "documentNumber": "DI-26-000001",
    "status": "Paid",
    "depositPercentage": 30,
    "depositAmount": 7380
  },
  "dr": {
    "documentNumber": "DR-26-000001",
    "status": "Received",
    "paymentAmount": 7380,
    "receivedDate": "2026-06-24T00:00:00.000Z"
  },
  "invoice": {
    "documentNumber": "INV-26-000001",
    "status": "Sent",
    "total": 24620
  },
  "receipt": {
    "documentNumber": "RE-26-000001",
    "status": "Received",
    "total": 24620,
    "receivedDate": "2026-06-24T00:00:00.000Z"
  }
}
```

แต่ละ field เป็น `null` ถ้าไม่พบเอกสารที่ linked กับ SO นี้

---

### Frontend — `soService.ts`

เพิ่ม type + function:

```typescript
export interface SOWorkflowStatus {
  di: {
    documentNumber: string;
    status: string;
    depositPercentage: number;
    depositAmount: number;
  } | null;
  dr: {
    documentNumber: string;
    status: string;
    paymentAmount: number;
    receivedDate: string | null;
  } | null;
  invoice: {
    documentNumber: string;
    status: string;
    total: number;
  } | null;
  receipt: {
    documentNumber: string;
    status: string;
    total: number;
    receivedDate: string | null;
  } | null;
}

export async function fetchSOWorkflowStatus(soId: string): Promise<SOWorkflowStatus> {
  const res = await api.get(`/so/${soId}/deposit-status`);
  return res.data;
}
```

---

### Frontend — `SOTab.tsx`

**Callback props เพิ่ม:**
```typescript
interface Props {
  // ... existing props ...
  onNavigateToDI?: (diDocumentNumber: string) => void;
  onNavigateToInvoice?: (invDocumentNumber: string) => void;
}
```

**State เพิ่ม:**
```typescript
const [workflowStatus, setWorkflowStatus] = useState<SOWorkflowStatus | null>(null);
```

**Effect เมื่อ enter view mode:**
```typescript
useEffect(() => {
  if (mode !== 'view' || !viewing) { setWorkflowStatus(null); return; }
  fetchSOWorkflowStatus(viewing.id)
    .then(setWorkflowStatus)
    .catch(() => setWorkflowStatus(null));
}, [mode, viewing?.id]);
```

**แสดงผล (ใน SO card ใต้ top bar divider):**
- แสดง section เมื่อ `workflowStatus` มีค่าอย่างน้อย 1 ใน `di/dr/invoice/receipt` ไม่เป็น null
- แถว DI: แสดงเมื่อ `workflowStatus.di != null` + ปุ่ม "เปิด →" ที่เรียก `onNavigateToDI(di.documentNumber)`
- แถว DR: แสดงเมื่อ `workflowStatus.dr != null` — ถ้า `di != null && dr == null` แสดงแถว "รอรับมัดจำ" (ไม่มีปุ่ม)
- แถว Invoice: แสดงเมื่อ `workflowStatus.invoice != null` + ปุ่ม "เปิด →" ที่เรียก `onNavigateToInvoice(invoice.documentNumber)`
- แถว Receipt: แสดงเมื่อ `workflowStatus.receipt != null` (ไม่มีปุ่ม — เข้าถึงจาก Invoice tab)

---

### Frontend — `SalesDocuments.tsx`

**Handlers ใหม่:**
```typescript
const handleNavigateToDI = (diDocumentNumber: string) => {
  setActiveTab('deposit_invoice');
  loadedTabsRef.current.delete('deposit_invoice');
  void fetchTab('deposit_invoice').then(() => {
    const di = docs['deposit_invoice']?.find(
      (d: any) => d.documentNumber === diDocumentNumber
    );
    if (di) handleView(di);
  });
};

const handleNavigateToInvoice = (invDocumentNumber: string) => {
  setActiveTab('invoice');
  loadedTabsRef.current.delete('invoice');
  void fetchTab('invoice').then(() => {
    const inv = docs['invoice']?.find(
      (d: any) => d.documentNumber === invDocumentNumber
    );
    if (inv) handleView(inv);
  });
};
```

**Wire ใน `<SOTab>`:**
```tsx
<SOTab
  ...
  onNavigateToDI={handleNavigateToDI}
  onNavigateToInvoice={handleNavigateToInvoice}
/>
```

---

## Files Changed

| File | Action |
|------|--------|
| `backend/src/controllers/SOController.ts` | เพิ่ม route + handler `GET /:id/deposit-status` |
| `frontend/src/services/soService.ts` | เพิ่ม type `SOWorkflowStatus` + function `fetchSOWorkflowStatus` |
| `frontend/src/pages/documents/SOTab.tsx` | เพิ่ม props `onNavigateToDI` / `onNavigateToInvoice`, state, effect, UI section |
| `frontend/src/pages/documents/SalesDocuments.tsx` | เพิ่ม `handleNavigateToDI` / `handleNavigateToInvoice` และ wire ใน `<SOTab>` |

---

## Edge Cases

- **ไม่มีเอกสารเลย:** section ไม่แสดง
- **มี DI แต่ไม่มี DR:** แสดง DI row + แถว "รอรับมัดจำ"
- **มี DR แต่ไม่มี Invoice:** แสดงแค่ DI + DR (ไม่แสดง placeholder invoice)
- **Fetch error:** section ไม่แสดง (silent fail, ไม่ crash)
- **ออกจาก view mode:** clear `workflowStatus`

---

## Non-Goals

- ไม่แสดงใน list view
- ไม่แสดงใน create/edit mode
- ไม่เพิ่ม column ใน SO schema
- ไม่แก้ DI/DR/Invoice/Receipt tabs
- ไม่แสดง PR/PO/GR workflow (เฉพาะ sales document side)
