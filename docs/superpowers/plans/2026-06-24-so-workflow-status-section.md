# SO Workflow Status Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** แสดง section "สถานะการดำเนินการ" ใน SO view mode — แสดง DI → DR → Invoice → Receipt ที่ linked กับ SO นั้น พร้อมปุ่มนำทางไปยัง DI และ Invoice

**Architecture:** เพิ่ม endpoint `GET /api/so/:id/deposit-status` ที่ดึงข้อมูล 4 เอกสารพร้อมกันด้วย `Promise.all` จาก `linkedSOId` ใน prisma; frontend fetches เมื่อ enter view mode และ renders section ใน SOTab; navigation handlers ใน SalesDocuments ดึงเอกสารเฉพาะ document number และเปิดใน view mode

**Tech Stack:** TypeScript, Prisma, Express, React 18, Tailwind CSS, axios

## Global Constraints

- ไม่แสดง section ใน list mode หรือ create/edit mode — เฉพาะ view mode (`mode === 'view'`) เท่านั้น
- Section ไม่แสดงถ้าไม่มีเอกสาร linked เลย (di, dr, invoice, receipt ทุก field เป็น null)
- ถ้ามี DI แต่ไม่มี DR → แสดงแถว "รอรับมัดจำ" (no button)
- เอกสารอื่นที่ไม่มีใน DB: ไม่แสดงแถวนั้น (ยกเว้น DR เมื่อ DI มีอยู่)
- Fetch error: section ไม่แสดง (silent fail)
- ออกจาก view mode: clear workflowStatus state กลับเป็น null
- ปุ่ม "เปิด →" มีเฉพาะแถว DI และ Invoice เท่านั้น
- TypeScript: ไม่มี error ใหม่จาก `cd /home/po/DocKey/frontend && npx tsc --noEmit`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `backend/src/controllers/SOController.ts` | Modify | เพิ่ม method `getWorkflowStatus` |
| `backend/src/routes/so.ts` | Modify | เพิ่ม route `GET /so/:id/deposit-status` |
| `frontend/src/services/soService.ts` | Modify | เพิ่ม interface `SOWorkflowStatus` + function `fetchSOWorkflowStatus` |
| `frontend/src/pages/documents/SOTab.tsx` | Modify | เพิ่ม props, state, effect, UI section ใน view mode |
| `frontend/src/pages/documents/SalesDocuments.tsx` | Modify | เพิ่ม `handleNavigateToDI`, `handleNavigateToInvoice`, wire ใน `<SOTab>` |

---

## Task 1: Backend — `getWorkflowStatus` endpoint

**Files:**
- Modify: `backend/src/controllers/SOController.ts` (เพิ่ม method ก่อน closing `};` ที่บรรทัด 230)
- Modify: `backend/src/routes/so.ts` (เพิ่ม route)

**Interfaces:**
- Produces: `GET /api/so/:id/deposit-status` → `{ success: true, data: SOWorkflowStatus }`
- Response shape (all fields nullable):
  ```json
  {
    "di": { "documentNumber": "DI-26-000001", "status": "Paid", "depositPercentage": 30, "depositAmount": 7380 } | null,
    "dr": { "documentNumber": "DR-26-000001", "status": "Received", "paymentAmount": 7380, "receivedDate": "2026-06-24T00:00:00.000Z" } | null,
    "invoice": { "documentNumber": "INV-26-000001", "status": "Sent", "total": 24620 } | null,
    "receipt": { "documentNumber": "RE-26-000001", "status": "Received", "total": 24620, "receivedDate": "2026-06-24T00:00:00.000Z" } | null
  }
  ```

- [ ] **Step 1: เพิ่ม method `getWorkflowStatus` ใน `SOController.ts`**

เปิดไฟล์ `backend/src/controllers/SOController.ts`

หา closing `},` ของ `markItemsConverted` method (บรรทัดก่อน `};` ที่บรรทัด 229):
```typescript
    return res.json({ success: true, data: updated });
  },
};
```

