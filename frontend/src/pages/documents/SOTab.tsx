import { useEffect, useMemo, useRef, useState } from 'react';
import { showAppAlert, showAppConfirm } from '../../services/dialogService';
import soService, { SOPayload, SaleOrder } from '../../services/soService';
import codeService from '../../services/codeService';
import CustomerPickerModal from '../../components/CustomerPickerModal';
import ProductSelectionModal from '../../components/ProductSelectionModal';

const SO_STATUS_OPTIONS = ['All', 'DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'PARTIALLY_DELIVERED', 'DELIVERED', 'CANCELLED'];

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'ยืนยันแล้ว',
  IN_PROGRESS: 'กำลังดำเนินการ',
  PARTIALLY_DELIVERED: 'ส่งบางส่วน',
  DELIVERED: 'ส่งครบแล้ว',
  CANCELLED: 'ยกเลิก',
};

const STATUS_TONE: Record<string, [string, string]> = {
  DRAFT:                ['bg-gray-500/15 text-gray-300',   'bg-gray-100 text-gray-600'],
  CONFIRMED:            ['bg-blue-500/15 text-blue-300',   'bg-blue-100 text-blue-700'],
  IN_PROGRESS:          ['bg-amber-500/15 text-amber-300', 'bg-amber-100 text-amber-700'],
  PARTIALLY_DELIVERED:  ['bg-orange-500/15 text-orange-300','bg-orange-100 text-orange-700'],
  DELIVERED:            ['bg-green-500/15 text-green-300', 'bg-green-100 text-green-700'],
  CANCELLED:            ['bg-red-500/15 text-red-300',     'bg-red-100 text-red-700'],
};

const emptyItem = () => ({ productCode: '', description: '', qty: 1, unit: 'ชิ้น', unitPrice: 0, discount: 0, amount: 0, remark: '' });
const emptyForm = (): SOPayload => ({
  customerCode: '', customerName: '', salesPerson: '', soDate: new Date().toISOString().slice(0, 10),
  requiredDate: '', paymentTerm: '', remark: '', items: [emptyItem()],
});

interface Props { darkMode: boolean; isAdmin?: boolean; initialQuotation?: any; }

