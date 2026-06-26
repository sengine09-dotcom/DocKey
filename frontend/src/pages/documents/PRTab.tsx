import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { showAppAlert, showAppConfirm } from '../../services/dialogService';
import purchaseService, { PRPayload } from '../../services/purchaseService';
import codeService from '../../services/codeService';
import ProductSelectionModal from '../../components/ProductSelectionModal';
import VendorPickerModal from '../../components/VendorPickerModal';

const PR_STATUS_OPTIONS = ['All', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CONVERTED'];

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'รออนุมัติ',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ปฏิเสธ',
  CONVERTED: 'แปลงเป็น PO',
};

const emptyForm = (): PRPayload => ({
  title: '',
  vendorCode: '',
  requiredDate: '',
  remark: '',
  items: [{ description: '', qty: 1, unit: 'ชิ้น', estimatedPrice: 0, productCode: '', remark: '' }],
});

interface Props {
  darkMode: boolean;
  isAdmin: boolean;
}

export default function PRTab({ darkMode, isAdmin }: Props) {
  const [prs, setPrs] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [mode, setMode] = useState<'list' | 'create' | 'edit' | 'view'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);
  const [form, setForm] = useState<PRPayload>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);

  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const sectionCard = `rounded-2xl border p-5 shadow-sm ${darkMode ? 'border-gray-700 bg-gray-900/80' : 'border-gray-200 bg-white'}`;
  const inputCls = `w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition ${darkMode ? 'bg-gray-800 text-white placeholder-gray-400 border-gray-600 focus:border-gray-400' : 'bg-white text-gray-900 focus:border-gray-400'}`;
  const labelCls = `text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`;

  useEffect(() => { void load(); }, []);

  const productsLoadedRef = useRef(false);
  const loadProducts = useCallback(async () => {
    if (productsLoadedRef.current) return;
    productsLoadedRef.current = true;
    const res = await codeService.getAll('product');
    setProducts(res?.data?.data || []);
  }, []);

  const load = async () => {
    setIsLoading(true);
    try {
      const [prRes, vendorRes] = await Promise.allSettled([
        purchaseService.pr.getAll(),
        codeService.getAll('vendor'),
      ]);
      if (prRes.status === 'fulfilled') setPrs(prRes.value.data?.data || []);
      if (vendorRes.status === 'fulfilled') setVendors(vendorRes.value.data?.data || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (mode !== 'list') {
      window.requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }, [mode]);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return prs.filter((r) => {
      const matchKw = !kw || [r.prNumber, r.title, r.vendorCode, r.status, r.remark]
        .some((v) => String(v ?? '').toLowerCase().includes(kw));
      const matchStatus = statusFilter === 'All' || r.status === statusFilter;
      return matchKw && matchStatus;
    });
  }, [prs, search, statusFilter]);

  const vendorName = (code: string) => {
    const v = vendors.find((x) => x.vendorCode === code);
    return v ? v.name || code : code || '-';
  };

  const vendorLabel = (code: string) => {
    const v = vendors.find((x) => x.vendorCode === code);
    return v ? `${code} - ${v.name || code}` : code || '-';
  };

  const totalEstimated = (pr: any) =>
    (pr.items || []).reduce((s: number, i: any) => s + Number(i.qty || 0) * Number(i.estimatedPrice || 0), 0);

  const formatCurrency = (n: number) =>
    n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatDate = (d: any) =>
    d ? new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const StatusBadge = ({ status }: { status: string }) => {
    const tone =
      status === 'APPROVED' || status === 'CONVERTED'
        ? (darkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-100 text-green-700')
        : status === 'REJECTED'
          ? (darkMode ? 'bg-red-500/15 text-red-300' : 'bg-red-100 text-red-700')
          : status === 'PENDING_APPROVAL'
            ? (darkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-700')
            : (darkMode ? 'bg-gray-500/15 text-gray-300' : 'bg-gray-100 text-gray-600');
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{STATUS_LABEL[status] || status}</span>;
  };

  // ── Actions ──────────────────────────────────────────────────────────────────
  const openCreate = () => { void loadProducts(); setForm(emptyForm()); setEditingId(null); setMode('create'); };

  const openEdit = (pr: any) => {
    void loadProducts();
    setForm({
      title: pr.title || '',
      vendorCode: pr.vendorCode || '',
      requiredDate: pr.requiredDate ? pr.requiredDate.slice(0, 10) : '',
      remark: pr.remark || '',
      items: (pr.items || []).map((i: any) => ({
        productCode: i.productCode || '',
        description: i.description || '',
        qty: Number(i.qty),
        unit: i.unit || '',
        estimatedPrice: Number(i.estimatedPrice),
        remark: i.remark || '',
      })),
    });
    setEditingId(pr.id);
    setMode('edit');
  };

  const openView = (pr: any) => { setViewing(pr); setMode('view'); };
  const backToList = () => { setMode('list'); setEditingId(null); setViewing(null); };

  const handleSave = async () => {
    if (!form.title.trim()) {
      await showAppAlert({ title: 'ข้อผิดพลาด', message: 'กรุณากรอกชื่อใบขอซื้อ', tone: 'warning' }); return;
    }
    if (form.items.length === 0 || form.items.every((i) => !i.description.trim())) {
      await showAppAlert({ title: 'ข้อผิดพลาด', message: 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ', tone: 'warning' }); return;
    }
    const payload: PRPayload = { ...form, items: form.items.filter((i) => i.description.trim()) };
    setIsSaving(true);
    try {
      let saved: any;
      if (editingId) {
        const res = await purchaseService.pr.update(editingId, payload);
        saved = res.data.data;
        setPrs((prev) => prev.map((p) => p.id === editingId ? saved : p));
      } else {
        const res = await purchaseService.pr.create(payload);
        saved = res.data.data;
        setPrs((prev) => [saved, ...prev]);
      }
      setEditingId(null);
      setViewing(saved);
      setMode('view');
    } catch {
      await showAppAlert({ title: 'บันทึกไม่สำเร็จ', message: 'เกิดข้อผิดพลาด กรุณาลองใหม่', tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (pr: any) => {
    const ok = await showAppConfirm({ title: 'ลบใบขอซื้อ', message: `ลบ ${pr.prNumber}?\n\nไม่สามารถกู้คืนได้`, confirmText: 'ลบ', cancelText: 'ยกเลิก', tone: 'danger' });
    if (!ok) return;
    try {
      await purchaseService.pr.delete(pr.id);
      setPrs((prev) => prev.filter((p) => p.id !== pr.id));
    } catch {
      await showAppAlert({ title: 'ลบไม่สำเร็จ', message: 'ไม่สามารถลบเอกสารได้', tone: 'danger' });
    }
  };

  const handleSubmit = async (pr: any) => {
    const ok = await showAppConfirm({ title: 'ส่งขออนุมัติ', message: `ส่ง ${pr.prNumber} ขออนุมัติ?\n\nหลังจากส่งแล้วจะไม่สามารถแก้ไขได้`, confirmText: 'ส่ง', cancelText: 'ยกเลิก', tone: 'warning' });
    if (!ok) return;
    try {
      const res = await purchaseService.pr.submit(pr.id);
      setPrs((prev) => prev.map((p) => p.id === pr.id ? res.data.data : p));
      if (mode === 'view') setViewing(res.data.data);
    } catch (e: any) {
      await showAppAlert({ title: 'ส่งไม่สำเร็จ', message: e?.response?.data?.message || 'เกิดข้อผิดพลาด', tone: 'danger' });
    }
  };

  const handleApprove = async (pr: any) => {
    const ok = await showAppConfirm({ title: 'อนุมัติ PR', message: `อนุมัติ ${pr.prNumber}?`, confirmText: 'อนุมัติ', cancelText: 'ยกเลิก', tone: 'warning' });
    if (!ok) return;
    try {
      const res = await purchaseService.pr.approve(pr.id);
      setPrs((prev) => prev.map((p) => p.id === pr.id ? res.data.data : p));
      if (mode === 'view') setViewing(res.data.data);
    } catch (e: any) {
      await showAppAlert({ title: 'ไม่สำเร็จ', message: e?.response?.data?.message || 'เกิดข้อผิดพลาด', tone: 'danger' });
    }
  };

  const handleReject = async () => {
    if (!showRejectModal) return;
    try {
      const res = await purchaseService.pr.reject(showRejectModal, rejectReason);
      setPrs((prev) => prev.map((p) => p.id === showRejectModal ? res.data.data : p));
      if (mode === 'view' && viewing?.id === showRejectModal) setViewing(res.data.data);
    } catch (e: any) {
      await showAppAlert({ title: 'ไม่สำเร็จ', message: e?.response?.data?.message || 'เกิดข้อผิดพลาด', tone: 'danger' });
    } finally {
      setShowRejectModal(null);
      setRejectReason('');
    }
  };

  // ── Item helpers ─────────────────────────────────────────────────────────────
  const setItem = (idx: number, key: string, value: any) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [key]: value } : it) }));

  const addItem = () =>
    setForm((f) => ({ ...f, items: [...f.items, { description: '', qty: 1, unit: 'ชิ้น', estimatedPrice: 0, productCode: '', remark: '' }] }));

  const removeItem = (idx: number) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const openProductModal = (idx: number) => {
    setSelectedItemIndex(idx);
    setProductModalOpen(true);
  };

  const handleProductSelect = (product: any) => {
    if (selectedItemIndex === null) return;
    const idx = selectedItemIndex;
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) =>
        i === idx
          ? {
              ...it,
              productCode: product.productCode || '',
              description: product.productName || product.name || product.productCode || it.description,
              unit: product.unit || it.unit || '',
              // product.price = selling price, product.cost = cost price; use cost for PR estimated
              estimatedPrice: Number(product.cost || product.price || product.sellingPrice || 0),
            }
          : it,
      ),
    }));
  };

  const formTotal = form.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.estimatedPrice) || 0), 0);

  // ── CREATE / EDIT form ───────────────────────────────────────────────────────
  if (mode === 'create' || mode === 'edit') {
    const editingPr = editingId ? prs.find((p) => p.id === editingId) : null;
    const formVendorName = form.vendorCode ? vendorName(form.vendorCode) : '-';
    const validItemCount = form.items.filter((i) => i.description.trim()).length;

    return (
      <>
      <div ref={formRef} className={`rounded-2xl border shadow-sm ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>

        {/* ── Top bar ── */}
        <div className={`rounded-t-2xl border-b px-6 py-4 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                Purchase Requisition
              </p>
              <h3 className={`mt-1 text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {mode === 'create' ? 'สร้างใบขอซื้อ' : `แก้ไข ${editingPr?.prNumber || ''}`}
              </h3>
              <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                เอกสารขอซื้อสินค้า/บริการ รอรับการอนุมัติก่อนจัดซื้อ
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                {mode === 'edit' ? 'Edit Mode' : 'Create Mode'}
              </span>
              <button type="button" onClick={backToList}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                ← กลับ
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">

          {/* ── Overview banner ── */}
          <div className={`overflow-hidden rounded-2xl border ${darkMode ? 'border-orange-500/30 bg-gradient-to-r from-slate-900 via-orange-950/40 to-slate-900' : 'border-orange-200 bg-gradient-to-r from-orange-50 via-white to-amber-50'}`}>
            <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                  PR Overview
                </p>
                <div>
                  <h4 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>PURCHASE REQUISITION</h4>
                  <p className={`mt-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    กรอกข้อมูลให้ครบก่อนบันทึกและส่งขออนุมัติ
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-white/10 text-white' : 'bg-white text-orange-700 border border-orange-200'}`}>
                    {mode === 'edit' ? `Doc: ${editingPr?.prNumber || ''}` : 'New PR — Auto Number'}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-gray-500/15 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                    Status: Draft
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:min-w-[280px]">
                <div className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-200' : 'text-orange-700'}`}>Vendor</p>
                  <p className={`mt-2 text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formVendorName}</p>
                </div>
                <div className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-200' : 'text-orange-700'}`}>Required Date</p>
                  <p className={`mt-2 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {form.requiredDate ? formatDate(form.requiredDate) : '-'}
                  </p>
                </div>
                <div className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-200' : 'text-orange-700'}`}>รายการ</p>
                  <p className={`mt-2 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{validItemCount} รายการ</p>
                </div>
                <div className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-200' : 'text-orange-700'}`}>Estimated Total</p>
                  <p className={`mt-2 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>฿{formatCurrency(formTotal)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section cards ── */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

            {/* Document Info */}
            <div className={sectionCard}>
              <div className="mb-4">
                <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted}`}>ข้อมูลเอกสาร</p>
                <h4 className={`mt-1 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Document Information</h4>
              </div>
              <div className="space-y-4">
                <label className="block space-y-1.5">
                  <span className={labelCls}>ชื่อ / เรื่องที่ขอซื้อ <span className="text-red-500">*</span></span>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="เช่น ขอซื้ออุปกรณ์สำนักงาน"
                    className={inputCls}
                  />
                </label>
                <div className="space-y-1.5">
                  <span className={labelCls}>Vendor ที่ต้องการ (ถ้ามี)</span>
                  <div className="flex gap-2">
                    <div className={`flex-1 rounded-lg border px-3 py-2 text-sm min-h-[38px] flex items-center ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}>
                      {form.vendorCode ? (
                        <span>
                          <span className={`font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{form.vendorCode}</span>
                          {' — '}
                          <span>{vendorName(form.vendorCode)}</span>
                        </span>
                      ) : (
                        <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>-- ไม่ระบุ --</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setVendorModalOpen(true)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${darkMode ? 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'}`}
                      title="เลือก Vendor"
                    >
                      ...
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Timing & Notes */}
            <div className={sectionCard}>
              <div className="mb-4">
                <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted}`}>กำหนดการ</p>
                <h4 className={`mt-1 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Timing & Notes</h4>
              </div>
              <div className="space-y-4">
                <label className="block space-y-1.5">
                  <span className={labelCls}>วันที่ต้องการ</span>
                  <input
                    type="date"
                    value={form.requiredDate}
                    onChange={(e) => setForm((f) => ({ ...f, requiredDate: e.target.value }))}
                    className={inputCls}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className={labelCls}>หมายเหตุ</span>
                  <textarea
                    value={form.remark}
                    onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
                    rows={3}
                    placeholder="รายละเอียดเพิ่มเติม..."
                    className={`${inputCls} resize-none`}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* ── Items section ── */}
          <div className={`overflow-hidden rounded-2xl border shadow-sm ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
            <div className={`flex items-center justify-between border-b px-5 py-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted}`}>Line Items</p>
                <h4 className={`mt-1 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>รายการสินค้า / บริการ</h4>
              </div>
              <div className="flex items-center gap-3">
                <div className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-white/5 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                  {form.items.length} รายการ
                </div>
                <button type="button" onClick={addItem}
                  className={`rounded-lg border border-dashed px-3 py-1.5 text-xs font-semibold transition ${darkMode ? 'border-orange-500/50 text-orange-400 hover:bg-orange-500/10' : 'border-orange-400 text-orange-600 hover:bg-orange-50'}`}>
                  + เพิ่มรายการ
                </button>
              </div>
            </div>

            {/* Column header */}
            <div
              className={`grid px-5 py-3 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-50 text-gray-600'}`}
              style={{ gridTemplateColumns: '36px 150px minmax(180px,1fr) 72px 72px 130px 44px' }}
            >
              <div>#</div>
              <div>สินค้า</div>
              <div>รายละเอียด</div>
              <div className="text-right">จำนวน</div>
              <div>หน่วย</div>
              <div className="text-right">ราคา/หน่วย</div>
              <div />
            </div>

            {/* Rows */}
            {form.items.map((item, idx) => (
              <div
                key={idx}
                className={`grid items-center gap-2 px-5 py-3 ${darkMode ? 'border-t border-gray-700 bg-gray-900' : 'border-t border-gray-100 bg-white'}`}
                style={{ gridTemplateColumns: '36px 150px minmax(180px,1fr) 72px 72px 130px 44px' }}
              >
                <div className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>{idx + 1}</div>
                <button
                  type="button"
                  onClick={() => openProductModal(idx)}
                  className={`rounded-lg border px-3 py-1.5 text-left text-xs font-medium transition truncate ${darkMode ? 'border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20' : 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100'}`}
                >
                  {item.productCode || 'เลือกสินค้า...'}
                </button>
                <input
                  value={item.description}
                  onChange={(e) => setItem(idx, 'description', e.target.value)}
                  placeholder="ระบุรายละเอียด *"
                  className={`rounded-lg border px-3 py-1.5 text-sm outline-none transition ${darkMode ? 'bg-gray-800 text-white border-gray-600 placeholder-gray-500' : 'bg-white text-gray-900 border-gray-300'}`}
                />
                <input
                  type="number"
                  min={0}
                  value={item.qty}
                  onChange={(e) => setItem(idx, 'qty', e.target.value)}
                  className={`rounded-lg border px-2 py-1.5 text-sm text-right outline-none transition ${darkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
                />
                <input
                  value={item.unit || ''}
                  onChange={(e) => setItem(idx, 'unit', e.target.value)}
                  placeholder="ชิ้น"
                  className={`rounded-lg border px-2 py-1.5 text-sm outline-none transition ${darkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
                />
                <input
                  type="number"
                  min={0}
                  value={item.estimatedPrice}
                  onChange={(e) => setItem(idx, 'estimatedPrice', e.target.value)}
                  className={`rounded-lg border px-2 py-1.5 text-sm text-right outline-none transition ${darkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
                />
                <div className="flex justify-center">
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)}
                      className="rounded-md px-2 py-1 text-lg leading-none text-red-500 hover:bg-red-50 transition">
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Footer */}
            <div className={`flex items-center justify-between border-t px-5 py-3 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
              <button type="button" onClick={addItem}
                className={`rounded-lg border border-dashed px-3 py-2 text-xs font-semibold transition ${darkMode ? 'border-orange-500/50 text-orange-400 hover:bg-orange-500/10' : 'border-orange-400 text-orange-600 hover:bg-orange-50'}`}>
                + เพิ่มรายการ
              </button>
              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Items: {form.items.length}
              </div>
            </div>
          </div>

          {/* ── Summary stat cards ── */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className={`rounded-2xl border px-4 py-4 shadow-sm ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
              <p className={`text-xs ${textMuted}`}>Vendor</p>
              <p className={`mt-1 text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formVendorName}</p>
            </div>
            <div className={`rounded-2xl border px-4 py-4 shadow-sm ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
              <p className={`text-xs ${textMuted}`}>วันที่ต้องการ</p>
              <p className={`mt-1 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {form.requiredDate ? formatDate(form.requiredDate) : '-'}
              </p>
            </div>
            <div className={`rounded-2xl border px-4 py-4 shadow-sm ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
              <p className={`text-xs ${textMuted}`}>จำนวนรายการ</p>
              <p className={`mt-1 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{validItemCount} รายการ</p>
            </div>
            <div className={`rounded-2xl border px-4 py-4 shadow-sm ${darkMode ? 'border-orange-500/30 bg-orange-950/40' : 'border-orange-200 bg-orange-50'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                Estimated Total
              </p>
              <p className={`mt-2 text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                ฿{formatCurrency(formTotal)}
              </p>
              <p className={`mt-1 text-xs ${darkMode ? 'text-orange-200' : 'text-orange-700'}`}>ราคาประมาณทั้งหมด</p>
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-4">
            <button type="button" onClick={backToList}
              className="rounded-lg bg-gray-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700">
              ยกเลิก
            </button>
            <button type="button" onClick={handleSave} disabled={isSaving}
              className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:opacity-50">
              {isSaving ? 'กำลังบันทึก...' : 'บันทึก PR'}
            </button>
          </div>
        </div>
      </div>

      <ProductSelectionModal
        isOpen={productModalOpen}
        products={products}
        onSelect={(product) => {
          handleProductSelect(product);
          setProductModalOpen(false);
          setSelectedItemIndex(null);
        }}
        onClose={() => {
          setProductModalOpen(false);
          setSelectedItemIndex(null);
        }}
        darkMode={darkMode}
        isLoading={isLoading}
      />

      <VendorPickerModal
        isOpen={vendorModalOpen}
        vendors={vendors}
        selectedCode={form.vendorCode}
        onSelect={(v) => setForm((f) => ({ ...f, vendorCode: v.vendorCode }))}
        onClear={() => setForm((f) => ({ ...f, vendorCode: '' }))}
        onClose={() => setVendorModalOpen(false)}
        darkMode={darkMode}
      />
      </>
    );
  }

  // ── VIEW mode ────────────────────────────────────────────────────────────────
  if (mode === 'view' && viewing) {
    const vTotal = totalEstimated(viewing);
    return (
      <div ref={formRef} className="space-y-4">
        <div className={`rounded-2xl border shadow-sm ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>

          {/* Top bar */}
          <div className={`rounded-t-2xl border-b px-6 py-4 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                  Purchase Requisition
                </p>
                <h3 className={`mt-1 text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {viewing.prNumber}
                </h3>
                <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {viewing.title}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <StatusBadge status={viewing.status} />
                {viewing.status === 'DRAFT' && (
                  <>
                    <button type="button" onClick={() => openEdit(viewing)}
                      className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      แก้ไข
                    </button>
                    <button type="button" onClick={() => handleSubmit(viewing)}
                      className="rounded-xl px-3 py-1.5 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 transition">
                      ส่งขออนุมัติ
                    </button>
                  </>
                )}
                {viewing.status === 'PENDING_APPROVAL' && isAdmin && (
                  <>
                    <button type="button" onClick={() => handleApprove(viewing)}
                      className="rounded-xl px-3 py-1.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition">
                      อนุมัติ
                    </button>
                    <button type="button" onClick={() => { setShowRejectModal(viewing.id); setRejectReason(''); }}
                      className="rounded-xl px-3 py-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition">
                      ปฏิเสธ
                    </button>
                  </>
                )}
                {isAdmin && viewing.status !== 'DRAFT' && (
                  <button type="button" onClick={async () => { await handleDelete(viewing); backToList(); }}
                    className="rounded-xl px-3 py-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition">
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

            {/* Overview banner */}
            <div className={`overflow-hidden rounded-2xl border ${darkMode ? 'border-orange-500/30 bg-gradient-to-r from-slate-900 via-orange-950/40 to-slate-900' : 'border-orange-200 bg-gradient-to-r from-orange-50 via-white to-amber-50'}`}>
              <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>PR Overview</p>
                  <h4 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{viewing.prNumber}</h4>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{viewing.title}</p>
                  <div className="pt-1">
                    <StatusBadge status={viewing.status} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:min-w-[280px]">
                  <div className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-200' : 'text-orange-700'}`}>Vendor</p>
                    <p className={`mt-2 text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {vendorName(viewing.vendorCode) || '-'}
                    </p>
                  </div>
                  <div className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-200' : 'text-orange-700'}`}>Required Date</p>
                    <p className={`mt-2 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatDate(viewing.requiredDate)}
                    </p>
                  </div>
                  <div className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-200' : 'text-orange-700'}`}>รายการ</p>
                    <p className={`mt-2 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {viewing.items?.length || 0} รายการ
                    </p>
                  </div>
                  <div className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-orange-500/30 bg-orange-950/40' : 'border-orange-200 bg-orange-50'}`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>Estimated Total</p>
                    <p className={`mt-2 text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>฿{formatCurrency(vTotal)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Detail info grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'เลขที่ PR', value: viewing.prNumber },
                { label: 'Vendor', value: vendorLabel(viewing.vendorCode) },
                { label: 'วันที่ต้องการ', value: formatDate(viewing.requiredDate) },
                { label: 'สถานะ', value: <StatusBadge status={viewing.status} /> },
                { label: 'หมายเหตุ', value: viewing.remark || '-' },
                ...(viewing.status === 'APPROVED' ? [
                  { label: 'อนุมัติโดย', value: viewing.approvedBy || '-' },
                  { label: 'วันที่อนุมัติ', value: formatDate(viewing.approvedAt) },
                ] : []),
                ...(viewing.status === 'REJECTED' ? [
                  { label: 'ปฏิเสธโดย', value: viewing.rejectedBy || '-' },
                  { label: 'เหตุผล', value: viewing.rejectReason || '-' },
                ] : []),
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
                <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted}`}>Line Items</p>
                <h4 className={`mt-1 text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
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
                      <th className="px-5 py-3 text-right">รวม</th>
                      <th className="px-5 py-3 text-left">สถานะ PO</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                    {(viewing.items || []).map((item: any, idx: number) => (
                      <tr key={item.id} className={`transition-colors ${item.convertedToPo ? (darkMode ? 'bg-green-900/10' : 'bg-green-50/60') : (darkMode ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50')}`}>
                        <td className={`px-5 py-3 ${textMuted}`}>{idx + 1}</td>
                        <td className={`px-5 py-3 ${textMuted}`}>{item.productCode || '-'}</td>
                        <td className={`px-5 py-3 font-medium ${item.convertedToPo ? (darkMode ? 'text-gray-400 line-through' : 'text-gray-400 line-through') : (darkMode ? 'text-white' : 'text-gray-900')}`}>{item.description}</td>
                        <td className={`px-5 py-3 text-right ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {Number(item.qty).toLocaleString()}
                        </td>
                        <td className={`px-5 py-3 ${textMuted}`}>{item.unit || '-'}</td>
                        <td className={`px-5 py-3 text-right ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          ฿{formatCurrency(Number(item.estimatedPrice))}
                        </td>
                        <td className={`px-5 py-3 text-right font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          ฿{formatCurrency(Number(item.qty) * Number(item.estimatedPrice))}
                        </td>
                        <td className="px-5 py-3">
                          {item.convertedToPo
                            ? <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${darkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-100 text-green-700'}`}>
                                ✓ {item.poNumber || 'แปลงแล้ว'}
                              </span>
                            : <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                รอดำเนินการ
                              </span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={`font-bold ${darkMode ? 'bg-gray-700/30 text-white' : 'bg-orange-50 text-gray-900'}`}>
                      <td colSpan={7} className="px-5 py-3 text-right text-sm">ประมาณการรวม</td>
                      <td className={`px-5 py-3 text-right text-sm ${darkMode ? '' : 'text-orange-700'}`}>
                        ฿{formatCurrency(vTotal)}
                      </td>
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
    <>
      <div className={`rounded-2xl border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        {/* Toolbar */}
        <div className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex gap-3 flex-1 w-full">
            <input
              type="text"
              placeholder="ค้นหาใบขอซื้อ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`flex-1 rounded-xl border px-4 py-2 text-sm outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400'}`}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`rounded-xl border px-3 py-2 text-sm outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            >
              {PR_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s === 'All' ? 'ทุกสถานะ' : (STATUS_LABEL[s] || s)}</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={openCreate}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 transition whitespace-nowrap">
            + สร้าง PR
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className={`text-center py-16 ${textMuted}`}>
            <div className="text-3xl mb-3">⏳</div>
            <p className="text-sm">กำลังโหลด...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={`text-center py-16 ${textMuted}`}>
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm font-medium">{search ? 'ไม่พบใบขอซื้อที่ค้นหา' : 'ยังไม่มีใบขอซื้อ'}</p>
            {!search && (
              <button type="button" onClick={openCreate}
                className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 transition">
                + สร้าง PR
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                  <th className="px-5 py-3 text-left">เลขที่ PR</th>
                  <th className="px-5 py-3 text-left">ชื่อ / เรื่อง</th>
                  <th className="px-5 py-3 text-left">Vendor</th>
                  <th className="px-5 py-3 text-left">วันที่ต้องการ</th>
                  <th className="px-5 py-3 text-center">รายการ</th>
                  <th className="px-5 py-3 text-right">ประมาณ (฿)</th>
                  <th className="px-5 py-3 text-left">สถานะ</th>
                  <th className="px-5 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {filtered.map((pr) => (
                  <tr key={pr.id} className={`transition-colors ${darkMode ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'}`}>
                    <td className="px-5 py-3.5">
                      <button type="button" onClick={() => openView(pr)}
                        className={`font-semibold hover:underline ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                        {pr.prNumber}
                      </button>
                    </td>
                    <td className={`px-5 py-3.5 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{pr.title}</td>
                    <td className={`px-5 py-3.5 ${textMuted}`}>{vendorLabel(pr.vendorCode)}</td>
                    <td className={`px-5 py-3.5 ${textMuted}`}>{formatDate(pr.requiredDate)}</td>
                    <td className={`px-5 py-3.5 text-center ${textMuted}`}>{pr.items?.length || 0}</td>
                    <td className={`px-5 py-3.5 text-right font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatCurrency(totalEstimated(pr))}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={pr.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1.5 flex-wrap">
                        {pr.status === 'DRAFT' && (
                          <>
                            <button type="button" onClick={() => openEdit(pr)}
                              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                              แก้ไข
                            </button>
                            <button type="button" onClick={() => handleSubmit(pr)}
                              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 transition">
                              ส่ง
                            </button>
                            <button type="button" onClick={() => handleDelete(pr)}
                              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-red-900/40 text-red-300 hover:bg-red-800/60' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                              ลบ
                            </button>
                          </>
                        )}
                        {pr.status === 'PENDING_APPROVAL' && isAdmin && (
                          <>
                            <button type="button" onClick={() => handleApprove(pr)}
                              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 transition">
                              อนุมัติ
                            </button>
                            <button type="button" onClick={() => { setShowRejectModal(pr.id); setRejectReason(''); }}
                              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition">
                              ปฏิเสธ
                            </button>
                          </>
                        )}
                        {isAdmin && pr.status !== 'DRAFT' && (
                          <button type="button" onClick={() => handleDelete(pr)}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-red-900/40 text-red-300 hover:bg-red-800/60' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                            ลบ
                          </button>
                        )}
                        <button type="button" onClick={() => openView(pr)}
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
            แสดง {filtered.length} จาก {prs.length} รายการ
            {filtered.length > 0 && (
              <span className="ml-3 font-semibold">
                รวมประมาณ ฿{formatCurrency(filtered.reduce((s, r) => s + totalEstimated(r), 0))}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`rounded-2xl border shadow-xl w-full max-w-md mx-4 p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className={`text-base font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>ปฏิเสธใบขอซื้อ</h3>
            <p className={`text-sm mb-4 ${textMuted}`}>ระบุเหตุผลการปฏิเสธ (ถ้ามี)</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="เหตุผล..."
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none resize-none mb-4 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowRejectModal(null)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                ยกเลิก
              </button>
              <button type="button" onClick={handleReject}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition">
                ยืนยันปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