แทนด้วย (เพิ่ม method `getWorkflowStatus` ก่อน closing `};`):
```typescript
    return res.json({ success: true, data: updated });
  },

  async getWorkflowStatus(req: Request, res: Response) {
    const ctx = await resolveCompanyContext(req);
    if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { companyId } = ctx;
    const soId = req.params.id;

    const so = await prisma.saleOrder.findFirst({
      where: { id: soId, companyId },
      select: { id: true },
    });
    if (!so) return res.status(404).json({ success: false, message: 'Not found' });

    const [diDoc, drDoc, invDoc, reDoc] = await Promise.all([
      prisma.document.findFirst({
        where: { depositInvoiceDocument: { linkedSOId: soId }, companyId },
        select: {
          documentNumber: true,
          status: true,
          depositInvoiceDocument: { select: { depositPercentage: true, depositAmount: true } },
        },
      }),
      prisma.document.findFirst({
        where: { depositReceiptDocument: { linkedSOId: soId }, companyId },
        select: {
          documentNumber: true,
          status: true,
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
          documentNumber: true,
          status: true,
          total: true,
          receiptDocument: { select: { receivedDate: true } },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        di: diDoc ? {
          documentNumber: diDoc.documentNumber,
          status: diDoc.status,
          depositPercentage: Number(diDoc.depositInvoiceDocument?.depositPercentage ?? 0),
          depositAmount: Number(diDoc.depositInvoiceDocument?.depositAmount ?? 0),
        } : null,
        dr: drDoc ? {
          documentNumber: drDoc.documentNumber,
          status: drDoc.status,
          paymentAmount: Number(drDoc.depositReceiptDocument?.paymentAmount ?? 0),
          receivedDate: drDoc.depositReceiptDocument?.receivedDate?.toISOString() ?? null,
        } : null,
        invoice: invDoc ? {
          documentNumber: invDoc.documentNumber,
          status: invDoc.status,
          total: Number(invDoc.total ?? 0),
        } : null,
        receipt: reDoc ? {
          documentNumber: reDoc.documentNumber,
          status: reDoc.status,
          total: Number(reDoc.total ?? 0),
          receivedDate: reDoc.receiptDocument?.receivedDate?.toISOString() ?? null,
        } : null,
      },
    });
  },
};
```

- [ ] **Step 2: เพิ่ม route ใน `backend/src/routes/so.ts`**

เปิดไฟล์ `backend/src/routes/so.ts`

ไฟล์ปัจจุบัน:
```typescript
import express from 'express';
import SOController from '../controllers/SOController';

const router = express.Router();

router.get('/so', SOController.getAll);
router.get('/so/:id', SOController.getById);
router.post('/so', SOController.create);
router.put('/so/:id', SOController.update);
router.delete('/so/:id', SOController.delete);
router.patch('/so/:id/confirm', SOController.confirm);
router.patch('/so/:id/cancel', SOController.cancel);
router.patch('/so/:id/mark-items-converted', SOController.markItemsConverted);

export default router;
```

แทนทั้งไฟล์ด้วย (เพิ่ม `/so/:id/deposit-status` ก่อน `/so/:id`):
```typescript
import express from 'express';
import SOController from '../controllers/SOController';

const router = express.Router();

router.get('/so', SOController.getAll);
router.get('/so/:id/deposit-status', SOController.getWorkflowStatus);
router.get('/so/:id', SOController.getById);
router.post('/so', SOController.create);
router.put('/so/:id', SOController.update);
router.delete('/so/:id', SOController.delete);
router.patch('/so/:id/confirm', SOController.confirm);
router.patch('/so/:id/cancel', SOController.cancel);
router.patch('/so/:id/mark-items-converted', SOController.markItemsConverted);

export default router;
```

หมายเหตุ: `/so/:id/deposit-status` ต้องอยู่ก่อน `/so/:id` เพราะ Express match โดย order — ถ้าไม่ทำ `/so/:id` จะ capture "deposit-status" เป็น `:id` แล้ว expect no trailing segment

