# Design: SO Deposit Status Section (สถานะมัดจำใน Sale Order)

**Date:** 2026-06-24
**Scope:** SO view mode — deposit workflow status section in header

---

## Background

ปัจจุบัน SO view mode แสดงแค่ข้อมูล SO และ action buttons ไม่มีข้อมูลว่า DI หรือ DR สร้างแล้วหรือยัง ผู้ใช้ต้องสลับไปแท็บ DI/DR เพื่อดูสถานะ

---

## Requirements

1. แสดง section "สถานะมัดจำ" ใน SO view mode เท่านั้น (ไม่แสดงใน list หรือ create/edit mode)
2. Section แสดงเฉพาะเมื่อมี DI linked กับ SO นั้น — ถ้าไม่มี DI ไม่แสดง section เลย
3. ถ้ามี DI แต่ยังไม่มี DR: แสดง DI info + badge "รอรับมัดจำ"
4. ถ้ามีทั้ง DI + DR: แสดงครบทั้งคู่
5. ดึงข้อมูล DI/DR เมื่อ enter view mode เท่านั้น (ไม่ fetch ตอน list)

---

## Architecture

### Backend — `SOController.ts`

เพิ่ม route ใหม่:
```
GET /api/so/:id/deposit-status
```

Handler ทำ 2 parallel queries:
```typescript
const [diDoc, drDoc] = await Promise.all([
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
  }
}
```

- `di` เป็น `null` ถ้าไม่พบ DI ที่ linked กับ SO นี้
- `dr` เป็น `null` ถ้าไม่พบ DR ที่ linked กับ SO นี้

---

### Frontend — `soService.ts`

เพิ่ม type + function:

```typescript
export interface SODepositStatus {
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
}

export async function fetchSODepositStatus(soId: string): Promise<SODepositStatus> {
  const res = await api.get(`/so/${soId}/deposit-status`);
  return res.data;
}
```

---

### Frontend — `SOTab.tsx`

**State เพิ่ม:**
```typescript
const [depositStatus, setDepositStatus] = useState<SODepositStatus | null>(null);
```

**Effect เมื่อ enter view mode:**
```typescript
useEffect(() => {
  if (mode !== 'view' || !viewing) { setDepositStatus(null); return; }
  fetchSODepositStatus(viewing.id).then(setDepositStatus).catch(() => setDepositStatus(null));
}, [mode, viewing?.id]);
```

**Section แสดงผล** (ใต้ top bar ใน view mode, ก่อน items table):
- แสดงเมื่อ `depositStatus?.di != null` เท่านั้น
- DI row: documentNumber + status badge + `{depositPercentage}% / ฿{depositAmount}`
- DR row (ถ้ามี): documentNumber + `รับแล้ว ฿{paymentAmount}` + วันที่
- DR row (ถ้าไม่มี): ป้าย "รอรับมัดจำ"

**UI Layout (ใน SO card ใต้ divider):**
```
สถานะมัดจำ
├─ 📄 DI-26-000001   [Paid]   30% / ฿7,380
└─ 🏦 DR-26-000001   รับแล้ว ฿7,380   24/06/2026
```

---

## Files Changed

| File | Action |
|------|--------|
| `backend/src/controllers/SOController.ts` | เพิ่ม route + handler `GET /:id/deposit-status` |
| `frontend/src/services/soService.ts` | เพิ่ม type `SODepositStatus` + function `fetchSODepositStatus` |
| `frontend/src/pages/documents/SOTab.tsx` | เพิ่ม state, effect, และ UI section ใน view mode |

---

## Edge Cases

- **SO ไม่มี DI:** section ไม่แสดง (ไม่ error, ไม่แสดง placeholder)
- **DI มี แต่ DR ไม่มี:** แสดง DI row + "รอรับมัดจำ" แทน DR row
- **Fetch error:** section ไม่แสดง (silent fail, ไม่ crash)
- **ออกจาก view mode:** clear `depositStatus` เพื่อไม่ให้ข้อมูลเก่าค้าง

---

## Non-Goals

- ไม่แสดงใน list view
- ไม่แสดงใน create/edit mode
- ไม่เพิ่ม column ใน SO schema
- ไม่แก้ DI/DR tabs
