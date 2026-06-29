# Group B: Test Suite — Serial Number & System Hardening

> **วิธีใช้:** หลังจากทำ Group B tasks เสร็จแล้ว สั่ง:
> `"รัน Test Suite Group B"` — ระบบจะ execute ทุก test ตามไฟล์นี้

**Scope:** ทดสอบ Inbound (GR + S/N), Outbound (pay-full + S/N), Stock Guard, Concurrency, API Contract

**ก่อน Run:** ต้องมี `SerialNumber` model ใน DB และ Group B Tasks 1–9 complete แล้ว

---

## ส่วนที่ 1 — Unit & Integration Tests (Jest)

### คำสั่ง Run ทั้งหมด

```bash
cd /home/po/DocKey/backend
npx jest --no-coverage --runInBand 2>&1
```

### คำสั่ง Run แยก Suite

```bash
# Stock Guard
npx jest stockService --no-coverage --verbose

# GR Serial Number validation
npx jest grSerialNumber --no-coverage --verbose

# payFull + S/N integration
npx jest payFullWithSN --no-coverage --verbose

# DO Gate (existing)
npx jest mainDocuments.invoice --no-coverage --verbose

# Serial Number API
npx jest serialNumberApi --no-coverage --verbose
```

---

## Suite 1: stockService — Guard สต๊อกติดลบ

**File:** `backend/src/__tests__/stockService.test.ts`

**วิธี verify:** `npx jest stockService --no-coverage --verbose`

**Expected Output:**
```
PASS src/__tests__/stockService.test.ts
  recordStockMove — negative stock guard
    ✓ throw เมื่อ stockQty < qty ที่ต้องการตัด
    ✓ ผ่านเมื่อ stockQty === qty พอดี
    ✓ ทิศทาง IN ไม่ตรวจ stock (เพิ่มของเข้าเสมอ)
    ✓ throw เมื่อ items มี productId ว่าง (skip gracefully)
```

**Test Cases:**

```
TC-STOCK-001: throw 'สต๊อกไม่เพียงพอ' เมื่อ stockQty=2, qty=5
  Given product GPU-4090 มี stockQty = 2
  When  recordStockMove direction=OUT qty=5
  Then  throw Error ที่มีข้อความ 'สต๊อกไม่เพียงพอ'
  And   stockQty ไม่เปลี่ยนแปลง

TC-STOCK-002: ผ่านเมื่อ stockQty === qty พอดีเป๊ะ
  Given product มี stockQty = 3
  When  recordStockMove direction=OUT qty=3
  Then  resolve ไม่ throw
  And   stockTransaction.create ถูกเรียก 1 ครั้ง

TC-STOCK-003: direction=IN ไม่ตรวจ stock เลย
  Given ไม่ mock product.findUnique
  When  recordStockMove direction=IN qty=10
  Then  resolve สำเร็จ
  And   product.findUnique ไม่ถูกเรียก (IN เพิ่มได้เสมอ)

TC-STOCK-004: items ที่มี qty=0 ถูก skip
  Given items = [{ productCode: 'X', qty: 0 }]
  When  recordStockMove
  Then  ไม่มี DB call เกิดขึ้น
```

---

## Suite 2: grSerialNumber — GR S/N Validation Backend

**File:** `backend/src/__tests__/grSerialNumber.test.ts`

**วิธี verify:** `npx jest grSerialNumber --no-coverage --verbose`

**Expected Output:**
```
PASS src/__tests__/grSerialNumber.test.ts
  validateAndRegisterSerialNumbers
    ✓ throw เมื่อ S/N ไม่ครบทุก line
    ✓ throw พร้อม line number เมื่อ S/N บาง line ว่าง
    ✓ throw เมื่อ S/N ซ้ำกันภายในใบ GR เดียวกัน พร้อมระบุบรรทัด
    ✓ throw เมื่อ S/N มีอยู่ใน DB แล้ว (status AVAILABLE)
    ✓ throw เมื่อ S/N มีอยู่ใน DB แล้ว (status SOLD)
    ✓ สร้าง SerialNumber records สถานะ AVAILABLE เมื่อ S/N ถูกต้องทั้งหมด
    ✓ S/N ที่สร้างต้องผูก grId และ grNumber
```

**Test Cases:**

