# Design: ใบรับมัดจำ (DR) → อัปเดตสถานะ DI อัตโนมัติ

**Date:** 2026-06-24
**Scope:** Sales document workflow — deposit_invoice → deposit_receipt

---

## Background

ระบบมี workflow มัดจำดังนี้:
```
QT → SO → DI (ใบแจ้งหนี้มัดจำ) → DR (ใบรับมัดจำ) → Balance Invoice → Receipt
```

เมื่อออก DI 30% และลูกค้าโอนเงินแล้ว ผู้ใช้คลิก "สร้างใบรับมัดจำ" จากแท็บ DI ฟอร์ม DR เปิดและ prefill จาก DI ได้ถูกต้อง แต่หลัง save DR:
- DI status ยังคงเป็น Draft/Sent ไม่เปลี่ยนเป็น `Paid`
- แท็บ DI ไม่ reload จึงแสดง status เก่า
- Label "จ่ายบางส่วน" ไม่ตรงกับ terminology ที่ต้องการ

---

## Requirements

1. เมื่อ DR บันทึกสำเร็จ → DI ที่เชื่อมโยงต้องอัปเดต `status = 'Paid'` อัตโนมัติ
2. หลัง save DR → แท็บ DI ต้อง reload ใหม่เมื่อผู้ใช้สลับไป
3. Label paymentType ใน DR form = "ชำระบางส่วน" (ปัจจุบัน "จ่ายบางส่วน")
4. DR form prefill จาก DI ต้องครบ: customer, billTo, paymentTerm, items, ยอด 30% (ทำงานได้แล้ว — ห้ามแตะ)

---

## Non-Goals

- ไม่แก้ DB schema / ไม่ migrate
- ไม่เพิ่ม `linkedDepositInvoiceId` field ใน `DepositReceiptDocument`
- ไม่เพิ่มขั้นตอน "Awaiting_Verify" ก่อน Paid

---

## Design

### 1. Backend — `backend/src/lib/mainDocuments.ts`

**Where:** หลัง `await upsertTypeSpecificDocument(...)` สำหรับ `deposit_receipt`

**Logic:**
```
if type === 'deposit_receipt':
  diDocumentNumber = parseString(header.referenceNo)  // buildDPFromDepositInvoice sets this to DI number
  if diDocumentNumber:
    find Document where documentNumber = diDocumentNumber AND documentType = 'DEPOSIT_INVOICE' AND companyId = companyId
    if found:
      UPDATE Document SET status = 'Paid' WHERE id = found.id
    // ไม่ throw ถ้าไม่เจอ — DR ยังบันทึกสำเร็จ
```

**Key constraint:** `referenceNo` ใน DR ถูก set เป็น DI document number โดย `buildDPFromDepositInvoice` (`referenceNo: diNum`) และ backend บันทึกผ่าน `referenceNo: parseString(header.referenceNo || ...)` — link นี้ชัดเจนและไม่ต้อง migration

### 2. Frontend cache — `frontend/src/pages/documents/SalesDocuments.tsx`

**Where:** ใน `handleEditorNavigate` → branch `action === 'save'`

**Logic:**
```
if saved type is 'deposit_receipt':
  loadedTabsRef.current.delete('deposit_invoice')
  // ทำให้แท็บ DI reload fresh เมื่อ user สลับไป
```

### 3. Label — `frontend/src/components/Documents/AllDocumentForm.tsx`

**Where:** `DEPOSIT_RECEIPT_PAYMENT_TYPE_OPTIONS` (line ~87)

**Change:**
```
{ value: 'partial', label: 'ชำระบางส่วน' }  // was: 'จ่ายบางส่วน'
```

---

## Files Changed

| File | Change |
|------|--------|
| `backend/src/lib/mainDocuments.ts` | Auto-update DI status to Paid after DR save |
| `frontend/src/pages/documents/SalesDocuments.tsx` | Invalidate DI tab cache after DR save |
| `frontend/src/components/Documents/AllDocumentForm.tsx` | Label: "จ่ายบางส่วน" → "ชำระบางส่วน" |

---

## Edge Cases

- **DI ไม่พบ:** DR บันทึกสำเร็จ ไม่ throw error (graceful)
- **DI Paid อยู่แล้ว:** UPDATE ซ้ำได้ ไม่มีผลเสีย
- **referenceNo ว่าง:** ข้ามการ lookup ไม่ทำอะไร
