# Group B: Serial Number System & System Hardening

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่มระบบ Serial Number (S/N) เพื่อรองรับสินค้าที่ต้องติดตามรายชิ้น และแก้ไขช่องโหว่ด้าน concurrency, stock integrity, และ security gate ที่พบจากการทดสอบ QA

**Architecture:**
- เพิ่ม `SerialNumber` model ใหม่ใน Prisma schema เป็น Single Source of Truth ของแต่ละ S/N
- Inbound (GR): บังคับกรอก S/N ก่อน confirm — สร้าง `SerialNumber` record สถานะ `AVAILABLE`
- Outbound (payFullSO): รับ S/N เป็น input, validate ภายใน transaction, mark `SOLD` พร้อม reference

**Tech Stack:** Node.js + Express + Prisma (MySQL), React + Vite + Tailwind CSS, Jest + Supertest

## Global Constraints

- ใช้ ULID (`monotonicFactory()`) สำหรับ primary key ทุก model ใหม่
- ห้ามตัดสต๊อกติดลบ: `recordStockMove` ต้อง throw ถ้า `stockQty - qty < 0`
- S/N validation ต้องอยู่ **ภายใน** `prisma.$transaction` เสมอ (ป้องกัน race condition)
- `DeliveryOrderDocument` ยังไม่มี `companyId` — ห้ามสมมติว่ามี field นี้
- ทุก Error message ภาษาไทยต้องระบุ reference (เลขเอกสาร, S/N, status) เพื่อให้ user debug ได้
- ห้ามเพิ่ม feature เกิน scope ของแต่ละ task — YAGNI

---

## Task 1: SerialNumber Schema + Migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_add_serial_number/migration.sql` (auto-generated)

**Interfaces:**
- Produces:
  - `SerialNumber` model ที่ Task 2-6 ใช้
  - `GRItem.serialNumber String?` field ที่ Task 3 ใช้

- [ ] **Step 1: เพิ่ม enum SerialNumberStatus**

เพิ่มต่อจาก enum อื่นใน schema.prisma:

```prisma
enum SerialNumberStatus {
  AVAILABLE
  SOLD
  RESERVED
  DAMAGED

  @@map("SerialNumberStatus")
}
```

- [ ] **Step 2: เพิ่ม model SerialNumber**

```prisma
model SerialNumber {
  id            String             @id @map("ID") @db.VarChar(26)
  serialNumber  String             @map("SerialNumber") @db.VarChar(100)
  productId     String             @map("ProductID") @db.VarChar(26)
  productCode   String             @map("ProductCode") @db.VarChar(50)
  companyId     String             @map("CompanyID") @db.VarChar(191)
  status        SerialNumberStatus @default(AVAILABLE) @map("Status")
  grId          String?            @map("GRID") @db.VarChar(191)
  grNumber      String?            @map("GRNumber") @db.VarChar(50)
  grItemId      String?            @map("GRItemID") @db.VarChar(191)
  doId          String?            @map("DOID") @db.VarChar(26)
  doNumber      String?            @map("DONumber") @db.VarChar(50)
  soId          String?            @map("SOID") @db.VarChar(191)
  soNumber      String?            @map("SONumber") @db.VarChar(50)
  soldAt        DateTime?          @map("SoldAt")
  createdAt     DateTime           @default(now()) @map("CreatedAt")
  updatedAt     DateTime           @updatedAt @map("UpdatedAt")
  product       Product            @relation(fields: [productId], references: [id], onDelete: Restrict)
  company       Company            @relation("SerialNumberCompany", fields: [companyId], references: [id])

  @@unique([companyId, serialNumber])
  @@index([companyId, productCode, status])
  @@index([companyId, status])
  @@index([grId])
  @@map("SerialNumber")
}
```

- [ ] **Step 3: เพิ่ม field `serialNumber` ใน GRItem**

```prisma
model GRItem {
  // ...fields ที่มีอยู่แล้ว...
  serialNumber String? @map("SerialNumber") @db.VarChar(100)  // ← เพิ่มบรรทัดนี้
  // ...
}
```

- [ ] **Step 4: เพิ่ม relation ใน Product และ Company**

ใน `model Product` เพิ่ม:
```prisma
  serialNumbers SerialNumber[]
```

ใน `model Company` เพิ่ม:
```prisma
  serialNumbers SerialNumber[] @relation("SerialNumberCompany")
```

- [ ] **Step 5: รัน migration**

```bash
cd backend
npx prisma migrate dev --name add_serial_number_system
```

Expected: migration สำเร็จ ไม่มี error

- [ ] **Step 6: Generate Prisma Client**

```bash
npx prisma generate
```

Expected: ไม่มี error, `PrismaClient` มี `prisma.serialNumber` ให้ใช้