```
TC-GR-SN-001: throw เมื่อ S/N ไม่ครบ
  Given GR มี 3 items, กรอก S/N แค่ 2 รายการ (item ที่ 2 ว่าง)
  When  validateAndRegisterSerialNumbers
  Then  throw 'กรุณากรอก Serial Number ให้ครบทุกรายการ (ขาดที่บรรทัด: 2)'

TC-GR-SN-002: throw เมื่อ S/N ซ้ำในใบ
  Given items[0].serialNumber === items[2].serialNumber === 'SN-001'
  When  validateAndRegisterSerialNumbers
  Then  throw "Serial Number 'SN-001' ถูกใช้ซ้ำในรายการที่ 1 และ 3"

TC-GR-SN-003: throw เมื่อ S/N ซ้ำใน DB (AVAILABLE)
  Given prisma.serialNumber.findFirst คืน { serialNumber: 'SN-001', grNumber: 'GR-26-000001' }
  When  validateAndRegisterSerialNumbers
  Then  throw "Serial Number 'SN-001' มีอยู่ในระบบแล้ว (GR: GR-26-000001)"

TC-GR-SN-004: throw เมื่อ S/N ซ้ำใน DB (SOLD)
  Given prisma.serialNumber.findFirst คืน { status: 'SOLD', soNumber: 'SO-26-000001' }
  When  validateAndRegisterSerialNumbers
  Then  throw ที่มีคำว่า 'มีอยู่ในระบบแล้ว'

TC-GR-SN-005: สร้าง SerialNumber records ถูกต้อง
  Given S/N ทุกตัว unique ไม่มีใน DB
  When  validateAndRegisterSerialNumbers ด้วย S/N 3 ตัว
  Then  serialNumber.createMany ถูกเรียก
  And   records ที่สร้างมี status='AVAILABLE', grId, grNumber ถูกต้อง

TC-GR-SN-006: productId ต้อง resolve จาก productCode ก่อนสร้าง
  Given item.productCode = 'GPU-4090', product.id = 'prod-001'
  When  validateAndRegisterSerialNumbers
  Then  serialNumber record ที่สร้างมี productId = 'prod-001' (ไม่ใช่ว่าง)
```

---

## Suite 3: payFullWithSN — payFullSO + S/N Integration

**File:** `backend/src/lib/__tests__/payFullWithSN.test.ts`

**วิธี verify:** `npx jest payFullWithSN --no-coverage --verbose`

**Expected Output:**
```
PASS src/lib/__tests__/payFullWithSN.test.ts
  payFullSO — Serial Number validation
    ✓ throw เมื่อจำนวน S/N ไม่ตรงกับ qty รวมใน SO items
    ✓ throw เมื่อ S/N ไม่มีในระบบ
    ✓ throw เมื่อ S/N สถานะ SOLD (ไม่ใช่ AVAILABLE)
    ✓ throw เมื่อ S/N สถานะ RESERVED
    ✓ mark S/N เป็น SOLD พร้อมผูก doId, soId, soldAt
    ✓ S/N ทุกตัวต้อง update ครบ (ไม่ skip)
  payFullSO — Existing Tests (regression)
    ✓ throw เมื่อ SO ไม่ใช่ CONFIRMED
    ✓ throw เมื่อ paymentTerm ไม่ใช่ Days=0
    ✓ throw เมื่อมี DI อยู่แล้ว
    ✓ throw เมื่อมี RC อยู่แล้ว (idempotency)
```

**Test Cases:**

```
TC-PAY-SN-001: throw เมื่อ S/N count ไม่ตรง qty
  Given SO items: [{ qty: 2 }], serialNumbers: ['SN-001'] (1 ตัว)
  When  payFullSO(soId, companyId, ['SN-001'])
  Then  throw 'จำนวน Serial Number (1) ไม่ตรงกับจำนวนสินค้า (2)'

TC-PAY-SN-002: throw เมื่อ S/N ไม่มีใน DB
  Given serialNumber.findUnique mock คืน null
  When  payFullSO(soId, companyId, ['SN-FAKE'])
  Then  throw "ไม่พบ Serial Number 'SN-FAKE' ในระบบ"

TC-PAY-SN-003: throw เมื่อ S/N สถานะ SOLD
  Given serialNumber.findUnique mock คืน { status: 'SOLD' }
  When  payFullSO(soId, companyId, ['SN-001'])
  Then  throw "Serial Number 'SN-001' ไม่มีสถานะ AVAILABLE (ปัจจุบัน: SOLD)"

TC-PAY-SN-004: mark SOLD พร้อม reference ครบ
  Given S/N ทุกตัว AVAILABLE, transaction mock ทำงาน
  When  payFullSO สำเร็จ
  Then  serialNumber.update ถูกเรียกกับ:
        { status: 'SOLD', doId: <doId>, soId: <soId>, soldAt: <Date> }

TC-PAY-SN-005: Idempotency — throw เมื่อมี RC ผูก SO แล้ว
  Given receiptDocument.findFirst คืน { documentNumber: 'RC-26-000001' }
  When  payFullSO เรียกซ้ำ
  Then  throw 'SO นี้มีใบเสร็จรับเงินอยู่แล้ว (RC-26-000001)'

TC-PAY-SN-006: Regression — SO ไม่ใช่ CONFIRMED
  Given saleOrder.status = 'DRAFT'
  When  payFullSO
  Then  throw 'SO ต้องอยู่ในสถานะ CONFIRMED'

TC-PAY-SN-007: Regression — paymentTerm เป็น Credit 30 วัน
  Given paymentTerm.days = 30
  When  payFullSO
  Then  throw ที่มีคำว่า 'Cash' หรือ 'Days=0'
```