export default function SOTab({ darkMode, isAdmin = false, initialQuotation }: Props) {
  const [sos, setSos] = useState<SaleOrder[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [mode, setMode] = useState<'list' | 'create' | 'edit' | 'view'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<SaleOrder | null>(null);
  const [form, setForm] = useState<SOPayload>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const sectionCard = `rounded-2xl border p-5 shadow-sm ${darkMode ? 'border-gray-700 bg-gray-900/80' : 'border-gray-200 bg-white'}`;
  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${darkMode ? 'bg-gray-800 text-white placeholder-gray-400 border-gray-600 focus:border-gray-400' : 'bg-white text-gray-900 border-gray-300 focus:border-gray-400'}`;
  const labelCls = `text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`;

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (mode !== 'list') window.requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [mode]);
  useEffect(() => {
    if (!initialQuotation) return;
    const qNum = String(initialQuotation.documentNumber || '');
    const prefilled: SOPayload = {
      customerCode: initialQuotation.customer || '',
      customerName: initialQuotation.customerName || '',
      salesPerson: '',
      soDate: new Date().toISOString().slice(0, 10),
      requiredDate: '',
      paymentTerm: initialQuotation.paymentTerm || '',
      remark: qNum ? `อ้างอิงใบเสนอราคา: ${qNum}${initialQuotation.remark ? '\n' + initialQuotation.remark : ''}` : (initialQuotation.remark || ''),
      items: (initialQuotation.items || [])
        .filter((item: any) => item.productCode || item.productName)
        .map((item: any) => ({
          productCode: item.productCode || '',
          description: item.productName || item.productCode || '',
          qty: Number(item.quantity) || 1,
          unit: 'ชิ้น',
          unitPrice: Number(item.sellingPrice) || 0,
          discount: 0,
          amount: Number(item.totalSellingPrice) || 0,
          remark: '',
        })),
    };
    if (prefilled.items.length === 0) prefilled.items = [emptyItem()];
    setForm(prefilled);
    setMode('create');
  }, [initialQuotation]);

  const load = async () => {
    setIsLoading(true);
    try {
      const [soRes, custRes, prodRes] = await Promise.allSettled([
        soService.getAll(),
        codeService.getAll('customer'),
        codeService.getAll('product'),
      ]);
      if (soRes.status === 'fulfilled') setSos(soRes.value.data?.data || []);
      if (custRes.status === 'fulfilled') setCustomers(custRes.value.data?.data || []);
      if (prodRes.status === 'fulfilled') setProducts(prodRes.value.data?.data || []);
    } finally { setIsLoading(false); }
  };

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return sos.filter((r) => {
      const matchKw = !kw || [r.soNumber, r.customerCode, r.customerName, r.salesPerson, r.status, r.remark]
        .some((v) => String(v ?? '').toLowerCase().includes(kw));
      const matchStatus = statusFilter === 'All' || r.status === statusFilter;
      return matchKw && matchStatus;
    });
  }, [sos, search, statusFilter]);

  const totalAmount = (so: SaleOrder) =>
    (so.items || []).reduce((s, i) => s + Number(i.amount || 0), 0);

  const formatCurrency = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatDate = (d: any) => d ? new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const StatusBadge = ({ status }: { status: string }) => {
    const [dark, light] = STATUS_TONE[status] || STATUS_TONE.DRAFT;
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${darkMode ? dark : light}`}>{STATUS_LABEL[status] || status}</span>;
  };

  // ── Actions ──────────────────────────────────────────────────────────────────
  const openCreate = () => { setForm(emptyForm()); setEditingId(null); setMode('create'); };

  const openEdit = (so: SaleOrder) => {
    setForm({
      customerCode: so.customerCode || '',
      customerName: so.customerName || '',
      salesPerson: so.salesPerson || '',
      soDate: so.soDate ? so.soDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      requiredDate: so.requiredDate ? so.requiredDate.slice(0, 10) : '',
      paymentTerm: so.paymentTerm || '',
      remark: so.remark || '',
      items: (so.items || []).map((i) => ({
        productCode: i.productCode || '',
        description: i.description || '',
        qty: Number(i.qty),
        unit: i.unit || '',
        unitPrice: Number(i.unitPrice),
        discount: Number(i.discount),
        amount: Number(i.amount),
        remark: i.remark || '',
      })),
    });
    setEditingId(so.id);
    setMode('edit');
  };

  const openView = (so: SaleOrder) => { setViewing(so); setMode('view'); };
  const backToList = () => { setMode('list'); setEditingId(null); setViewing(null); };

  const handleSave = async () => {
    if (!form.customerName.trim()) {
      await showAppAlert({ title: 'ข้อผิดพลาด', message: 'กรุณาเลือกลูกค้า', tone: 'warning' }); return;
    }
    if (form.items.length === 0 || form.items.every((i) => !i.description.trim())) {
      await showAppAlert({ title: 'ข้อผิดพลาด', message: 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ', tone: 'warning' }); return;
    }
    const payload: SOPayload = { ...form, items: form.items.filter((i) => i.description.trim()) };
    setIsSaving(true);
    try {
      if (editingId) {
        const res = await soService.update(editingId, payload);
        setSos((prev) => prev.map((s) => s.id === editingId ? res.data.data : s));
      } else {
        const res = await soService.create(payload);
        setSos((prev) => [res.data.data, ...prev]);
      }
      backToList();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
      await showAppAlert({ title: 'บันทึกไม่สำเร็จ', message: msg, tone: 'danger' });
    } finally { setIsSaving(false); }
  };

  const handleDelete = async (so: SaleOrder) => {
    const ok = await showAppConfirm({ title: 'ลบ Sale Order', message: `ลบ ${so.soNumber}?\n\nไม่สามารถกู้คืนได้`, confirmText: 'ลบ', cancelText: 'ยกเลิก', tone: 'danger' });
    if (!ok) return;
    try {
      await soService.delete(so.id);
      setSos((prev) => prev.filter((s) => s.id !== so.id));
      if (mode === 'view') backToList();
    } catch {
      await showAppAlert({ title: 'ลบไม่สำเร็จ', message: 'ไม่สามารถลบเอกสารได้', tone: 'danger' });
    }
  };

  const handleConfirm = async (so: SaleOrder) => {
    const ok = await showAppConfirm({ title: 'ยืนยัน SO', message: `ยืนยัน ${so.soNumber}?\n\nหลังจากยืนยันจะไม่สามารถแก้ไขได้`, confirmText: 'ยืนยัน', cancelText: 'ยกเลิก', tone: 'warning' });
    if (!ok) return;
    try {
      const res = await soService.confirm(so.id);
      const updated = res.data.data as SaleOrder;
      setSos((prev) => prev.map((s) => s.id === so.id ? updated : s));
      if (mode === 'view') setViewing(updated);
    } catch (e: any) {
      await showAppAlert({ title: 'ไม่สำเร็จ', message: e?.response?.data?.message || 'เกิดข้อผิดพลาด', tone: 'danger' });
    }
  };

  const handleCancel = async (so: SaleOrder) => {
    const ok = await showAppConfirm({ title: 'ยกเลิก SO', message: `ยกเลิก ${so.soNumber}?`, confirmText: 'ยกเลิก SO', cancelText: 'ปิด', tone: 'danger' });
    if (!ok) return;
    try {
      const res = await soService.cancel(so.id);
      const updated = res.data.data as SaleOrder;
      setSos((prev) => prev.map((s) => s.id === so.id ? updated : s));
      if (mode === 'view') setViewing(updated);
    } catch (e: any) {
      await showAppAlert({ title: 'ไม่สำเร็จ', message: e?.response?.data?.message || 'เกิดข้อผิดพลาด', tone: 'danger' });
    }
  };

  // ── Item helpers ─────────────────────────────────────────────────────────────
  const recalcAmount = (qty: number, unitPrice: number, discount: number) =>
    Math.round(qty * unitPrice * (1 - discount / 100) * 100) / 100;

  const setItem = (idx: number, key: string, value: any) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => {
        if (i !== idx) return it;
        const updated = { ...it, [key]: value };
        if (['qty', 'unitPrice', 'discount'].includes(key)) {
          updated.amount = recalcAmount(
            key === 'qty' ? Number(value) : Number(updated.qty),
            key === 'unitPrice' ? Number(value) : Number(updated.unitPrice),
            key === 'discount' ? Number(value) : Number(updated.discount),
          );
        }
        return updated;
      }),
    }));

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (idx: number) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const handleProductSelect = (product: any) => {
    if (selectedItemIndex === null) return;
    const idx = selectedItemIndex;
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => {
        if (i !== idx) return it;
        const unitPrice = Number(product.price || product.sellingPrice || 0);
        const qty = Number(it.qty) || 1;
        const discount = Number(it.discount) || 0;
        return {
          ...it,
          productCode: product.productCode || '',
          description: product.productName || product.name || product.productCode || it.description,
          unit: product.unit || it.unit || '',
          unitPrice,
          amount: recalcAmount(qty, unitPrice, discount),
        };
      }),
    }));
  };

  const formTotal = form.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  // ── CREATE / EDIT form ───────────────────────────────────────────────────────
  if (mode === 'create' || mode === 'edit') {
    const editingSo = editingId ? sos.find((s) => s.id === editingId) : null;
    const validItemCount = form.items.filter((i) => i.description.trim()).length;

    return (
      <>
      <div ref={formRef} className={`rounded-2xl border shadow-sm ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>

        {/* Top bar */}
        <div className={`rounded-t-2xl border-b px-6 py-4 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>Sale Order</p>
              <h3 className={`mt-1 text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {mode === 'create' ? 'สร้างใบสั่งขาย' : `แก้ไข ${editingSo?.soNumber || ''}`}
              </h3>
            </div>
            <button type="button" onClick={backToList}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              ← กลับ
            </button>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">

          {/* Overview banner */}
          <div className={`overflow-hidden rounded-2xl border ${darkMode ? 'border-blue-500/30 bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900' : 'border-blue-200 bg-gradient-to-r from-blue-50 via-white to-sky-50'}`}>
            <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>SO Overview</p>
                <h4 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>SALE ORDER</h4>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-white/10 text-white' : 'bg-white text-blue-700 border border-blue-200'}`}>
                    {mode === 'edit' ? `Doc: ${editingSo?.soNumber || ''}` : 'New SO — Auto Number'}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-gray-500/15 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>Status: Draft</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:min-w-[280px]">
                {[
                  { label: 'ลูกค้า', value: form.customerName || '-' },
                  { label: 'Required Date', value: form.requiredDate ? formatDate(form.requiredDate) : '-' },
                  { label: 'รายการ', value: `${validItemCount} รายการ` },
                  { label: 'ยอดรวม', value: `฿${formatCurrency(formTotal)}` },
                ].map((card) => (
                  <div key={card.label} className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-white/10 bg-white/5' : 'border-blue-100 bg-white/80'}`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>{card.label}</p>
                    <p className={`mt-2 text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{card.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {/* Customer */}
            <div className={sectionCard}>
              <p className={`mb-3 text-xs font-semibold uppercase tracking-wide ${textMuted}`}>ข้อมูลลูกค้า</p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className={labelCls}>ลูกค้า <span className="text-red-500">*</span></span>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <input
                        value={form.customerName}
                        onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value, customerCode: '' }))}
                        placeholder="ระบุชื่อลูกค้า หรือกด ... เพื่อค้นหา"
                        className={inputCls}
                      />
                      {form.customerCode && (
                        <p className={`text-xs ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                          รหัส: {form.customerCode}
                        </p>
                      )}
                    </div>
                    <button type="button" onClick={() => setCustomerModalOpen(true)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${darkMode ? 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'}`}>
                      ...
                    </button>
                  </div>
                </div>
                <label className="block space-y-1.5">
                  <span className={labelCls}>พนักงานขาย</span>
                  <input value={form.salesPerson || ''} onChange={(e) => setForm((f) => ({ ...f, salesPerson: e.target.value }))}
                    placeholder="ชื่อพนักงานขาย" className={inputCls} />
                </label>
              </div>
            </div>

            {/* Dates & Notes */}
            <div className={sectionCard}>
              <p className={`mb-3 text-xs font-semibold uppercase tracking-wide ${textMuted}`}>กำหนดการ</p>
              <div className="space-y-4">
                <label className="block space-y-1.5">
                  <span className={labelCls}>วันที่ SO</span>
                  <input type="date" value={form.soDate || ''} onChange={(e) => setForm((f) => ({ ...f, soDate: e.target.value }))} className={inputCls} />
                </label>
                <label className="block space-y-1.5">
                  <span className={labelCls}>วันที่ต้องการรับสินค้า</span>
                  <input type="date" value={form.requiredDate || ''} onChange={(e) => setForm((f) => ({ ...f, requiredDate: e.target.value }))} className={inputCls} />
                </label>
                <label className="block space-y-1.5">
                  <span className={labelCls}>หมายเหตุ</span>
                  <textarea value={form.remark || ''} onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
                    rows={2} placeholder="รายละเอียดเพิ่มเติม..." className={`${inputCls} resize-none`} />
                </label>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className={`overflow-hidden rounded-2xl border shadow-sm ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
            <div className={`flex items-center justify-between border-b px-5 py-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h4 className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>รายการสินค้า</h4>
              <button type="button" onClick={addItem}
                className={`rounded-lg border border-dashed px-3 py-1.5 text-xs font-semibold transition ${darkMode ? 'border-blue-500/50 text-blue-400 hover:bg-blue-500/10' : 'border-blue-400 text-blue-600 hover:bg-blue-50'}`}>
                + เพิ่มรายการ
              </button>
            </div>

            {/* Header */}
            <div className={`grid px-5 py-3 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600'}`}
              style={{ gridTemplateColumns: '32px 140px minmax(160px,1fr) 70px 60px 110px 70px 36px' }}>
              <div>#</div><div>สินค้า</div><div>รายละเอียด</div>
              <div className="text-right">จำนวน</div><div>หน่วย</div>
              <div className="text-right">ราคา/หน่วย</div><div className="text-right">รวม</div><div />
            </div>

            {form.items.map((item, idx) => (
              <div key={idx}
                className={`grid items-center gap-2 px-5 py-3 ${darkMode ? 'border-t border-gray-700 bg-gray-900' : 'border-t border-gray-100 bg-white'}`}
                style={{ gridTemplateColumns: '32px 140px minmax(160px,1fr) 70px 60px 110px 70px 36px' }}>
                <div className={`text-sm font-semibold ${textMuted}`}>{idx + 1}</div>
                <button type="button" onClick={() => { setSelectedItemIndex(idx); setProductModalOpen(true); }}
                  className={`rounded-lg border px-3 py-1.5 text-left text-xs font-medium truncate transition ${darkMode ? 'border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20' : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                  {item.productCode || 'เลือกสินค้า...'}
                </button>
                <input value={item.description} onChange={(e) => setItem(idx, 'description', e.target.value)}
                  placeholder="ระบุรายละเอียด *"
                  className={`rounded-lg border px-3 py-1.5 text-sm outline-none transition ${darkMode ? 'bg-gray-800 text-white border-gray-600 placeholder-gray-500' : 'bg-white text-gray-900 border-gray-300'}`} />
                <input type="number" min={0} value={item.qty} onChange={(e) => setItem(idx, 'qty', e.target.value)}
                  className={`rounded-lg border px-2 py-1.5 text-sm text-right outline-none transition ${darkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`} />
                <input value={item.unit || ''} onChange={(e) => setItem(idx, 'unit', e.target.value)} placeholder="ชิ้น"
                  className={`rounded-lg border px-2 py-1.5 text-sm outline-none transition ${darkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`} />
                <input type="number" min={0} value={item.unitPrice} onChange={(e) => setItem(idx, 'unitPrice', e.target.value)}
                  className={`rounded-lg border px-2 py-1.5 text-sm text-right outline-none transition ${darkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`} />
                <div className={`text-sm text-right font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formatCurrency(Number(item.amount) || 0)}
                </div>
                <div className="flex justify-center">
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)}
                      className="rounded-md px-2 py-1 text-lg leading-none text-red-500 hover:bg-red-50 transition">×</button>
                  )}
                </div>
              </div>
            ))}

            <div className={`flex items-center justify-between border-t px-5 py-3 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
              <button type="button" onClick={addItem}
                className={`rounded-lg border border-dashed px-3 py-2 text-xs font-semibold transition ${darkMode ? 'border-blue-500/50 text-blue-400 hover:bg-blue-500/10' : 'border-blue-400 text-blue-600 hover:bg-blue-50'}`}>
                + เพิ่มรายการ
              </button>
              <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                ยอดรวม ฿{formatCurrency(formTotal)}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-4">
            <button type="button" onClick={backToList}
              className="rounded-lg bg-gray-600 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 transition">
              ยกเลิก
            </button>
            <button type="button" onClick={handleSave} disabled={isSaving}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-50">
              {isSaving ? 'กำลังบันทึก...' : 'บันทึก SO'}
            </button>
          </div>
        </div>
      </div>

      <CustomerPickerModal isOpen={customerModalOpen} customers={customers} selectedCode={form.customerCode || ''}
        onSelect={(c) => setForm((f) => ({ ...f, customerCode: c.customerCode, customerName: c.customerName }))}
        onClear={() => setForm((f) => ({ ...f, customerCode: '', customerName: '' }))}
        onClose={() => setCustomerModalOpen(false)} darkMode={darkMode} />

      <ProductSelectionModal isOpen={productModalOpen} products={products}
        onSelect={(p) => { handleProductSelect(p); setProductModalOpen(false); setSelectedItemIndex(null); }}
        onClose={() => { setProductModalOpen(false); setSelectedItemIndex(null); }}
        darkMode={darkMode} isLoading={isLoading} />
      </>
    );
  }

  // ── VIEW mode ────────────────────────────────────────────────────────────────
  if (mode === 'view' && viewing) {
    const vTotal = totalAmount(viewing);
    return (
      <div ref={formRef} className="space-y-4">
        <div className={`rounded-2xl border shadow-sm ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>

          {/* Top bar */}
          <div className={`rounded-t-2xl border-b px-6 py-4 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>Sale Order</p>
                <h3 className={`mt-1 text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{viewing.soNumber}</h3>
                <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{viewing.customerName}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <StatusBadge status={viewing.status} />
                {viewing.status === 'DRAFT' && (
                  <>
                    <button type="button" onClick={() => openEdit(viewing)}
                      className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      แก้ไข
                    </button>
                    <button type="button" onClick={() => handleConfirm(viewing)}
                      className="rounded-xl px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition">
                      ยืนยัน SO
                    </button>
                  </>
                )}
                {['DRAFT', 'CONFIRMED'].includes(viewing.status) && (
                  <button type="button" onClick={() => handleCancel(viewing)}
                    className="rounded-xl px-3 py-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition">
                    ยกเลิก
                  </button>
                )}
                {(viewing.status === 'DRAFT' || isAdmin) && (
                  <button type="button" onClick={() => handleDelete(viewing)}
                    className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${darkMode ? 'bg-red-900/40 text-red-300 hover:bg-red-800/60' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                    ลบ
                  </button>
                )}
                <button type="button" onClick={backToList}
                  className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  ปิด
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Detail info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'เลขที่ SO', value: viewing.soNumber },
                { label: 'ลูกค้า', value: `${viewing.customerCode ? viewing.customerCode + ' — ' : ''}${viewing.customerName}` },
                { label: 'พนักงานขาย', value: viewing.salesPerson || '-' },
                { label: 'วันที่ SO', value: formatDate(viewing.soDate) },
                { label: 'วันที่ต้องการรับ', value: formatDate(viewing.requiredDate) },
                { label: 'เงื่อนไขชำระ', value: viewing.paymentTerm || '-' },
                { label: 'สถานะ', value: <StatusBadge status={viewing.status} /> },
                { label: 'หมายเหตุ', value: viewing.remark || '-' },
              ].map((f: any) => (
                <div key={f.label}>
                  <p className={`text-xs uppercase tracking-wide ${textMuted}`}>{f.label}</p>
                  <div className={`mt-1 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{f.value}</div>
                </div>
              ))}
            </div>

            {/* Items table */}
            <div className={`overflow-hidden rounded-2xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className={`px-5 py-4 border-b ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                <h4 className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  รายการสินค้า ({viewing.items?.length || 0} รายการ)
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                      <th className="px-5 py-3 text-left w-10">#</th>
                      <th className="px-5 py-3 text-left">รหัสสินค้า</th>
                      <th className="px-5 py-3 text-left">รายละเอียด</th>
                      <th className="px-5 py-3 text-right">จำนวน</th>
                      <th className="px-5 py-3 text-left">หน่วย</th>
                      <th className="px-5 py-3 text-right">ราคา/หน่วย</th>
                      <th className="px-5 py-3 text-right">ส่วนลด%</th>
                      <th className="px-5 py-3 text-right">รวม</th>
                      <th className="px-5 py-3 text-left">สถานะ PR</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                    {(viewing.items || []).map((item, idx) => (
                      <tr key={item.id} className={item.convertedToPr ? (darkMode ? 'bg-green-900/10' : 'bg-green-50/60') : (darkMode ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50')}>
                        <td className={`px-5 py-3 ${textMuted}`}>{idx + 1}</td>
                        <td className={`px-5 py-3 ${textMuted}`}>{item.productCode || '-'}</td>
                        <td className={`px-5 py-3 font-medium ${item.convertedToPr ? 'text-gray-400 line-through' : (darkMode ? 'text-white' : 'text-gray-900')}`}>{item.description}</td>
                        <td className={`px-5 py-3 text-right ${darkMode ? 'text-white' : 'text-gray-900'}`}>{Number(item.qty).toLocaleString()}</td>
                        <td className={`px-5 py-3 ${textMuted}`}>{item.unit || '-'}</td>
                        <td className={`px-5 py-3 text-right ${darkMode ? 'text-white' : 'text-gray-900'}`}>฿{formatCurrency(Number(item.unitPrice))}</td>
                        <td className={`px-5 py-3 text-right ${textMuted}`}>{Number(item.discount) > 0 ? `${item.discount}%` : '-'}</td>
                        <td className={`px-5 py-3 text-right font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>฿{formatCurrency(Number(item.amount))}</td>
                        <td className="px-5 py-3">
                          {item.convertedToPr
                            ? <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${darkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-100 text-green-700'}`}>✓ {item.prNumber || 'แปลงแล้ว'}</span>
                            : <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>รอดำเนินการ</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={`font-bold ${darkMode ? 'bg-gray-700/30 text-white' : 'bg-blue-50 text-gray-900'}`}>
                      <td colSpan={8} className="px-5 py-3 text-right text-sm">ยอดรวมทั้งสิ้น</td>
                      <td className={`px-5 py-3 text-right text-sm ${darkMode ? '' : 'text-blue-700'}`}>฿{formatCurrency(vTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── LIST view ────────────────────────────────────────────────────────────────
  return (
    <div className={`rounded-2xl border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      {/* Toolbar */}
      <div className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
        <div className="flex gap-3 flex-1 w-full">
          <input type="text" placeholder="ค้นหาใบสั่งขาย..." value={search} onChange={(e) => setSearch(e.target.value)}
            className={`flex-1 rounded-xl border px-4 py-2 text-sm outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400'}`} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className={`rounded-xl border px-3 py-2 text-sm outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
            {SO_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === 'All' ? 'ทุกสถานะ' : (STATUS_LABEL[s] || s)}</option>)}
          </select>
        </div>
        <button type="button" onClick={openCreate}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition whitespace-nowrap">
          + สร้าง SO
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className={`text-center py-16 ${textMuted}`}><div className="text-3xl mb-3">⏳</div><p className="text-sm">กำลังโหลด...</p></div>
      ) : filtered.length === 0 ? (
        <div className={`text-center py-16 ${textMuted}`}>
          <div className="text-4xl mb-3">📦</div>
          <p className="text-sm font-medium">{search ? 'ไม่พบใบสั่งขายที่ค้นหา' : 'ยังไม่มีใบสั่งขาย'}</p>
          {!search && (
            <button type="button" onClick={openCreate}
              className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition">
              + สร้าง SO
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                <th className="px-5 py-3 text-left">เลขที่ SO</th>
                <th className="px-5 py-3 text-left">ลูกค้า</th>
                <th className="px-5 py-3 text-left">พนักงานขาย</th>
                <th className="px-5 py-3 text-left">วันที่ SO</th>
                <th className="px-5 py-3 text-left">ต้องการรับ</th>
                <th className="px-5 py-3 text-center">รายการ</th>
                <th className="px-5 py-3 text-right">ยอดรวม (฿)</th>
                <th className="px-5 py-3 text-left">สถานะ</th>
                <th className="px-5 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {filtered.map((so) => (
                <tr key={so.id} className={`transition-colors ${darkMode ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'}`}>
                  <td className="px-5 py-3.5">
                    <button type="button" onClick={() => openView(so)}
                      className={`font-semibold hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {so.soNumber}
                    </button>
                  </td>
                  <td className={`px-5 py-3.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    <div className="font-medium">{so.customerName}</div>
                    {so.customerCode && <div className={`text-xs ${textMuted}`}>{so.customerCode}</div>}
                  </td>
                  <td className={`px-5 py-3.5 ${textMuted}`}>{so.salesPerson || '-'}</td>
                  <td className={`px-5 py-3.5 ${textMuted}`}>{formatDate(so.soDate)}</td>
                  <td className={`px-5 py-3.5 ${textMuted}`}>{formatDate(so.requiredDate)}</td>
                  <td className={`px-5 py-3.5 text-center ${textMuted}`}>{so.items?.length || 0}</td>
                  <td className={`px-5 py-3.5 text-right font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatCurrency(totalAmount(so))}
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={so.status} /></td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1.5 flex-wrap">
                      {so.status === 'DRAFT' && (
                        <>
                          <button type="button" onClick={() => openEdit(so)}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                            แก้ไข
                          </button>
                          <button type="button" onClick={() => handleConfirm(so)}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition">
                            ยืนยัน
                          </button>
                        </>
                      )}
                      {(so.status === 'DRAFT' || isAdmin) && (
                        <button type="button" onClick={() => handleDelete(so)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-red-900/40 text-red-300 hover:bg-red-800/60' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                          ลบ
                        </button>
                      )}
                      {so.status === 'CONFIRMED' && (
                        <button type="button" onClick={() => handleCancel(so)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-red-900/40 text-red-300 hover:bg-red-800/60' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                          ยกเลิก
                        </button>
                      )}
                      <button type="button" onClick={() => openView(so)}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        ดู
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className={`px-5 py-3 border-t text-xs ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
          แสดง {filtered.length} จาก {sos.length} รายการ
          <span className="ml-3 font-semibold">รวม ฿{formatCurrency(filtered.reduce((s, r) => s + totalAmount(r), 0))}</span>
        </div>
      )}
    </div>
  );
}