- [ ] **Step 3: ตรวจสอบ TypeScript ไม่มี error**

```bash
cd /home/po/DocKey/backend && npx tsc --noEmit 2>&1 | head -20
```

Expected: ไม่มี error ใหม่

- [ ] **Step 4: Commit**

```bash
cd /home/po/DocKey && git add backend/src/controllers/SOController.ts backend/src/routes/so.ts
git commit -m "$(cat <<'EOF'
feat: add GET /api/so/:id/deposit-status endpoint for workflow status

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Frontend service — `SOWorkflowStatus` type + `fetchSOWorkflowStatus`

**Files:**
- Modify: `frontend/src/services/soService.ts`

**Interfaces:**
- Consumes (Task 1): `GET /api/so/:id/deposit-status` via axios
- Produces:
  ```typescript
  export interface SOWorkflowStatus { ... }
  export async function fetchSOWorkflowStatus(soId: string): Promise<SOWorkflowStatus>
  ```
  Task 3 imports both from `'../../services/soService'`

- [ ] **Step 1: เพิ่ม `SOWorkflowStatus` interface และ `fetchSOWorkflowStatus` ใน `soService.ts`**

เปิดไฟล์ `frontend/src/services/soService.ts`

ไฟล์ปัจจุบันจบด้วย:
```typescript
const soService = {
  getAll: () => axios.get<{ success: boolean; data: SaleOrder[] }>(BASE),
  getById: (id: string) => axios.get<{ success: boolean; data: SaleOrder }>(`${BASE}/${encodeURIComponent(id)}`),
  create: (payload: SOPayload) => axios.post<{ success: boolean; data: SaleOrder }>(BASE, payload),
  update: (id: string, payload: SOPayload) => axios.put<{ success: boolean; data: SaleOrder }>(`${BASE}/${encodeURIComponent(id)}`, payload),
  delete: (id: string) => axios.delete(`${BASE}/${encodeURIComponent(id)}`),
  confirm: (id: string) => axios.patch(`${BASE}/${encodeURIComponent(id)}/confirm`),
  cancel: (id: string) => axios.patch(`${BASE}/${encodeURIComponent(id)}/cancel`),
  markItemsConverted: (id: string, data: { itemIds: string[]; prNumber: string }) =>
    axios.patch(`${BASE}/${encodeURIComponent(id)}/mark-items-converted`, data),
};

export default soService;
```

แทน block นั้นด้วย (เพิ่ม interface + function ก่อน `export default`):
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
  const res = await axios.get<{ success: boolean; data: SOWorkflowStatus }>(
    `${BASE}/${encodeURIComponent(soId)}/deposit-status`
  );
  return res.data.data;
}

const soService = {
  getAll: () => axios.get<{ success: boolean; data: SaleOrder[] }>(BASE),
  getById: (id: string) => axios.get<{ success: boolean; data: SaleOrder }>(`${BASE}/${encodeURIComponent(id)}`),
  create: (payload: SOPayload) => axios.post<{ success: boolean; data: SaleOrder }>(BASE, payload),
  update: (id: string, payload: SOPayload) => axios.put<{ success: boolean; data: SaleOrder }>(`${BASE}/${encodeURIComponent(id)}`, payload),
  delete: (id: string) => axios.delete(`${BASE}/${encodeURIComponent(id)}`),
  confirm: (id: string) => axios.patch(`${BASE}/${encodeURIComponent(id)}/confirm`),
  cancel: (id: string) => axios.patch(`${BASE}/${encodeURIComponent(id)}/cancel`),
  markItemsConverted: (id: string, data: { itemIds: string[]; prNumber: string }) =>
    axios.patch(`${BASE}/${encodeURIComponent(id)}/mark-items-converted`, data),
};

export default soService;
```

- [ ] **Step 2: ตรวจสอบ TypeScript ไม่มี error**