- [ ] **Step 7: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: add SerialNumber model and GRItem.serialNumber field"
```

---

## Task 2: Guard สต๊อกติดลบใน recordStockMove

**Files:**
- Modify: `backend/src/lib/stockService.ts`
- Test: `backend/src/__tests__/stockService.test.ts` (สร้างใหม่ถ้าไม่มี)

**Interfaces:**
- Consumes: `StockMoveParams` (ไม่เปลี่ยน signature)
- Produces: `recordStockMove` throw `Error('สต๊อกไม่เพียงพอ: ...')` เมื่อ `stockQty < qty`

- [ ] **Step 1: เขียน failing tests**

สร้างหรือแก้ไข `backend/src/__tests__/stockService.test.ts`:

```typescript
import { recordStockMove } from '../lib/stockService';
import { prisma } from '../lib/prisma'; // หรือ import path จริง

jest.mock('../lib/prisma', () => ({
  prisma: {
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    stockTransaction: {
      create: jest.fn(),
    },
  },
}));

const mockTx = {
  product: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  stockTransaction: {
    create: jest.fn(),
  },
} as any;

describe('recordStockMove — negative stock guard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throw เมื่อ stockQty < qty ที่ต้องการตัด', async () => {
    mockTx.product.findUnique.mockResolvedValue({ id: 'p1', stockQty: 2 });

    await expect(
      recordStockMove(mockTx, {
        items: [{ productCode: 'GPU-4090', productId: 'p1', qty: 5 }],
        docNumber: 'DO-26-000001',
        docType: 'DELIVERY_ORDER',
        direction: 'OUT',
        companyId: 'company-1',
      })
    ).rejects.toThrow('สต๊อกไม่เพียงพอ');
  });

  it('ผ่านเมื่อ stockQty === qty พอดี', async () => {
    mockTx.product.findUnique.mockResolvedValue({ id: 'p1', stockQty: 3 });
    mockTx.stockTransaction.create.mockResolvedValue({});
    mockTx.product.update.mockResolvedValue({});

    await expect(
      recordStockMove(mockTx, {
        items: [{ productCode: 'GPU-4090', productId: 'p1', qty: 3 }],
        docNumber: 'DO-26-000001',
        docType: 'DELIVERY_ORDER',
        direction: 'OUT',
        companyId: 'company-1',
      })
    ).resolves.not.toThrow();
  });

  it('ทิศทาง IN ไม่ตรวจ stock (เพิ่มของเข้าเสมอ)', async () => {
    mockTx.stockTransaction.create.mockResolvedValue({});
    mockTx.product.update.mockResolvedValue({});

    await expect(
      recordStockMove(mockTx, {
        items: [{ productCode: 'GPU-4090', productId: 'p1', qty: 5 }],
        docNumber: 'GR-26-000001',
        docType: 'GOODS_RECEIPT',
        direction: 'IN',
        companyId: 'company-1',
      })
    ).resolves.not.toThrow();

    // IN direction ไม่ต้อง findUnique
    expect(mockTx.product.findUnique).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: รัน test ให้ FAIL ก่อน**

```bash
cd backend
npx jest stockService --no-coverage
```

Expected: FAIL — `recordStockMove` ยังไม่มี guard

- [ ] **Step 3: แก้ไข stockService.ts — เพิ่ม guard**

แก้ไข `backend/src/lib/stockService.ts`:

```typescript
export async function recordStockMove(
  tx: Prisma.TransactionClient,
  params: StockMoveParams,
): Promise<void> {
  const { items, docNumber, docType, direction, companyId, docId, userId } = params;

  for (const item of items) {
    if (!item.productCode || item.qty <= 0) continue;

    const signed = direction === 'OUT' ? -Math.abs(item.qty) : Math.abs(item.qty);

    // Guard: ห้ามตัดสต๊อกติดลบ
    if (direction === 'OUT') {
      const current = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stockQty: true, productCode: true },
      });
      if (!current || current.stockQty < item.qty) {
        throw new Error(
          `สต๊อกไม่เพียงพอ: ${item.productCode} มีสต๊อก ${current?.stockQty ?? 0} ชิ้น ต้องการตัด ${item.qty} ชิ้น`
        );
      }
    }

    await tx.stockTransaction.create({
      data: {
        id: ulid(),
        productId: item.productId,
        productCode: item.productCode,
        companyId,
        docNumber,
        docType,
        docId: docId ?? null,
        type: direction === 'INIT' ? 'INIT' : direction === 'IN' ? 'IN' : 'OUT',
        qtyChange: signed,
        createdBy: userId ?? null,
      },
    });

    await tx.product.update({
      where: { id: item.productId },
      data: { stockQty: { increment: signed } },
    });
  }
}
```

- [ ] **Step 4: รัน test ให้ PASS**

```bash
npx jest stockService --no-coverage
```

Expected: PASS ทุก test

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/stockService.ts backend/src/__tests__/stockService.test.ts
git commit -m "feat: guard negative stock in recordStockMove — throw when qty insufficient"
```

---

## Task 3: GR Serial Number Validation — Backend

**Files:**
- Modify: `backend/src/controllers/GRController.ts` (หรือ service ที่ handle GR confirm)
- Modify: `backend/src/lib/grService.ts` (สร้างถ้าไม่มี)
- Test: `backend/src/__tests__/grSerialNumber.test.ts`

**Interfaces:**
- Consumes: `GoodsReceipt.items[].serialNumber` (field ที่เพิ่มใน Task 1)
- Produces:
  - `confirmGR(grId, companyId)`: validate S/N ครบ + unique → สร้าง `SerialNumber` records สถานะ `AVAILABLE` → trigger stock IN
  - throw ถ้า S/N ไม่ครบ, ซ้ำในใบ, หรือซ้ำใน DB

**หมายเหตุ:** ค้นหาก่อนว่า logic confirm GR อยู่ที่ file ใดโดยค้นหา `GoodsReceipt` ใน controllers/

- [ ] **Step 1: ค้นหา GR confirm logic ปัจจุบัน**

```bash
grep -rn "GoodsReceipt\|grConfirm\|confirm.*gr\|gr.*confirm" backend/src --include="*.ts" | grep -v test | grep -v schema
```

ระบุ file และ function ที่ handle การ confirm GR ก่อนเขียน test

- [ ] **Step 2: เขียน failing tests**

```typescript
// backend/src/__tests__/grSerialNumber.test.ts
describe('confirmGR — Serial Number validation', () => {
  it('throw เมื่อ serialNumber ไม่ครบทุก line (สินค้าที่ต้องการ S/N)', async () => {
    // GR มี 2 items, กรอก S/N แค่ 1
    // Expected: throw 'กรุณากรอก Serial Number ให้ครบทุกรายการ'
  });

  it('throw เมื่อ serialNumber ซ้ำกันภายในใบ GR เดียวกัน', async () => {
    // items[0].serialNumber === items[1].serialNumber
    // Expected: throw "Serial Number 'SN-X' ถูกใช้ซ้ำในรายการที่ 1 และ 2"
  });

  it('throw เมื่อ serialNumber มีอยู่ใน DB แล้ว (AVAILABLE)', async () => {
    // prisma.serialNumber.findFirst mock คืน existing record
    // Expected: throw "Serial Number 'SN-X' มีอยู่ในระบบแล้ว (GR: GR-26-000001)"
  });

  it('สร้าง SerialNumber records สถานะ AVAILABLE เมื่อ S/N ถูกต้องทั้งหมด', async () => {
    // Expected: prisma.serialNumber.createMany ถูกเรียก
  });
});
```

- [ ] **Step 3: Implement validation ใน GR confirm flow**

เพิ่ม function `validateAndRegisterSerialNumbers` ใน grService:

```typescript
export async function validateAndRegisterSerialNumbers(
  tx: Prisma.TransactionClient,
  gr: GoodsReceipt & { items: GRItem[] },
  companyId: string,
): Promise<void> {
  const snItems = gr.items.filter((i) => i.serialNumber);

  // 1. ตรวจ S/N ครบทุก line
  const missingLines = gr.items
    .filter((i) => !i.serialNumber)
    .map((i) => i.lineNo);
  if (missingLines.length > 0) {
    throw new Error(`กรุณากรอก Serial Number ให้ครบทุกรายการ (ขาดที่บรรทัด: ${missingLines.join(', ')})`);
  }

  // 2. ตรวจ S/N ซ้ำกันในใบเดียวกัน
  const snValues = snItems.map((i) => i.serialNumber!);
  const duplicatesInBatch = snValues.filter((sn, idx) => snValues.indexOf(sn) !== idx);
  if (duplicatesInBatch.length > 0) {
    const dupSN = duplicatesInBatch[0];
    const lines = snItems
      .filter((i) => i.serialNumber === dupSN)
      .map((i) => i.lineNo);
    throw new Error(`Serial Number '${dupSN}' ถูกใช้ซ้ำในรายการที่ ${lines.join(' และ ')}`);
  }

  // 3. ตรวจ S/N ซ้ำใน DB
  const existingInDB = await tx.serialNumber.findFirst({
    where: { companyId, serialNumber: { in: snValues } },
    select: { serialNumber: true, grNumber: true },
  });
  if (existingInDB) {
    throw new Error(
      `Serial Number '${existingInDB.serialNumber}' มีอยู่ในระบบแล้ว (GR: ${existingInDB.grNumber ?? 'ไม่ทราบ'})`
    );
  }

  // 4. สร้าง SerialNumber records
  const ulid = monotonicFactory();
  await tx.serialNumber.createMany({
    data: snItems.map((item) => ({
      id: ulid(),
      serialNumber: item.serialNumber!,
      productCode: item.productCode ?? '',
      productId: '', // resolve จาก productCode ก่อน createMany
      companyId,
      status: 'AVAILABLE',
      grId: gr.id,
      grNumber: gr.grNumber,
      grItemId: item.id,
    })),
  });
}
```

**หมายเหตุ:** ต้อง resolve `productId` จาก `productCode` ก่อนสร้าง — เพิ่ม `tx.product.findMany` ก่อน `createMany`

- [ ] **Step 4: รัน tests ให้ PASS**

```bash
npx jest grSerialNumber --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/ 
git commit -m "feat: validate and register serial numbers on GR confirm"
```

---

## Task 4: Serial Number Validate API Endpoint

**Files:**
- Create: `backend/src/controllers/SerialNumberController.ts`
- Modify: `backend/src/routes/index.ts` (หรือ routes file หลัก)
- Test: `backend/src/__tests__/serialNumberApi.test.ts`

**Interfaces:**
- Produces: `GET /api/serial-numbers/validate?sn=<value>&productCode=<code>&companyId=<id>`

Response schema:
```typescript
// Valid & AVAILABLE
{ valid: true, serialNumber: string, status: 'AVAILABLE', productCode: string }

// Invalid — ขายแล้ว
{ valid: false, serialNumber: string, status: 'SOLD', soldAt: string, reference: { soId, doId }, error: string }

// ไม่พบ
{ valid: false, serialNumber: string, status: null, error: string }
```

- [ ] **Step 1: เขียน failing tests**

```typescript
describe('GET /api/serial-numbers/validate', () => {
  it('คืน valid:true เมื่อ S/N มีอยู่และ AVAILABLE', async () => {
    // mock prisma.serialNumber.findFirst → { status: 'AVAILABLE', productCode: 'GPU-4090' }
    const res = await request(app).get('/api/serial-numbers/validate?sn=SN-001&productCode=GPU-4090');
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.status).toBe('AVAILABLE');
  });

  it('คืน valid:false เมื่อ S/N สถานะ SOLD', async () => {
    // mock → { status: 'SOLD', soNumber: 'SO-26-000001', doNumber: 'DO-26-000001' }
    const res = await request(app).get('/api/serial-numbers/validate?sn=SN-001&productCode=GPU-4090');
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.error).toMatch(/ถูกขายออกไปแล้ว/);
  });

  it('คืน valid:false เมื่อหาไม่พบ', async () => {
    // mock → null
    const res = await request(app).get('/api/serial-numbers/validate?sn=SN-FAKE&productCode=GPU-4090');
    expect(res.body.valid).toBe(false);
    expect(res.body.error).toMatch(/ไม่พบ Serial Number/);
  });

  it('คืน 400 เมื่อไม่ส่ง sn parameter', async () => {
    const res = await request(app).get('/api/serial-numbers/validate');
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Implement SerialNumberController**

```typescript
// backend/src/controllers/SerialNumberController.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getCompanyContext } from '../lib/authContext'; // ใช้ pattern เดิมของระบบ

export const SerialNumberController = {
  async validate(req: Request, res: Response) {
    try {
      const { sn, productCode } = req.query as { sn?: string; productCode?: string };
      if (!sn) return res.status(400).json({ success: false, error: 'กรุณาระบุ Serial Number' });

      const ctx = getCompanyContext(req);
      const record = await prisma.serialNumber.findFirst({
        where: { companyId: ctx.companyId, serialNumber: sn },
        select: { status: true, productCode: true, soNumber: true, doNumber: true, soId: true, doId: true, soldAt: true },
      });

      if (!record) {
        return res.json({ valid: false, serialNumber: sn, status: null, error: `ไม่พบ Serial Number '${sn}' ในระบบ` });
      }

      if (record.status !== 'AVAILABLE') {
        return res.json({
          valid: false,
          serialNumber: sn,
          status: record.status,
          soldAt: record.soldAt?.toISOString() ?? null,
          reference: { soId: record.soId, doId: record.doId, soNumber: record.soNumber, doNumber: record.doNumber },
          error: `Serial Number '${sn}' ถูกขายออกไปแล้ว (SO: ${record.soNumber ?? '-'})`,
        });
      }

      // validate productCode ตรงกันหรือไม่
      if (productCode && record.productCode !== productCode) {
        return res.json({
          valid: false,
          serialNumber: sn,
          status: 'AVAILABLE',
          error: `Serial Number '${sn}' เป็นของสินค้า '${record.productCode}' ไม่ตรงกับ '${productCode}'`,
        });
      }

      return res.json({ valid: true, serialNumber: sn, status: 'AVAILABLE', productCode: record.productCode });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },
};
```

- [ ] **Step 3: Register route**

ค้นหา pattern การ register route ในโปรเจ็กต์แล้วเพิ่ม:
```typescript
router.get('/serial-numbers/validate', SerialNumberController.validate);
```

- [ ] **Step 4: รัน tests ให้ PASS**

```bash
npx jest serialNumberApi --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/SerialNumberController.ts backend/src/routes/ backend/src/__tests__/
git commit -m "feat: GET /api/serial-numbers/validate endpoint"
```

---

## Task 5: payFullSO รับ S/N + Validate + Mark SOLD ภายใน Transaction

**Files:**
- Modify: `backend/src/lib/mainDocuments.ts` — function `payFullSO`
- Modify: `backend/src/controllers/SOController.ts` — handler `payFull`
- Test: `backend/src/lib/__tests__/payFullWithSN.test.ts`

**Interfaces:**
- Consumes (เดิม): `payFullSO(soId, companyId, userName?)`
- Produces (ใหม่): `payFullSO(soId, companyId, serialNumbers: string[], userName?)`

Request body ใหม่ (frontend ส่งมา):
```typescript
{ serialNumbers: string[] }  // เรียงตาม SO items order
```

**หมายเหตุ:** S/N validation ต้องอยู่ **ภายใน** `prisma.$transaction` เพื่อป้องกัน race condition — อ่าน `SerialNumber` แล้ว validate `status === AVAILABLE` ก่อน update

- [ ] **Step 1: เขียน failing tests**

```typescript
// backend/src/lib/__tests__/payFullWithSN.test.ts
describe('payFullSO — Serial Number integration', () => {
  it('throw เมื่อ S/N สถานะไม่ใช่ AVAILABLE (SOLD)', async () => {
    // mock prisma.serialNumber.findUnique → { status: 'SOLD' }
    await expect(payFullSO('SO-1', 'company-1', ['SN-001'], 'user1'))
      .rejects.toThrow("Serial Number 'SN-001' ไม่มีสถานะ AVAILABLE");
  });

  it('throw เมื่อ S/N ไม่มีในระบบ', async () => {
    // mock prisma.serialNumber.findUnique → null
    await expect(payFullSO('SO-1', 'company-1', ['SN-FAKE'], 'user1'))
      .rejects.toThrow("ไม่พบ Serial Number 'SN-FAKE'");
  });

  it('throw เมื่อจำนวน S/N ไม่ตรงกับ qty ใน SO items', async () => {
    // SO มีสินค้า qty=2 แต่ส่ง S/N มา 1 รายการ
    await expect(payFullSO('SO-1', 'company-1', ['SN-001'], 'user1'))
      .rejects.toThrow('จำนวน Serial Number ไม่ตรงกับจำนวนสินค้า');
  });

  it('mark S/N เป็น SOLD และผูก doId, soId เมื่อสำเร็จ', async () => {
    // mock ทุก prisma call ที่จำเป็น
    // verify: prisma.serialNumber.update ถูกเรียกด้วย { status: 'SOLD', doId, soId, soldAt }
  });
});
```

- [ ] **Step 2: แก้ไข signature ของ payFullSO**

```typescript
// mainDocuments.ts
export async function payFullSO(
  soId: string,
  companyId: string,
  serialNumbers: string[],   // ← เพิ่ม parameter นี้
  userName?: string,
): Promise<{ rcId: string; doId: string; invId: string }> {
```

- [ ] **Step 3: เพิ่ม S/N validation ภายใน $transaction**

เพิ่มภายใน `prisma.$transaction(async (tx) => { ... })` ก่อน step สร้าง DO:

```typescript
// Validate & lock S/N (อยู่ใน tx เพื่อป้องกัน race condition)
const totalQty = soItems.reduce((sum, i) => sum + Number(i.qty), 0);
if (serialNumbers.length !== totalQty) {
  throw new Error(`จำนวน Serial Number (${serialNumbers.length}) ไม่ตรงกับจำนวนสินค้า (${totalQty})`);
}

for (const sn of serialNumbers) {
  const snRecord = await tx.serialNumber.findUnique({
    where: { companyId_serialNumber: { companyId, serialNumber: sn } },
    select: { id: true, status: true },
  });
  if (!snRecord) throw new Error(`ไม่พบ Serial Number '${sn}' ในระบบ`);
  if (snRecord.status !== 'AVAILABLE') {
    throw new Error(`Serial Number '${sn}' ไม่มีสถานะ AVAILABLE (ปัจจุบัน: ${snRecord.status})`);
  }
}
```

เพิ่มหลังสร้าง DO (step mark SOLD):

```typescript
// Mark S/N as SOLD พร้อมผูก reference
const now = new Date();
for (const sn of serialNumbers) {
  await tx.serialNumber.update({
    where: { companyId_serialNumber: { companyId, serialNumber: sn } },
    data: {
      status: 'SOLD',
      doId,
      doNumber,
      soId,
      soNumber: so.soNumber,
      soldAt: now,
    },
  });
}
```

- [ ] **Step 4: แก้ไข SOController.payFull รับ serialNumbers จาก body**

```typescript
// SOController.ts
async payFull(req: Request, res: Response) {
  try {
    const ctx = getCompanyContext(req);
    const serialNumbers: string[] = req.body?.serialNumbers ?? [];
    const result = await payFullSO(
      req.params.id,
      ctx.companyId,
      serialNumbers,
      ctx.userName ?? undefined,
    );
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
}
```

- [ ] **Step 5: เพิ่ม transaction options (timeout)**

```typescript
await prisma.$transaction(async (tx) => {
  // ...
}, {
  maxWait: 5000,
  timeout: 15000,
  isolationLevel: 'ReadCommitted',
});
```

- [ ] **Step 6: รัน tests ให้ PASS**

```bash
npx jest payFullWithSN --no-coverage
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/lib/mainDocuments.ts backend/src/controllers/SOController.ts backend/src/lib/__tests__/
git commit -m "feat: payFullSO validates and marks serial numbers SOLD inside transaction"
```

---

## Task 6: Frontend — GR Serial Number Input UI

**Files:**
- Modify: `frontend/src/pages/documents/PurchaseDocuments.tsx` (หรือ GR form component)
- Modify: `frontend/src/components/Documents/AllDocumentForm.tsx` (ถ้า GR ใช้ form นี้)
- Test: manual test ในบราวเซอร์

**Interfaces:**
- Consumes: GR items จาก PO
- Produces: แต่ละ `GRItem` ส่ง `serialNumber` field ไปกับ save request

**หมายเหตุ:** ให้ค้นหาก่อนว่า GR form อยู่ที่ component ใดใน `PurchaseDocuments.tsx` หรือ `AllDocumentForm.tsx` โดย grep หา `GRItem` หรือ `gr`

- [ ] **Step 1: ค้นหา GR item rendering ปัจจุบัน**

```bash
grep -rn "GRItem\|grItem\|receivedQty\|gr.*item\|item.*gr" frontend/src --include="*.tsx" --include="*.ts" | grep -v node_modules | head -20
```

- [ ] **Step 2: เพิ่ม Serial Number input field ต่อ GR item row**

ใน component ที่ render แต่ละ item ของ GR ให้เพิ่ม input:

```tsx
{/* Serial Number field — แสดงเมื่อสินค้าต้องการ S/N */}
<input
  type="text"
  placeholder="สแกน / กรอก Serial Number"
  value={item.serialNumber ?? ''}
  onChange={(e) => handleItemChange(index, 'serialNumber', e.target.value)}
  className="w-full rounded-lg border px-3 py-1.5 text-sm font-mono
             border-gray-300 focus:border-orange-400 focus:outline-none"
/>
```

- [ ] **Step 3: เพิ่ม Client-side duplicate validation**

ใน `handleItemChange` หรือ `handleSave`:

```typescript
const validateSNDuplicates = (items: GRItemRow[]) => {
  const sns = items.map((i) => i.serialNumber).filter(Boolean);
  const duplicates = sns.filter((sn, idx) => sns.indexOf(sn) !== idx);
  if (duplicates.length > 0) {
    return `Serial Number '${duplicates[0]}' ถูกใช้ซ้ำในรายการ`;
  }
  return null;
};
```

- [ ] **Step 4: ทดสอบ Manual ในบราวเซอร์**

```
1. เปิด PurchaseDocuments → tab GR → สร้าง GR จาก PO
2. ตรวจว่าแต่ละ item มี input S/N
3. ลองกรอก S/N ซ้ำ → ต้องเห็น error
4. กรอก S/N ครบทุก line → save สำเร็จ
5. ตรวจ API request ใน DevTools → items[].serialNumber ต้องมีค่า
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: add serial number input field to GR item rows"
```

---

## Task 7: Frontend — Pay-Full ส่ง Serial Number + S/N Scan UI

**Files:**
- Modify: `frontend/src/pages/documents/SalesDocuments.tsx`
- Modify: `frontend/src/pages/documents/SOTab.tsx`
- Modify: `frontend/src/services/soService.ts`

**Interfaces:**
- Consumes: S/N list จาก user input (scan หรือ type)
- Produces: `soService.payFull(id, serialNumbers)` ส่ง `{ serialNumbers: string[] }` ใน body

**หมายเหตุ:** Flow ใหม่ — เมื่อกด "จ่ายเต็ม" ให้แสดง modal ให้กรอก S/N ก่อน ไม่ใช่ confirm dialog ธรรมดา

- [ ] **Step 1: แก้ไข soService.payFull รับ serialNumbers**

```typescript
// soService.ts
payFull: (id: string, serialNumbers: string[]) =>
  axios.post<{ success: boolean; data: { rcId: string; doId: string; invId: string } }>(
    `${BASE}/${encodeURIComponent(id)}/pay-full`,
    { serialNumbers },
  ),
```

- [ ] **Step 2: สร้าง SerialNumberInputModal component**

สร้าง `frontend/src/components/Documents/SerialNumberInputModal.tsx`:

```tsx
// Props
interface Props {
  isOpen: boolean;
  requiredCount: number;        // จำนวน S/N ที่ต้องกรอก (รวมจาก SO items)
  productSummary: string;       // เช่น "การ์ดจอ RTX 4090 × 2"
  onConfirm: (sns: string[]) => void;
  onCancel: () => void;
  darkMode: boolean;
}

// UI:
// - แสดง requiredCount ช่อง input ที่ user กรอก S/N
// - แต่ละช่อง validate ทันทีผ่าน GET /api/serial-numbers/validate
// - แสดง ✓ (เขียว) หรือ ✗ (แดง) พร้อม error message ใต้ช่อง
// - ปุ่ม "ยืนยันชำระ" disabled จนกว่าทุก S/N ผ่าน validate
```

- [ ] **Step 3: แก้ไข handlePayFull ใน SalesDocuments**

```typescript
// เดิม: confirm dialog → payFull
// ใหม่: เปิด SerialNumberInputModal → รับ sns → payFull(id, sns)

const handlePayFull = async (so: any) => {
  // คำนวณจำนวน S/N ที่ต้องการจาก SO items
  const requiredCount = (so.items ?? []).reduce((s: number, i: any) => s + Number(i.qty || 0), 0);
  setSnModalData({ soId: so.id, requiredCount, productSummary: so.title ?? '' });
  setIsSnModalOpen(true);
};

const handleSnConfirm = async (sns: string[]) => {
  setIsSnModalOpen(false);
  setIsPayingFull(true);
  try {
    const res = await soService.payFull(selectedSO.id, sns);
    // ... existing success handling
  } finally {
    setIsPayingFull(false);
  }
};
```

- [ ] **Step 4: ทดสอบ Manual ในบราวเซอร์**

```
1. เปิด SalesDocuments → SO ที่ CONFIRMED + Cash term
2. กดปุ่ม "จ่ายเต็ม" → modal ปรากฏพร้อมช่อง S/N
3. กรอก S/N ที่ไม่มีในระบบ → เห็น error ✗
4. กรอก S/N ที่ AVAILABLE → เห็น ✓
5. กด "ยืนยันชำระ" → สำเร็จ แสดง RC
6. กลับมาดู S/N ใน DB → status = SOLD
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: pay-full modal collects serial numbers before submitting"
```

---

## Task 8: เพิ่ม companyId ใน DeliveryOrderDocument

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/src/lib/mainDocuments.ts` — DO gate และ payFullSO
- Create: migration (auto-generated)

**Interfaces:**
- Produces: `DeliveryOrderDocument.companyId` ใช้ใน DO gate filter ได้อย่างปลอดภัย

**หมายเหตุ:** ปัจจุบัน DO gate (`findFirst({ where: { linkedSOId } })`) ไม่มี `companyId` filter เพราะ `DeliveryOrderDocument` model ไม่มี field นั้น — ทำให้อาจเจอ DO จาก company อื่นได้ ถ้า S/N บังเอิญ linkedSOId ตรงกัน

- [ ] **Step 1: เพิ่ม companyId ใน DeliveryOrderDocument**

```prisma
model DeliveryOrderDocument {
  id              String   @id @map("ID") @db.Char(26)
  documentNumber  String   @map("DocumentNumber") @db.Char(26)
  quotationId     String?  @map("QuotationId") @db.VarChar(26)
  quotationNumber String?  @map("QuotationNumber") @db.VarChar(50)
  linkedSOId      String?  @map("LinkedSOId") @db.VarChar(191)
  companyId       String?  @map("CompanyID") @db.VarChar(191)  // ← เพิ่ม (nullable สำหรับ existing data)
  document        Document @relation(fields: [id], references: [id], onDelete: Cascade, onUpdate: Cascade)

  @@index([companyId, linkedSOId])  // ← เพิ่ม index
}
```

- [ ] **Step 2: รัน migration**

```bash
cd backend
npx prisma migrate dev --name add_company_id_to_delivery_order_document
```

- [ ] **Step 3: แก้ไข DO gate ใน mainDocuments.ts**

```typescript
// เดิม
const doForSO = await prisma.deliveryOrderDocument.findFirst({
  where: { linkedSOId },
});

// ใหม่ — เพิ่ม companyId filter
const doForSO = await prisma.deliveryOrderDocument.findFirst({
  where: { linkedSOId, companyId },
});
```

- [ ] **Step 4: แก้ไข buildSubtypeUpsert สำหรับ delivery_order**

ในส่วน create และ update ของ `delivery_order` ใน `buildSubtypeUpsert` ให้เพิ่ม `companyId`:
```typescript
companyId: companyId,  // หรือ parseString(header.companyId)
```

- [ ] **Step 5: แก้ไข payFullSO — เพิ่ม companyId ตอนสร้าง DO**

```typescript
await tx.deliveryOrderDocument.create({
  data: {
    id: doId,
    documentNumber: doNumber,
    linkedSOId: soId,
    companyId,            // ← เพิ่ม
  },
});
```

- [ ] **Step 6: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/ backend/src/lib/mainDocuments.ts
git commit -m "fix: add companyId to DeliveryOrderDocument for proper multi-tenant DO gate"
```

---

## Task 9: Double-Click Guard + Error Message Improvement

**Files:**
- Modify: `frontend/src/pages/documents/SalesDocuments.tsx`
- Modify: `backend/src/lib/mainDocuments.ts` (error messages)
- Modify: `backend/src/lib/stockService.ts` (error messages)

**Interfaces:**
- Produces: ปุ่ม "จ่ายเต็ม" ไม่สามารถกดซ้ำในขณะกำลัง processing

- [ ] **Step 1: เพิ่ม useRef idempotency guard ใน SalesDocuments**

```typescript
const payingRef = useRef(false);

const handleSnConfirm = async (sns: string[]) => {
  if (payingRef.current) return;  // ← guard double-submit
  payingRef.current = true;
  setIsPayingFull(true);
  try {
    // ...existing payFull call
  } finally {
    payingRef.current = false;
    setIsPayingFull(false);
  }
};
```

- [ ] **Step 2: Backend — idempotency check ใน payFullSO**

เพิ่ม check ก่อนสร้างเอกสารใหม่:

```typescript
// ตรวจว่ามี RC ที่ผูกกับ SO นี้อยู่แล้วหรือไม่
const existingRC = await prisma.receiptDocument.findFirst({
  where: { linkedSOId: soId },
  select: { documentNumber: true },
});
if (existingRC) {
  throw new Error(`SO นี้มีใบเสร็จรับเงินอยู่แล้ว (${existingRC.documentNumber}) ไม่สามารถชำระซ้ำได้`);
}
```

- [ ] **Step 3: ปรับปรุง Error Messages ให้มี Reference**

```typescript
// mainDocuments.ts
if (!so) throw new Error(`ไม่พบ SO: ${soId}`);
if (so.status !== 'CONFIRMED') throw new Error(`SO ${so.soNumber} อยู่ในสถานะ ${so.status} (ต้องเป็น CONFIRMED)`);
if (Number(pt?.days ?? -1) !== 0) throw new Error(`SO ${so.soNumber} ใช้เงื่อนไขเครดิต ${pt?.days} วัน — ใช้ Pay-Full ได้เฉพาะเงินสด (Days=0)`);
```

- [ ] **Step 4: ทดสอบ manual — กด "ยืนยันชำระ" เร็ว 2 ครั้ง**

Expected: request ส่งออกไปเพียง 1 ครั้ง

- [ ] **Step 5: Commit**

```bash
git add frontend/src/ backend/src/
git commit -m "fix: double-submit guard on pay-full + improve error messages with references"
```

---

## สรุป Tasks และลำดับความสำคัญ

| Task | รายละเอียด | ระดับ | ขึ้นกับ Task |
|------|-----------|-------|------------|
| Task 1 | SerialNumber Schema + Migration | 🔴 Critical | — |
| Task 2 | Guard สต๊อกติดลบ | 🔴 Critical | — |
| Task 3 | GR S/N Validation Backend | 🔴 Critical | Task 1 |
| Task 4 | S/N Validate API Endpoint | 🟡 Important | Task 1 |
| Task 5 | payFullSO รับ S/N + mark SOLD | 🔴 Critical | Task 1, 2 |
| Task 6 | GR S/N Input UI | 🔴 Critical | Task 1, 3 |
| Task 7 | Pay-Full S/N Modal Frontend | 🔴 Critical | Task 4, 5 |
| Task 8 | companyId ใน DeliveryOrderDocument | 🟡 Important | — |
| Task 9 | Double-click Guard + Error Messages | 🔵 Minor | Task 5, 7 |

**ลำดับการทำ:** Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8 → Task 9

---

*Generated: 2026-06-29 | Spec: QA Analysis — Serial Number & System Hardening*