---

## Suite 4: serialNumberApi — GET /api/serial-numbers/validate

**File:** `backend/src/__tests__/serialNumberApi.test.ts`

**วิธี verify:** `npx jest serialNumberApi --no-coverage --verbose`

**Expected Output:**
```
PASS src/__tests__/serialNumberApi.test.ts
  GET /api/serial-numbers/validate
    ✓ HTTP 200, valid:true เมื่อ S/N AVAILABLE
    ✓ HTTP 200, valid:false เมื่อ S/N SOLD พร้อม reference
    ✓ HTTP 200, valid:false เมื่อ S/N ไม่มีในระบบ
    ✓ HTTP 200, valid:false เมื่อ S/N productCode ไม่ตรง
    ✓ HTTP 400 เมื่อไม่ส่ง sn parameter
    ✓ ไม่รั่ว company data ข้าม companyId
```

**Test Cases:**

```
TC-API-SN-001: S/N AVAILABLE — valid:true
  GET /api/serial-numbers/validate?sn=SN-4090-AA0001&productCode=GPU-4090
  Expected HTTP 200
  Body: { valid: true, serialNumber: 'SN-4090-AA0001', status: 'AVAILABLE', productCode: 'GPU-4090' }

TC-API-SN-002: S/N สถานะ SOLD — valid:false + reference
  GET /api/serial-numbers/validate?sn=SN-4090-AA0001
  Expected HTTP 200
  Body: {
    valid: false,
    status: 'SOLD',
    soldAt: '<ISO datetime>',
    reference: { soId: '...', doId: '...', soNumber: 'SO-26-000001', doNumber: 'DO-26-000001' },
    error: "Serial Number 'SN-4090-AA0001' ถูกขายออกไปแล้ว ..."
  }

TC-API-SN-003: S/N ไม่มีในระบบ — valid:false
  GET /api/serial-numbers/validate?sn=SN-FAKE-99999
  Expected HTTP 200
  Body: { valid: false, status: null, error: "ไม่พบ Serial Number 'SN-FAKE-99999' ในระบบ" }

TC-API-SN-004: productCode ไม่ตรง — valid:false
  GET /api/serial-numbers/validate?sn=SN-RAM-001&productCode=GPU-4090
  Expected HTTP 200
  Body: { valid: false, error: "...เป็นของสินค้า 'RAM DDR5 32GB' ไม่ตรงกับ 'GPU-4090'" }

TC-API-SN-005: ไม่ส่ง sn — 400
  GET /api/serial-numbers/validate
  Expected HTTP 400
  Body: { success: false, error: 'กรุณาระบุ Serial Number' }

TC-API-SN-006: ไม่รั่ว data ข้าม company
  Given S/N ของ company-A
  When  request ด้วย token ของ company-B
  Then  คืน valid:false (ไม่พบ — เพราะ filter companyId)
```

---

## Suite 5: DO Gate Regression (existing)

**File:** `backend/src/lib/__tests__/mainDocuments.invoice.test.ts`

**วิธี verify:** `npx jest mainDocuments.invoice --no-coverage --verbose`

**Expected Output:**
```
PASS src/lib/__tests__/mainDocuments.invoice.test.ts
  DO gate on RC save (via saveDocumentByType)
    ✓ throws when saving RC for a linked SO that has no DO
    ✓ allows RC when linkedSOId is empty (standalone receipt)
    ✓ allows RC when linkedSOId is set and a DO exists for that SO
    ✓ allows RC when linkedSOId is empty string (treated as no linkage)
```

> **หมายเหตุ:** ถ้า test เหล่านี้ fail หลัง Group B แปลว่า refactor ทำให้ DO gate พัง

---

## ส่วนที่ 2 — Manual Test Checklist (Browser)

> Run หลังจาก backend + frontend deploy แล้ว