```bash
cd /home/po/DocKey/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: ไม่มี error ใหม่

- [ ] **Step 3: Commit**

```bash
cd /home/po/DocKey && git add frontend/src/services/soService.ts
git commit -m "$(cat <<'EOF'
feat: add SOWorkflowStatus type and fetchSOWorkflowStatus to soService

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: SOTab view mode workflow section + SalesDocuments navigation

**Files:**
- Modify: `frontend/src/pages/documents/SOTab.tsx`
- Modify: `frontend/src/pages/documents/SalesDocuments.tsx`

**Interfaces:**
- Consumes (Task 2):
  - `import { SOWorkflowStatus, fetchSOWorkflowStatus } from '../../services/soService';`
  - `SOWorkflowStatus` type with fields: `di | dr | invoice | receipt` each nullable
  - `fetchSOWorkflowStatus(soId: string): Promise<SOWorkflowStatus>`
- Consumes (existing SalesDocuments.tsx):
  - `documentService.getAll(type)` → `Promise<AxiosResponse<{ success: boolean; data: any[] }>>`
  - `documentService.getById(type, id)` → `Promise<AxiosResponse<{ success: boolean; data: any }>>`
  - `setActiveTab(tab)` — useState setter
  - `setEditorState(state)` — useState setter
  - `setSelectedRecord(r)` — useState setter
  - `loadedTabsRef.current` — Set<SalesTabId>
  - `fetchTab(tab)` — async function that fetches tab data into `docs` state

### Part A: Modify `SOTab.tsx`

- [ ] **Step 1: เพิ่ม import `SOWorkflowStatus` และ `fetchSOWorkflowStatus`**

เปิดไฟล์ `frontend/src/pages/documents/SOTab.tsx`

หาบรรทัด:
```typescript
import soService, { SOPayload, SaleOrder } from '../../services/soService';
```

แทนด้วย:
```typescript
import soService, { SOPayload, SaleOrder, SOWorkflowStatus, fetchSOWorkflowStatus } from '../../services/soService';
```

- [ ] **Step 2: เพิ่ม props `onNavigateToDI` และ `onNavigateToInvoice` ใน Props interface**

หา interface Props บรรทัด 34-40:
```typescript
interface Props {
  darkMode: boolean;
  isAdmin?: boolean;
  initialQuotation?: any;
  onLinkToDI?: (so: any) => void;
  onLinkToBalanceInvoice?: (so: any) => void;
}
```

แทนด้วย:
```typescript
interface Props {
  darkMode: boolean;
  isAdmin?: boolean;
  initialQuotation?: any;
  onLinkToDI?: (so: any) => void;
  onLinkToBalanceInvoice?: (so: any) => void;
  onNavigateToDI?: (diDocumentNumber: string) => void;
  onNavigateToInvoice?: (invDocumentNumber: string) => void;
}
```

- [ ] **Step 3: เพิ่ม destructured props ใน function signature**

หาบรรทัด:
```typescript
export default function SOTab({ darkMode, isAdmin = false, initialQuotation, onLinkToDI, onLinkToBalanceInvoice }: Props) {
```

แทนด้วย:
```typescript
export default function SOTab({ darkMode, isAdmin = false, initialQuotation, onLinkToDI, onLinkToBalanceInvoice, onNavigateToDI, onNavigateToInvoice }: Props) {
```

- [ ] **Step 4: เพิ่ม `workflowStatus` state (หลัง state declarations ที่มีอยู่แล้ว)**

หาบรรทัด (ประมาณบรรทัด 52-55):
```typescript
  const [mode, setMode] = useState<'list' | 'create' | 'edit' | 'view'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<SaleOrder | null>(null);
  const [form, setForm] = useState<SOPayload>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
```

แทนด้วย:
```typescript
  const [mode, setMode] = useState<'list' | 'create' | 'edit' | 'view'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<SaleOrder | null>(null);
  const [form, setForm] = useState<SOPayload>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<SOWorkflowStatus | null>(null);
```

