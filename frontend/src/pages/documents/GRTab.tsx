import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { showAppAlert, showAppConfirm } from '../../services/dialogService';
import purchaseService, { GRPayload } from '../../services/purchaseService';
import documentService from '../../services/documentService';
import codeService from '../../services/codeService';
import POPickerModal from '../../components/POPickerModal';

const GR_STATUS_OPTIONS = ['All', 'DRAFT', 'CONFIRMED'];

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'รับสินค้าแล้ว',
};

const formatDate = (d: any) =>
  d ? new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

const formatCurrency = (n: number | string) =>
  Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const getTodayStr = () => new Date().toISOString().slice(0, 10);

interface Props {
  darkMode: boolean;
  isAdmin: boolean;
}

export default function GRTab({ darkMode, isAdmin }: Props) {
  const [grs, setGrs] = useState<any[]>([]);
  const [poList, setPoList] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [mode, setMode] = useState<'list' | 'create' | 'edit' | 'view'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [poPickerOpen, setPoPickerOpen] = useState(false);

  // Form state
  const [selectedPoId, setSelectedPoId] = useState('');
  const [selectedPoNumber, setSelectedPoNumber] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [receivedDate, setReceivedDate] = useState(getTodayStr());
  const [remark, setRemark] = useState('');
  const [formItems, setFormItems] = useState<any[]>([]);
  // per-row S/N duplicate error messages (index → error string | null)
  const [snErrors, setSnErrors] = useState<Record<number, string | null>>({});

  const formRef = useRef<HTMLDivElement>(null);

  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const sectionCard = `rounded-2xl border p-5 shadow-sm ${darkMode ? 'border-gray-700 bg-gray-900/80' : 'border-gray-200 bg-white'}`;
  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${darkMode ? 'bg-gray-800 text-white placeholder-gray-400 border-gray-600 focus:border-gray-400' : 'bg-white text-gray-900 focus:border-gray-400 border-gray-300'}`;
  const labelCls = `text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`;

  useEffect(() => { void load(); }, []);

  const poListLoadedRef = useRef(false);
  const loadPoList = useCallback(async () => {
    if (poListLoadedRef.current) return;
    poListLoadedRef.current = true;
    const res = await documentService.getAll('purchase_order');
    setPoList(res?.data?.data || []);
  }, []);

  const load = async () => {
    setIsLoading(true);
    try {
      const [grRes, vendorRes] = await Promise.allSettled([
        purchaseService.gr.getAll(),
        codeService.getAll('vendor'),
      ]);
      if (grRes.status === 'fulfilled') setGrs(grRes.value.data?.data || []);
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
    return grs.filter((r) => {
      const matchKw = !kw || [r.grNumber, r.poNumber, r.vendorCode, r.status, r.remark]
        .some((v) => String(v ?? '').toLowerCase().includes(kw));
      const matchStatus = statusFilter === 'All' || r.status === statusFilter;
      return matchKw && matchStatus;
    });
  }, [grs, search, statusFilter]);

  const usedPoIds = useMemo(
    () => new Set(grs.filter((g) => g.id !== editingId).map((g) => g.poId as string)),
    [grs, editingId]
  );

  const vendorName = (code: string) => {
    const v = vendors.find((x) => x.vendorCode === code);
    return v ? v.name || code : code || '-';
  };

  const totalReceivedValue = (gr: any) =>
    (gr.items || []).reduce((s: number, i: any) => s + Number(i.receivedQty || 0) * Number(i.unitPrice || 0), 0);

  const StatusBadge = ({ status }: { status: string }) => {
    const tone =
      status === 'CONFIRMED'
        ? (darkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-100 text-green-700')
        : (darkMode ? 'bg-gray-500/15 text-gray-300' : 'bg-gray-100 text-gray-600');
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{STATUS_LABEL[status] || status}</span>;
  };

  // ── PO selection → auto-fill items ────────────────────────────────────────
  const handlePoSelect = (poId: string) => {
    const po = poList.find((p) => (p.documentId || p.id) === poId);
    if (!po) { setSelectedPoId(''); setSelectedPoNumber(''); setFormItems([]); return; }
    setSelectedPoId(poId);
    setSelectedPoNumber(po.documentNumber || '');
    setVendorCode(po.vendorCode || '');
    const poItems = (po.items || []).map((item: any) => ({
      productCode: item.productCode || '',
      description: item.productName || item.productCode || '',
      poQty: Number(item.quantity || 0),
      receivedQty: Number(item.quantity || 0),
      unit: item.unitID || '',
      unitPrice: Number(item.sellingPrice || item.cost || 0),
      remark: '',
      serialNumber: '',
    }));
    setSnErrors({});
    setFormItems(poItems.length > 0 ? poItems : [emptyItem()]);
  };

  const emptyItem = () => ({ productCode: '', description: '', poQty: 0, receivedQty: 0, unit: '', unitPrice: 0, remark: '', serialNumber: '' });

  // ── Actions ──────────────────────────────────────────────────────────────
  const openCreate = () => {
    void loadPoList();
    setSelectedPoId(''); setSelectedPoNumber(''); setVendorCode('');
    setReceivedDate(getTodayStr()); setRemark(''); setFormItems([emptyItem()]);
    setSnErrors({});
    setEditingId(null); setMode('create');
  };

  const openEdit = (gr: any) => {
    void loadPoList();
    setSelectedPoId(gr.poId || '');
    setSelectedPoNumber(gr.poNumber || '');
    setVendorCode(gr.vendorCode || '');
    setReceivedDate(gr.receivedDate ? gr.receivedDate.slice(0, 10) : getTodayStr());
    setRemark(gr.remark || '');
    setFormItems((gr.items || []).map((i: any) => ({
      productCode: i.productCode || '',
      description: i.description || '',
      poQty: Number(i.poQty),
      receivedQty: Number(i.receivedQty),
      unit: i.unit || '',
      unitPrice: Number(i.unitPrice),
      remark: i.remark || '',
      serialNumber: i.serialNumber || '',
    })));
    setSnErrors({});
    setEditingId(gr.id);
    setMode('edit');
  };

  const openView = (gr: any) => { setViewing(gr); setMode('view'); };
  const backToList = () => { setMode('list'); setEditingId(null); setViewing(null); };

  // ── S/N duplicate check on blur ────────────────────────────────────────────
  const handleSnBlur = (idx: number) => {
    const sn = (formItems[idx]?.serialNumber ?? '').trim();
    if (!sn) {
      setSnErrors((prev) => ({ ...prev, [idx]: null }));
      return;
    }
    const duplicate = formItems.findIndex(
      (item, i) => i !== idx && (item.serialNumber ?? '').trim() === sn
    );
    if (duplicate !== -1) {
      setSnErrors((prev) => ({
        ...prev,
        [idx]: `Serial Number นี้ถูกใช้ซ้ำในรายการที่ ${duplicate + 1}`,
      }));
    } else {
      setSnErrors((prev) => ({ ...prev, [idx]: null }));
    }
  };

  const handleSave = async () => {
    if (!selectedPoId || !selectedPoNumber) {
      await showAppAlert({ title: 'ข้อผิดพลาด', message: 'กรุณาเลือกใบสั่งซื้อ (PO)', tone: 'warning' }); return;
    }
    const validItems = formItems.filter((i) => i.description.trim() || i.productCode.trim());
    if (validItems.length === 0) {
      await showAppAlert({ title: 'ข้อผิดพลาด', message: 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ', tone: 'warning' }); return;
    }

    // Validate: every item with a productCode must have a non-empty serialNumber
    const missingSN = validItems
      .map((item, i) => ({ item, originalIdx: formItems.indexOf(item), displayIdx: i + 1 }))
      .filter(({ item }) => item.productCode.trim() && !(item.serialNumber ?? '').trim());
    if (missingSN.length > 0) {
      const lineNums = missingSN.map(({ displayIdx }) => displayIdx).join(', ');
      await showAppAlert({
        title: 'ข้อผิดพลาด',
        message: `กรุณากรอก Serial Number ให้ครบทุกรายการ (ขาดที่บรรทัด: ${lineNums})`,
        tone: 'warning',
      });
      return;
    }

    // Validate: no duplicate S/N values across items
    const snValues = validItems
      .filter((i) => i.productCode.trim())
      .map((i) => (i.serialNumber ?? '').trim());
    const dupSN = snValues.find((sn, idx) => snValues.indexOf(sn) !== idx);
    if (dupSN) {
      await showAppAlert({
        title: 'ข้อผิดพลาด',
        message: `Serial Number '${dupSN}' ถูกใช้ซ้ำในรายการ กรุณาตรวจสอบ`,
        tone: 'warning',
      });
      return;
    }
    const payload: GRPayload = {
      poId: selectedPoId,
      poNumber: selectedPoNumber,
      vendorCode: vendorCode || undefined,
      receivedDate: receivedDate || undefined,
      remark: remark || undefined,
      items: validItems,
    };
    setIsSaving(true);
    try {
      let saved: any;
      if (editingId) {
        const res = await purchaseService.gr.update(editingId, payload);
        saved = res.data?.data;
        setGrs((prev) => prev.map((g) => g.id === editingId ? saved : g));
      } else {
        const res = await purchaseService.gr.create(payload);
        saved = res.data?.data;
        setGrs((prev) => [saved, ...prev]);
      }
      setEditingId(null);
      setViewing(saved);
      setMode('view');
    } catch (err: any) {
      await showAppAlert({ title: 'บันทึกไม่สำเร็จ', message: err?.response?.data?.message || 'ไม่สามารถบันทึกได้', tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (gr: any) => {
    const isConfirmed = gr.status === 'CONFIRMED';
    const confirmed = await showAppConfirm({
      title: 'ลบใบรับสินค้า',
      message: isConfirmed
        ? `ต้องการลบ ${gr.grNumber} (ยืนยันแล้ว)?\n\nระบบจะยกเลิกสต็อกที่รับเข้าและรีเซ็ตสถานะ PO กลับเป็น Open\n\nไม่สามารถกู้คืนได้`
        : `ต้องการลบ ${gr.grNumber}?\n\nไม่สามารถกู้คืนได้`,
      confirmText: 'ลบ', cancelText: 'ยกเลิก', tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await purchaseService.gr.delete(gr.id);
      setGrs((prev) => prev.filter((g) => g.id !== gr.id));
      if (viewing?.id === gr.id) backToList();
    } catch (err: any) {
      await showAppAlert({ title: 'ลบไม่สำเร็จ', message: err?.response?.data?.message || 'ไม่สามารถลบได้', tone: 'danger' });
    }
  };

  const handleConfirm = async (gr: any) => {
    const confirmed = await showAppConfirm({
      title: 'ยืนยันการรับสินค้า',
      message: `ยืนยัน GR ${gr.grNumber}?\n\nระบบจะอัปเดตสต็อกสินค้าทันที และไม่สามารถแก้ไขได้อีก`,
      confirmText: 'ยืนยันรับสินค้า', cancelText: 'ยกเลิก', tone: 'warning',
    });
    if (!confirmed) return;
    setIsConfirming(true);
    try {
      const res = await purchaseService.gr.confirm(gr.id);
      const updated = res.data?.data;
      setGrs((prev) => prev.map((g) => g.id === gr.id ? updated : g));
      setViewing(updated);
      await showAppAlert({ title: 'รับสินค้าสำเร็จ', message: 'อัปเดตสต็อกสินค้าเรียบร้อยแล้ว', tone: 'success' });
    } catch (err: any) {
      await showAppAlert({ title: 'เกิดข้อผิดพลาด', message: err?.response?.data?.message || 'ไม่สามารถยืนยันได้', tone: 'danger' });
    } finally {
      setIsConfirming(false);
    }
  };

  const updateFormItem = (idx: number, field: string, value: any) => {
    setFormItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
    // clear S/N error for this row while user is typing
    if (field === 'serialNumber') {
      setSnErrors((prev) => ({ ...prev, [idx]: null }));
    }
  };

  // ── List view ──────────────────────────────────────────────────────────────
  if (mode === 'list') {
    return (
      <div className={`rounded-2xl border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        {/* Toolbar */}
        <div className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex gap-3 flex-1 w-full">
            <input
              type="text"
              placeholder="ค้นหาใบรับสินค้า..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`flex-1 rounded-xl border px-4 py-2 text-sm outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400'}`}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`rounded-xl border px-3 py-2 text-sm outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            >
              {GR_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === 'All' ? 'ทุกสถานะ' : STATUS_LABEL[s] || s}</option>)}
            </select>
          </div>
          <button type="button" onClick={openCreate}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition whitespace-nowrap">
            + สร้างใบรับสินค้า
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className={`text-center py-16 ${textMuted}`}><div className="text-3xl mb-3">⏳</div><p className="text-sm">กำลังโหลด...</p></div>
        ) : filtered.length === 0 ? (
          <div className={`text-center py-16 ${textMuted}`}>
            <div className="text-4xl mb-3">📥</div>
            <p className="text-sm font-medium">{search ? 'ไม่พบใบรับสินค้าที่ค้นหา' : 'ยังไม่มีใบรับสินค้า'}</p>
            {!search && (
              <button type="button" onClick={openCreate}
                className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition">
                + สร้างใบรับสินค้า
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                  <th className="px-5 py-3 text-left">เลขที่ GR</th>
                  <th className="px-5 py-3 text-left">อ้างอิง PO</th>
                  <th className="px-5 py-3 text-left">Vendor</th>
                  <th className="px-5 py-3 text-left">วันรับ</th>
                  <th className="px-5 py-3 text-right">มูลค่า (฿)</th>
                  <th className="px-5 py-3 text-left">สถานะ</th>
                  <th className="px-5 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {filtered.map((gr: any) => (
                  <tr key={gr.id} className={`transition-colors ${darkMode ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'}`}>
                    <td className="px-5 py-3.5">
                      <button type="button" onClick={() => openView(gr)}
                        className={`font-semibold hover:underline ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                        {gr.grNumber}
                      </button>
                    </td>
                    <td className={`px-5 py-3.5 font-medium ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>{gr.poNumber || '-'}</td>
                    <td className={`px-5 py-3.5 ${textMuted}`}>{gr.vendorCode ? `${gr.vendorCode} - ${vendorName(gr.vendorCode)}` : '-'}</td>
                    <td className={`px-5 py-3.5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{formatDate(gr.receivedDate)}</td>
                    <td className={`px-5 py-3.5 text-right font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      ฿{formatCurrency(totalReceivedValue(gr))}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={gr.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1.5 flex-wrap">
                        {gr.status === 'DRAFT' && (
                          <button type="button" onClick={() => openEdit(gr)}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                            แก้ไข
                          </button>
                        )}
                        {isAdmin && (
                          <button type="button" onClick={() => handleDelete(gr)}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-red-900/40 text-red-300 hover:bg-red-800/60' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                            ลบ
                          </button>
                        )}
                        <button type="button" onClick={() => openView(gr)}
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
            แสดง {filtered.length} จาก {grs.length} รายการ
          </div>
        )}
      </div>
    );
  }

  // ── View mode ──────────────────────────────────────────────────────────────
  if (mode === 'view' && viewing) {
    return (
      <div ref={formRef} className={`rounded-2xl border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        {/* Top bar */}
        <div className={`rounded-t-2xl border-b px-6 py-4 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${darkMode ? 'text-green-300' : 'text-green-700'}`}>Goods Receipt</p>
              <h3 className={`mt-1 text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{viewing.grNumber}</h3>
              <p className={`mt-0.5 text-sm ${textMuted}`}>อ้างอิง PO: {viewing.poNumber}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {viewing.status === 'DRAFT' && (
                <>
                  <button type="button" onClick={() => handleConfirm(viewing)} disabled={isConfirming}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition">
                    {isConfirming ? 'กำลังยืนยัน...' : '✓ ยืนยันรับสินค้า'}
                  </button>
                  <button type="button" onClick={() => openEdit(viewing)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    แก้ไข
                  </button>
                </>
              )}
              {(viewing.status === 'DRAFT' || isAdmin) && (
                <button type="button" onClick={() => handleDelete(viewing)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition">
                  ลบ
                </button>
              )}
              <button type="button" onClick={backToList}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                ← ย้อนกลับ
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Overview banner */}
          <div className={`overflow-hidden rounded-2xl border ${darkMode ? 'border-green-500/30 bg-gradient-to-r from-slate-900 via-green-950/40 to-slate-900' : 'border-green-200 bg-gradient-to-r from-green-50 via-white to-emerald-50'}`}>
            <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${darkMode ? 'text-green-300' : 'text-green-700'}`}>GR Overview</p>
                <h4 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{viewing.grNumber}</h4>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>อ้างอิง PO: <span className={`font-semibold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>{viewing.poNumber}</span></p>
                <div className="pt-1"><StatusBadge status={viewing.status} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:min-w-[300px]">
                {[
                  { label: 'Vendor', value: viewing.vendorCode ? `${viewing.vendorCode} - ${vendorName(viewing.vendorCode)}` : '-' },
                  { label: 'เลขที่ QU (Vendor)', value: (() => { const po = poList.find((p: any) => (p.documentId || p.id) === viewing.poId); return po?.vendorQuotationNo || '-'; })() },
                  { label: 'วันรับสินค้า', value: formatDate(viewing.receivedDate) },
                  { label: 'จำนวนรายการ', value: `${(viewing.items || []).length} รายการ` },
                  { label: 'มูลค่ารวม', value: `฿${formatCurrency(totalReceivedValue(viewing))}` },
                ].map((stat) => (
                  <div key={stat.label} className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-white/10 bg-white/5' : 'border-green-100 bg-white/80'}`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-green-200' : 'text-green-700'}`}>{stat.label}</p>
                    <p className={`mt-2 text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Items table — comparison PO qty vs received */}
          {(viewing.items || []).length > 0 && (
            <div className={`overflow-hidden rounded-2xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className={`px-5 py-4 border-b ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted}`}>รายการสินค้า</p>
                <h4 className={`mt-1 text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  ตรวจรับสินค้า ({viewing.items.length} รายการ)
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                      <th className="px-5 py-3 text-left w-10">#</th>
                      <th className="px-5 py-3 text-left">รหัสสินค้า</th>
                      <th className="px-5 py-3 text-left">รายละเอียด</th>
                      <th className="px-5 py-3 text-right">จำนวน PO</th>
                      <th className="px-5 py-3 text-right">รับจริง</th>
                      <th className="px-5 py-3 text-left">หน่วย</th>
                      <th className="px-5 py-3 text-right">ราคา/หน่วย</th>
                      <th className="px-5 py-3 text-right">รวม</th>
                      <th className="px-5 py-3 text-left">Serial Number</th>
                      <th className="px-5 py-3 text-left">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                    {viewing.items.map((item: any, idx: number) => {
                      const diff = Number(item.receivedQty) - Number(item.poQty);
                      const diffColor = diff < 0
                        ? (darkMode ? 'text-red-400' : 'text-red-600')
                        : diff > 0
                          ? (darkMode ? 'text-yellow-400' : 'text-yellow-600')
                          : (darkMode ? 'text-green-400' : 'text-green-600');
                      return (
                        <tr key={item.id || idx} className={`transition-colors ${darkMode ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}`}>
                          <td className={`px-5 py-3 ${textMuted}`}>{idx + 1}</td>
                          <td className={`px-5 py-3 ${textMuted}`}>{item.productCode || '-'}</td>
                          <td className={`px-5 py-3 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.description || '-'}</td>
                          <td className={`px-5 py-3 text-right ${textMuted}`}>{Number(item.poQty).toLocaleString()}</td>
                          <td className={`px-5 py-3 text-right font-semibold ${diffColor}`}>
                            {Number(item.receivedQty).toLocaleString()}
                            {diff !== 0 && <span className="text-[10px] ml-1">({diff > 0 ? '+' : ''}{diff})</span>}
                          </td>
                          <td className={`px-5 py-3 ${textMuted}`}>{item.unit || '-'}</td>
                          <td className={`px-5 py-3 text-right ${darkMode ? 'text-white' : 'text-gray-900'}`}>฿{formatCurrency(item.unitPrice)}</td>
                          <td className={`px-5 py-3 text-right font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            ฿{formatCurrency(Number(item.receivedQty) * Number(item.unitPrice))}
                          </td>
                          <td className={`px-5 py-3 text-xs font-mono ${item.serialNumber ? (darkMode ? 'text-orange-300' : 'text-orange-700') : textMuted}`}>
                            {item.serialNumber || '-'}
                          </td>
                          <td className={`px-5 py-3 text-xs ${textMuted}`}>{item.remark || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className={`font-bold ${darkMode ? 'bg-gray-700/30 text-white' : 'bg-green-50 text-gray-900'}`}>
                      <td colSpan={7} className="px-5 py-3 text-right text-sm">รวมทั้งหมด</td>
                      <td className={`px-5 py-3 text-right text-sm ${darkMode ? '' : 'text-green-700'}`}>
                        ฿{formatCurrency(totalReceivedValue(viewing))}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {viewing.remark && (
            <div className={sectionCard}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textMuted}`}>หมายเหตุ</p>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{viewing.remark}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Create / Edit form ─────────────────────────────────────────────────────
  return (
    <>
    <div ref={formRef} className={`rounded-2xl border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      {/* Top bar */}
      <div className={`rounded-t-2xl border-b px-6 py-4 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${darkMode ? 'text-green-300' : 'text-green-700'}`}>Goods Receipt</p>
            <h3 className={`mt-1 text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {mode === 'edit' ? `แก้ไขใบรับสินค้า` : 'สร้างใบรับสินค้า'}
            </h3>
          </div>
          <button type="button" onClick={backToList}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            ← ย้อนกลับ
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Header fields */}
        <div className={sectionCard}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-4 ${textMuted}`}>ข้อมูลหัวเอกสาร</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PO selector */}
            <div className="md:col-span-2">
              <label className={`mb-1 block ${labelCls}`}>เลขที่ใบสั่งซื้อ (PO) *</label>
              {mode === 'edit' ? (
                <input readOnly value={selectedPoNumber} className={`${inputCls} ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} cursor-not-allowed`} />
              ) : (
                <div className="flex gap-2">
                  <div className={`flex-1 rounded-lg border px-3 py-2 text-sm min-h-[38px] flex items-center ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}>
                    {selectedPoId ? (() => {
                      const po = poList.find((p: any) => (p.documentId || p.id) === selectedPoId);
                      return po ? (
                        <span className="flex items-center gap-3">
                          <span className={`font-semibold ${darkMode ? 'text-green-300' : 'text-green-700'}`}>{po.documentNumber}</span>
                          {po.vendorQuotationNo && <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>QU: {po.vendorQuotationNo}</span>}
                          {po.vendorCode && <span className={`text-xs ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{po.vendorCode} {vendorName(po.vendorCode)}</span>}
                        </span>
                      ) : <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>-- เลือก PO --</span>;
                    })() : (
                      <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>-- เลือก PO --</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPoPickerOpen(true)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${darkMode ? 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'}`}
                    title="เลือก PO"
                  >
                    ...
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className={`mb-1 block ${labelCls}`}>Vendor Code</label>
              <input readOnly value={vendorCode} className={`${inputCls} ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`} />
            </div>

            <div>
              <label className={`mb-1 block ${labelCls}`}>วันที่รับสินค้า</label>
              <input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className={inputCls} />
            </div>

            <div className="md:col-span-2">
              <label className={`mb-1 block ${labelCls}`}>หมายเหตุ</label>
              <textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)}
                className={`${inputCls} resize-none`} placeholder="หมายเหตุเพิ่มเติม..." />
            </div>
          </div>
        </div>

        {/* Items table */}
        <div className={`overflow-hidden rounded-2xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className={`px-5 py-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted}`}>รายการสินค้า</p>
              <h4 className={`mt-1 text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>ตรวจสอบและแก้ไขจำนวนรับจริง</h4>
            </div>
            <button type="button"
              onClick={() => setFormItems((prev) => [...prev, emptyItem()])}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              + เพิ่มรายการ
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                  <th className="px-3 py-3 text-left w-10">#</th>
                  <th className="px-3 py-3 text-left w-32">รหัสสินค้า</th>
                  <th className="px-3 py-3 text-left">รายละเอียด</th>
                  <th className="px-3 py-3 text-right w-24">จำนวน PO</th>
                  <th className="px-3 py-3 text-right w-28">รับจริง *</th>
                  <th className="px-3 py-3 text-left w-20">หน่วย</th>
                  <th className="px-3 py-3 text-right w-28">ราคา/หน่วย</th>
                  <th className="px-3 py-3 text-left w-40">Serial Number</th>
                  <th className="px-3 py-3 text-left w-32">หมายเหตุ</th>
                  <th className="px-3 py-3 w-10" />
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {formItems.map((item, idx) => {
                  const diff = Number(item.receivedQty) - Number(item.poQty);
                  const receivedCls = diff < 0 ? 'border-red-400 focus:border-red-500' : diff > 0 ? 'border-yellow-400 focus:border-yellow-500' : '';
                  return (
                    <tr key={idx} className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                      <td className={`px-3 py-2 text-center ${textMuted}`}>{idx + 1}</td>
                      <td className="px-3 py-2">
                        <input value={item.productCode} onChange={(e) => updateFormItem(idx, 'productCode', e.target.value)}
                          className={`w-full rounded border px-2 py-1.5 text-xs outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                          placeholder="รหัส" />
                      </td>
                      <td className="px-3 py-2">
                        <input value={item.description} onChange={(e) => updateFormItem(idx, 'description', e.target.value)}
                          className={`w-full rounded border px-2 py-1.5 text-xs outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                          placeholder="รายละเอียด" />
                      </td>
                      <td className={`px-3 py-2 text-right font-medium ${textMuted}`}>
                        {Number(item.poQty).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="0" value={item.receivedQty}
                          onChange={(e) => updateFormItem(idx, 'receivedQty', Number(e.target.value))}
                          className={`w-full rounded border px-2 py-1.5 text-xs text-right outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} ${receivedCls}`} />
                      </td>
                      <td className="px-3 py-2">
                        <input value={item.unit} onChange={(e) => updateFormItem(idx, 'unit', e.target.value)}
                          className={`w-full rounded border px-2 py-1.5 text-xs outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                          placeholder="หน่วย" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="0" value={item.unitPrice}
                          onChange={(e) => updateFormItem(idx, 'unitPrice', Number(e.target.value))}
                          className={`w-full rounded border px-2 py-1.5 text-xs text-right outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} />
                      </td>
                      <td className="px-3 py-2">
                        {item.productCode.trim() ? (
                          <div>
                            <input
                              type="text"
                              placeholder="สแกน / กรอก Serial Number"
                              value={item.serialNumber ?? ''}
                              onChange={(e) => updateFormItem(idx, 'serialNumber', e.target.value)}
                              onBlur={() => handleSnBlur(idx)}
                              className={`w-full rounded border px-2 py-1.5 text-xs font-mono outline-none transition focus:border-orange-400 ${snErrors[idx] ? 'border-red-400' : darkMode ? 'border-gray-600' : 'border-gray-300'} ${darkMode ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-white text-gray-900'}`}
                            />
                            {snErrors[idx] && (
                              <p className="mt-0.5 text-[10px] text-red-500">{snErrors[idx]}</p>
                            )}
                          </div>
                        ) : (
                          <span className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input value={item.remark} onChange={(e) => updateFormItem(idx, 'remark', e.target.value)}
                          className={`w-full rounded border px-2 py-1.5 text-xs outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                          placeholder="หมายเหตุ" />
                      </td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => setFormItems((prev) => prev.filter((_, i) => i !== idx))}
                          className={`rounded p-1 ${darkMode ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}>×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary footer */}
          {formItems.length > 0 && (
            <div className={`px-5 py-3 border-t text-sm flex justify-end ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex items-center gap-4">
                <span className={textMuted}>มูลค่ารวม:</span>
                <span className={`font-bold text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  ฿{formatCurrency(formItems.reduce((s, i) => s + Number(i.receivedQty || 0) * Number(i.unitPrice || 0), 0))}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className={`flex gap-4 text-xs ${textMuted}`}>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />รับน้อยกว่า PO</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />รับมากกว่า PO</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />ตรงตาม PO</span>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={backToList}
            className={`rounded-xl px-6 py-2.5 text-sm font-semibold transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            ยกเลิก
          </button>
          <button type="button" onClick={handleSave} disabled={isSaving}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition">
            {isSaving ? 'กำลังบันทึก...' : (mode === 'edit' ? 'บันทึกการแก้ไข' : 'บันทึกใบรับสินค้า')}
          </button>
        </div>
      </div>
    </div>

    <POPickerModal
      isOpen={poPickerOpen}
      poList={poList}
      usedPoIds={usedPoIds}
      vendors={vendors}
      selectedPoId={selectedPoId}
      onSelect={(po) => { handlePoSelect(po.documentId || po.id); setPoPickerOpen(false); }}
      onClose={() => setPoPickerOpen(false)}
      darkMode={darkMode}
    />
    </>
  );
}