### Phase 1: Inbound — GR + Serial Number

```
[ ] MT-INB-001: สร้าง PO สำหรับ GPU-4090 จำนวน 3 ชิ้น → สถานะ Open
[ ] MT-INB-002: สร้าง GR จาก PO นั้น → เห็นช่องกรอก S/N ทุก line
[ ] MT-INB-003: กรอก S/N แค่ 2 จาก 3 → กด Save → เห็น Error
[ ] MT-INB-004: กรอก S/N ซ้ำ line 1 และ 2 → เห็น Error highlight แถว
[ ] MT-INB-005: กรอก S/N ครบ 3 รายการ unique → Save สำเร็จ
[ ] MT-INB-006: ตรวจ DB — SerialNumber 3 records สถานะ AVAILABLE
[ ] MT-INB-007: ตรวจ DB — stockQty ของ GPU-4090 เพิ่มขึ้น +3
[ ] MT-INB-008: สร้าง GR อีกใบ ใส่ S/N ที่เพิ่งรับเข้าไป → เห็น Error "มีอยู่ในระบบแล้ว"
```

### Phase 2: Outbound — Pay-Full + Serial Number

```
[ ] MT-OUT-001: สร้าง SO (Cash term) เลือก GPU-4090 จำนวน 1 ชิ้น → Confirm SO
[ ] MT-OUT-002: กดปุ่ม "จ่ายเต็ม" → Modal ปรากฏพร้อมช่องกรอก S/N
[ ] MT-OUT-003: กรอก S/N ที่ไม่มีในระบบ → เห็น ✗ และ error message
[ ] MT-OUT-004: กรอก S/N ที่มีสถานะ SOLD → เห็น error "ถูกขายออกไปแล้ว"
[ ] MT-OUT-005: กรอก S/N ที่ AVAILABLE → เห็น ✓
[ ] MT-OUT-006: กด "ยืนยันชำระ" → หน้าจอแสดงสำเร็จ + เลข RC
[ ] MT-OUT-007: ตรวจ DB — SO status = COMPLETED
[ ] MT-OUT-008: ตรวจ DB — DO, INV, RC ถูกสร้าง ครบ 3 ใบ
[ ] MT-OUT-009: ตรวจ DB — SerialNumber ที่ใช้ status = SOLD, soId, doId ถูกผูก
[ ] MT-OUT-010: ตรวจ DB — stockQty GPU-4090 ลดลง -1
[ ] MT-OUT-011: กด "จ่ายเต็ม" ซ้ำบน SO เดิม → เห็น Error "มีใบเสร็จแล้ว"
```

### Phase 3: Edge Cases

```
[ ] MT-EDGE-001: ขาย GPU-4090 จนสต๊อกเหลือ 0 → พยายามขายอีก → Error สต๊อกไม่พอ
[ ] MT-EDGE-002: S/N ของ RAM ใส่ใน line GPU → error "เป็นของสินค้าอื่น"
[ ] MT-EDGE-003: DO Gate — สร้าง RC โดยไม่มี DO ก่อน → Error "กรุณาออก DO ก่อน"
[ ] MT-EDGE-004: companyId isolation — login company-B → validate S/N ของ company-A → ไม่พบ
```

---

## ส่วนที่ 3 — API Contract Test (curl / Postman)

### ก่อน Run: ต้องมี JWT Token

```bash
# Login แล้วเก็บ token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.token')
```

---

### CT-001: validate S/N ที่ AVAILABLE

```bash
curl -s -X GET \
  "http://localhost:3000/api/serial-numbers/validate?sn=SN-4090-AA0001&productCode=GPU-4090" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:**
```json
{
  "valid": true,
  "serialNumber": "SN-4090-AA0001",
  "status": "AVAILABLE",
  "productCode": "GPU-4090"
}
```

---

### CT-002: validate S/N ที่ไม่มีในระบบ

```bash
curl -s -X GET \
  "http://localhost:3000/api/serial-numbers/validate?sn=SN-FAKE-99999" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:**
```json
{
  "valid": false,
  "serialNumber": "SN-FAKE-99999",
  "status": null,
  "error": "ไม่พบ Serial Number 'SN-FAKE-99999' ในระบบ"
}
```

---

### CT-003: pay-full Happy Path

```bash
# SO_ID = เลข ID ของ SO ที่ CONFIRMED + Cash Term
curl -s -X POST \
  "http://localhost:3000/api/so/${SO_ID}/pay-full" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "serialNumbers": ["SN-4090-AA0001"] }' | jq .
```