- [ ] **Step 5: เพิ่ม useEffect เพื่อ fetch workflow status เมื่อ enter view mode**

หา block ของ useEffect ที่มีอยู่แล้ว (ประมาณบรรทัด 66-69):
```typescript
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (mode !== 'list') window.requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [mode]);
```

แทนด้วย:
```typescript
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (mode !== 'list') window.requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [mode]);
  useEffect(() => {
    if (mode !== 'view' || !viewing) { setWorkflowStatus(null); return; }
    fetchSOWorkflowStatus(viewing.id)
      .then(setWorkflowStatus)
      .catch(() => setWorkflowStatus(null));
  }, [mode, viewing?.id]);
```

- [ ] **Step 6: เพิ่ม Workflow Status section ใน view mode — ใส่ระหว่าง detail info grid และ items table**

หา comment `{/* Items table */}` ในส่วน view mode (ประมาณบรรทัด 562):
```tsx
            {/* Items table */}
            <div className={`overflow-hidden rounded-2xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
```

แทนด้วย (เพิ่ม section ก่อน items table):
```tsx
            {/* Workflow Status Section */}
            {workflowStatus && (workflowStatus.di || workflowStatus.dr || workflowStatus.invoice || workflowStatus.receipt) && (
              <div className={`rounded-2xl border px-5 py-4 ${darkMode ? 'border-gray-700 bg-gray-900/60' : 'border-gray-200 bg-gray-50'}`}>
                <p className={`mb-3 text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  สถานะการดำเนินการ
                </p>
                <div className="space-y-2">
                  {/* DI row */}
                  {workflowStatus.di && (
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        <span className={textMuted}>ใบแจ้งหนี้มัดจำ</span>
                        <span className={`font-mono font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {workflowStatus.di.documentNumber}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          workflowStatus.di.status === 'Paid'
                            ? (darkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700')
                            : (darkMode ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700')
                        }`}>
                          {workflowStatus.di.status}
                        </span>
                        <span className={textMuted}>
                          {workflowStatus.di.depositPercentage}% / ฿{workflowStatus.di.depositAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      {onNavigateToDI && (
                        <button
                          type="button"
                          onClick={() => onNavigateToDI(workflowStatus.di!.documentNumber)}
                          className={`ml-2 shrink-0 rounded-lg px-2 py-1 text-xs font-semibold transition ${darkMode ? 'text-blue-300 hover:bg-gray-700' : 'text-blue-600 hover:bg-gray-100'}`}>
                          เปิด →
                        </button>
                      )}
                    </div>
                  )}

                  {/* DR row — waiting placeholder when DI exists but DR doesn't */}
                  {workflowStatus.di && !workflowStatus.dr && (
                    <div className={`flex items-center gap-2 pl-4 text-sm ${textMuted}`}>
                      <span>└─ รอรับมัดจำ</span>
                    </div>
                  )}
                  {workflowStatus.dr && (
                    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 pl-4 text-sm`}>
                      <span className={textMuted}>ใบรับมัดจำ</span>
                      <span className={`font-mono font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {workflowStatus.dr.documentNumber}
                      </span>
                      <span className={textMuted}>
                        ฿{workflowStatus.dr.paymentAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {workflowStatus.dr.receivedDate && (
                        <span className={textMuted}>
                          {formatDate(workflowStatus.dr.receivedDate)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Invoice row */}
                  {workflowStatus.invoice && (
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        <span className={textMuted}>ใบแจ้งหนี้</span>
                        <span className={`font-mono font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {workflowStatus.invoice.documentNumber}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          workflowStatus.invoice.status === 'Paid'
                            ? (darkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700')
                            : (darkMode ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700')
                        }`}>
                          {workflowStatus.invoice.status}
                        </span>
                        <span className={textMuted}>
                          ฿{workflowStatus.invoice.total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      {onNavigateToInvoice && (
                        <button
                          type="button"
                          onClick={() => onNavigateToInvoice(workflowStatus.invoice!.documentNumber)}
                          className={`ml-2 shrink-0 rounded-lg px-2 py-1 text-xs font-semibold transition ${darkMode ? 'text-blue-300 hover:bg-gray-700' : 'text-blue-600 hover:bg-gray-100'}`}>
                          เปิด →
                        </button>
                      )}
                    </div>
                  )}

                  {/* Receipt row */}
                  {workflowStatus.receipt && (
                    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 pl-4 text-sm`}>
                      <span className={textMuted}>ใบเสร็จรับเงิน</span>
                      <span className={`font-mono font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {workflowStatus.receipt.documentNumber}
                      </span>
                      <span className={textMuted}>
                        ฿{workflowStatus.receipt.total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {workflowStatus.receipt.receivedDate && (
                        <span className={textMuted}>
                          {formatDate(workflowStatus.receipt.receivedDate)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Items table */}
            <div className={`overflow-hidden rounded-2xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
```

- [ ] **Step 7: ตรวจสอบ TypeScript ไม่มี error (SOTab)**

```bash
cd /home/po/DocKey/frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: ไม่มี error ใหม่

### Part B: Modify `SalesDocuments.tsx`

- [ ] **Step 8: เพิ่ม `handleNavigateToDI` และ `handleNavigateToInvoice` handlers**

เปิดไฟล์ `frontend/src/pages/documents/SalesDocuments.tsx`

หา handler `handleLinkToBalanceInvoice` (ประมาณบรรทัด 303-308):
```typescript
  const handleLinkToBalanceInvoice = async (dp: any) => {
    const full = await fetchFullRecord(dp, 'deposit_receipt');
    setActiveTab('invoice');
    setSelectedRecord(null);
    setEditorState({ type: 'invoice', initialData: buildBalanceInvoiceFromDP(full) });
  };
```

เพิ่มต่อท้าย (หลังปิด `};` ของ `handleLinkToBalanceInvoice`):
```typescript
  const handleNavigateToDI = async (diDocumentNumber: string) => {
    setActiveTab('deposit_invoice');
    setSelectedRecord(null);
    setEditorState(null);
    loadedTabsRef.current.delete('deposit_invoice');
    void fetchTab('deposit_invoice');
    try {
      const res = await documentService.getAll('deposit_invoice');
      const list: any[] = res?.data?.data || [];
      const found = list.find((d: any) => d.documentNumber === diDocumentNumber);
      if (found) {
        const id = found.documentId || found.id;
        const full = await documentService.getById('deposit_invoice', id);
        setEditorState({ type: 'deposit_invoice', initialData: { ...(full?.data?.data || found), __mode: 'view' } });
      }
    } catch { /* silent — tab already switched */ }
  };

  const handleNavigateToInvoice = async (invDocumentNumber: string) => {
    setActiveTab('invoice');
    setSelectedRecord(null);
    setEditorState(null);
    loadedTabsRef.current.delete('invoice');
    void fetchTab('invoice');
    try {
      const res = await documentService.getAll('invoice');
      const list: any[] = res?.data?.data || [];
      const found = list.find((d: any) => d.documentNumber === invDocumentNumber);
      if (found) {
        const id = found.documentId || found.id;
        const full = await documentService.getById('invoice', id);
        setEditorState({ type: 'invoice', initialData: { ...(full?.data?.data || found), __mode: 'view' } });
      }
    } catch { /* silent — tab already switched */ }
  };
```

- [ ] **Step 9: Wire props ใน `<SOTab>`**

หาบรรทัด (ประมาณบรรทัด 457-464):
```tsx
            <SOTab
              key={pendingSO ? (pendingSO.documentNumber || pendingSO.documentId || Date.now()) : 'default'}
              darkMode={darkMode}
              isAdmin={isAdmin}
              initialQuotation={pendingSO ?? undefined}
              onLinkToDI={handleSOtoDI}
              onLinkToBalanceInvoice={handleSOtoBalanceInvoice}
            />
```

แทนด้วย:
```tsx
            <SOTab
              key={pendingSO ? (pendingSO.documentNumber || pendingSO.documentId || Date.now()) : 'default'}
              darkMode={darkMode}
              isAdmin={isAdmin}
              initialQuotation={pendingSO ?? undefined}
              onLinkToDI={handleSOtoDI}
              onLinkToBalanceInvoice={handleSOtoBalanceInvoice}
              onNavigateToDI={handleNavigateToDI}
              onNavigateToInvoice={handleNavigateToInvoice}
            />
```

- [ ] **Step 10: ตรวจสอบ TypeScript ไม่มี error (ทั้ง frontend)**

```bash
cd /home/po/DocKey/frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: ไม่มี error ใหม่

- [ ] **Step 11: Commit**

```bash
cd /home/po/DocKey && git add frontend/src/pages/documents/SOTab.tsx frontend/src/pages/documents/SalesDocuments.tsx
git commit -m "$(cat <<'EOF'
feat: show workflow status (DI/DR/Invoice/Receipt) in SO view mode with navigation

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Manual Verification (หลังทำครบทุก task)

1. รัน backend: `cd /home/po/DocKey/backend && npm run dev`
2. รัน frontend: `cd /home/po/DocKey/frontend && npm run dev`
3. สร้าง SO ใหม่ → confirm → สร้าง DI → กด view SO
   - ตรวจสอบ section "สถานะการดำเนินการ" แสดง
   - แถว DI แสดง document number, status, % / ฿
   - แถว "รอรับมัดจำ" แสดง (ยังไม่มี DR)
   - ปุ่ม "เปิด →" ใน DI row ทำงาน → สลับไปแท็บ deposit_invoice และเปิด DI นั้น
4. สร้าง DR → กลับมา view SO
   - แถว DR แสดงแทน "รอรับมัดจำ"
5. สร้าง Balance Invoice → กลับมา view SO
   - แถว Invoice แสดง
   - ปุ่ม "เปิด →" ใน Invoice row ทำงาน → สลับไปแท็บ invoice และเปิด Invoice นั้น
6. สร้าง Receipt → กลับมา view SO
   - แถว Receipt แสดง
7. SO ที่ไม่มี DI เลย: section ไม่แสดง

---

## Self-Review Checklist

**Spec coverage:**
- [x] Req 1: แสดงเฉพาะ view mode — Task 3 Step 5 `mode !== 'view'` guard
- [x] Req 2: แสดงเมื่อมีอย่างน้อย 1 field — Task 3 Step 6 `(workflowStatus.di || workflowStatus.dr || workflowStatus.invoice || workflowStatus.receipt)`
- [x] Req 3: 4 ประเภทเอกสาร — Task 1 เพิ่ม 4 parallel queries; Task 3 render 4 rows
- [x] Req 4: เอกสารที่ไม่มี: ไม่แสดง — conditional rendering `{workflowStatus.di && (...)}` etc.
- [x] Req 5: DI มีแต่ DR ไม่มี: แถว "รอรับมัดจำ" — Task 3 Step 6 `{workflowStatus.di && !workflowStatus.dr && (...)}`
- [x] Req 6: fetch เฉพาะ enter view mode — Task 3 Step 5 useEffect depends on `[mode, viewing?.id]`
- [x] Req 7: DI row มีปุ่ม "เปิด →" → deposit_invoice tab — Task 3 Step 8 `handleNavigateToDI`
- [x] Req 8: Invoice row มีปุ่ม "เปิด →" → invoice tab — Task 3 Step 8 `handleNavigateToInvoice`
- [x] Req 9: DR และ Receipt ไม่มีปุ่ม — ไม่มีปุ่มใน DR/Receipt rows

**No placeholders:** ทุก step มี code จริง ไม่มี TBD/TODO

**Type consistency:** `SOWorkflowStatus` defined ใน Task 2, imported ใน Task 3; `fetchSOWorkflowStatus(soId: string)` defined ใน Task 2, called ใน Task 3 Step 5 — consistent