**Expected HTTP 200:**
```json
{
  "success": true,
  "data": {
    "soId":  "SO-26-000001",
    "invId": "INV-26-000001",
    "doId":  "DO-26-000001",
    "rcId":  "RC-26-000001"
  }
}
```

---

### CT-004: pay-full กับ S/N ที่ SOLD

```bash
curl -s -X POST \
  "http://localhost:3000/api/so/${SO_ID}/pay-full" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "serialNumbers": ["SN-4090-AA0001"] }' | jq .
```

**Expected HTTP 400:**
```json
{
  "success": false,
  "error": "Serial Number 'SN-4090-AA0001' ไม่มีสถานะ AVAILABLE (ปัจจุบัน: SOLD)"
}
```

---

### CT-005: pay-full กับ S/N count ไม่ตรง qty

```bash
# SO มีสินค้า qty=2 แต่ส่ง S/N 1 ตัว
curl -s -X POST \
  "http://localhost:3000/api/so/${SO_ID}/pay-full" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "serialNumbers": ["SN-4090-AA0001"] }' | jq .
```

**Expected HTTP 400:**
```json
{
  "success": false,
  "error": "จำนวน Serial Number (1) ไม่ตรงกับจำนวนสินค้า (2)"
}
```

---

### CT-006: pay-full SO ไม่ใช่ CONFIRMED

```bash
curl -s -X POST \
  "http://localhost:3000/api/so/${DRAFT_SO_ID}/pay-full" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "serialNumbers": [] }' | jq .
```

**Expected HTTP 400:**
```json
{
  "success": false,
  "error": "SO ... อยู่ในสถานะ DRAFT (ต้องเป็น CONFIRMED)"
}
```

---

### CT-007: pay-full SO paymentTerm Credit (ไม่ใช่ Cash)

```bash
curl -s -X POST \
  "http://localhost:3000/api/so/${CREDIT_SO_ID}/pay-full" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "serialNumbers": [] }' | jq .
```

**Expected HTTP 400:**
```json
{
  "success": false,
  "error": "...เงื่อนไขเครดิต...ใช้ Pay-Full ได้เฉพาะเงินสด (Days=0)"
}
```

---

## ส่วนที่ 4 — Test Pass Criteria สรุป

### เกณฑ์ "ผ่าน" ก่อน Production

| หมวด | เงื่อนไข |
|---|---|
| Unit Tests | ทุก Suite PASS 100% — `npx jest --no-coverage` ไม่มี FAIL |
| MT-INB | MT-INB-001 ถึง MT-INB-008 ✓ ทั้งหมด |
| MT-OUT | MT-OUT-001 ถึง MT-OUT-011 ✓ ทั้งหมด |
| MT-EDGE | MT-EDGE-001 ถึง MT-EDGE-004 ✓ ทั้งหมด |
| Contract Tests | CT-001 ถึง CT-007 response ตรง format ✓ |
| Regression | DO Gate tests 4/4 PASS (ไม่ถดถอย) |
| Stock Integrity | stockQty ไม่ติดลบแม้แต่ครั้งเดียวใน manual test |

### เกณฑ์ "Block Release" (ห้าม deploy ถ้ายังมีอยู่)

- Unit test FAIL ใดๆ
- stockQty ติดลบได้
- S/N ถูก SOLD ซ้ำสองได้ (race condition)
- company-B เห็น S/N ของ company-A

---

## ส่วนที่ 5 — Test Data Setup Script

> รัน script นี้ก่อนทำ Manual Test เพื่อสร้างข้อมูลทดสอบ

```sql
-- 1. ตรวจว่า product GPU-4090 มีอยู่
SELECT id, productCode, stockQty FROM Product WHERE ProductCode = 'GPU-4090' LIMIT 1;

-- 2. ดู SerialNumber ปัจจุบัน
SELECT serialNumber, status, grNumber, soNumber FROM SerialNumber
WHERE CompanyID = '<your-company-id>'
ORDER BY CreatedAt DESC LIMIT 20;

-- 3. Reset S/N สำหรับ test (ถ้าต้องการ)
-- UPDATE SerialNumber SET Status = 'AVAILABLE', DOID = NULL, SOID = NULL, SoldAt = NULL
-- WHERE SerialNumber IN ('SN-4090-AA0001', 'SN-4090-AA0002', 'SN-4090-AA0003');

-- 4. ดู stock
SELECT productCode, stockQty FROM Product
WHERE CompanyID = '<your-company-id>' AND ProductCode LIKE 'GPU%';
```

---

*Generated: 2026-06-29 | Depends on: Group B Plan (2026-06-29-group-b-serial-number-and-system-hardening.md)*
