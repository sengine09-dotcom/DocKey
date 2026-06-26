import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/Layout/Layout';
import AllDocumentForm from '../../components/Documents/AllDocumentForm';
import useThemePreference from '../../hooks/useThemePreference';
import { showAppAlert, showAppConfirm } from '../../services/dialogService';
import documentService, { MainDocumentType } from '../../services/documentService';
import soService from '../../services/soService';
import purchaseService from '../../services/purchaseService';
import codeService from '../../services/codeService';
import PRTab from './PRTab';
import GRTab from './GRTab';
import SOToPOModal from '../../components/SOToPOModal';
import PRToPOModal from '../../components/PRToPOModal';
import {
  createEmptyCollections, DocumentsByType,
  getRecordKey, formatDate, formatCurrency, replaceRecord, loadAllDocuments, getRecordVendorLabel,
} from './documentShared';

type PurchaseTab = 'pr' | 'po' | 'gr';

const PO_TYPE: MainDocumentType = 'purchase_order';
const PO_STATUS_OPTIONS = ['All', 'Open', 'Approved', 'Ordered', 'Partial', 'Received', 'Completed', 'Cancelled', 'Closed'];

const TABS: { id: PurchaseTab; label: string; icon: string; desc: string }[] = [
  { id: 'pr', label: 'ใบขอซื้อ (PR)', icon: '📋', desc: 'Purchase Requisition — ขออนุมัติซื้อ' },
  { id: 'po', label: 'ใบสั่งซื้อ (PO)', icon: '📦', desc: 'Purchase Order — สั่งซื้อจาก Supplier' },
  { id: 'gr', label: 'ใบรับสินค้า (GR)', icon: '📥', desc: 'Goods Receipt — รับสินค้าเข้าคลัง' },
];

export default function PurchaseDocuments({ onNavigate = () => { }, currentPage = 'documents' }: any) {
  const [darkMode, setDarkMode] = useThemePreference();
  const [activeTab, setActiveTab] = useState<PurchaseTab>('pr');
  const [isAdmin, setIsAdmin] = useState(false);
  const [docs, setDocs] = useState<DocumentsByType>(createEmptyCollections());
  const [vendorCodes, setVendorCodes] = useState<any[]>([]);
  const [editorState, setEditorState] = useState<{ type: MainDocumentType; initialData: any } | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [soCount, setSoCount] = useState(0);
  const [prCount, setPrCount] = useState(0);
  const [grCount, setGrCount] = useState(0);
  const [soToPOOpen, setSoToPOOpen] = useState(false);
  const [pendingSOConversion, setPendingSOConversion] = useState<{ soId: string; itemIds: string[] } | null>(null);
  const [prToPOOpen, setPrToPOOpen] = useState(false);
  const [pendingPRConversion, setPendingPRConversion] = useState<{ prId: string; itemIds: string[] } | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const codesLoadedRef = useRef(false);
  const navigate = useNavigate();

  const loadCodes = useCallback(async () => {
    if (codesLoadedRef.current) return;
    codesLoadedRef.current = true;
    const vendorRes = await codeService.getAll('vendor');
    setVendorCodes(vendorRes?.data?.data || []);
  }, []);

  useEffect(() => {
    void axios.get('/api/auth/me').then((res) => {
      setIsAdmin(String(res.data?.user?.role || '').toLowerCase() === 'admin');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [d, soRes, prRes, grRes] = await Promise.allSettled([
          loadAllDocuments(),
          soService.getAll(),
          purchaseService.pr.getAll(),
          purchaseService.gr.getAll(),
        ]);
        if (d.status === 'fulfilled') setDocs(d.value);
        if (soRes.status === 'fulfilled') setSoCount((soRes.value?.data?.data || []).length);
        if (prRes.status === 'fulfilled') setPrCount((prRes.value?.data?.data || []).length);
        if (grRes.status === 'fulfilled') setGrCount((grRes.value?.data?.data || []).length);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!editorState) return;
    window.requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [editorState]);

  const reloadPOData = async () => {
    setIsLoading(true);
    try {
      const d = await loadAllDocuments();
      setDocs(d);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: PurchaseTab) => {
    setActiveTab(tab);
    setSelectedRecord(null);
    setEditorState(null);
    setSearch('');
    setStatusFilter('All');
    if (tab === 'po') void reloadPOData();
  };

  // ── PO logic ──────────────────────────────────────────────────────────────
  const poRecords = docs[PO_TYPE] || [];

  const getVendorDisplay = (record: any) => {
    const code = String(record?.vendorCode || '').trim();
    const matched = vendorCodes.find((v) => v.vendorCode === code);
    return matched ? `${code} - ${matched.name || matched.vendorCode}` : getRecordVendorLabel(record);
  };

  const filteredPoRecords = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return poRecords.filter((r) => {
      const matchKw = !kw || [r.documentNumber, r.title, r.vendorCode, r.supplierName, r.referenceNo, r.status, r.remark]
        .some((v) => String(v ?? '').toLowerCase().includes(kw));
      const matchStatus = statusFilter === 'All' || String(r.status || '').trim() === statusFilter;
      return matchKw && matchStatus;
    });
  }, [poRecords, search, statusFilter]);

  const handlePoCreate = () => { void loadCodes(); setSelectedRecord(null); setEditorState({ type: PO_TYPE, initialData: null }); };

  const handlePoView = async (record: any) => {
    void loadCodes();
    setEditorState(null);
    try {
      const id = record?.documentId || record?.id || record?.documentNumber;
      const res = await documentService.getById(PO_TYPE, id);
      setSelectedRecord(res?.data?.data || record);
    } catch { setSelectedRecord(record); }
  };

  const handlePoEdit = (record: any) => {
    void loadCodes();
    setSelectedRecord(null);
    setEditorState({ type: PO_TYPE, initialData: { ...record, __mode: 'edit' } });
  };

  const handlePoDelete = async (record: any) => {
    const confirmed = await showAppConfirm({
      title: 'ลบใบสั่งซื้อ',
      message: `ต้องการลบ ${record.documentNumber || 'เอกสารนี้'}?\n\nไม่สามารถกู้คืนได้`,
      confirmText: 'ลบ', cancelText: 'ยกเลิก', tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await documentService.delete(PO_TYPE, getRecordKey(record));
      setDocs((prev) => ({ ...prev, [PO_TYPE]: prev[PO_TYPE].filter((r) => getRecordKey(r) !== getRecordKey(record)) }));
      if (getRecordKey(selectedRecord) === getRecordKey(record)) setSelectedRecord(null);
    } catch {
      await showAppAlert({ title: 'ลบไม่สำเร็จ', message: 'ไม่สามารถลบเอกสารได้', tone: 'danger' });
    }
  };

  const handleEditorNavigate = (page: string, state?: unknown) => {
    if (page === 'documents') {
      const s = (state as any) || {};
      if (s.action === 'save' && s.savedRecord) {
        setDocs((prev) => ({ ...prev, [PO_TYPE]: replaceRecord(prev[PO_TYPE], s.savedRecord) }));
        setSelectedRecord(s.savedRecord);
        void loadAllDocuments().then(setDocs);
        if (pendingSOConversion) {
          void soService.markItemsConverted(pendingSOConversion.soId, {
            itemIds: pendingSOConversion.itemIds,
            prNumber: s.savedRecord.documentNumber || '',
          });
        }
        if (pendingPRConversion) {
          void purchaseService.pr.markItemsConverted(pendingPRConversion.prId, {
            itemIds: pendingPRConversion.itemIds,
            poNumber: s.savedRecord.documentNumber || '',
          });
        }
      }
      setPendingSOConversion(null);
      setPendingPRConversion(null);
      setEditorState(null);
      return;
    }
    onNavigate(page, state);
  };

  const renderPoStatus = (record: any) => {
    const status = record?.status || 'Open';
    const tone = ['received', 'completed', 'closed'].includes(String(status).toLowerCase())
      ? (darkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-100 text-green-700')
      : ['cancelled'].includes(String(status).toLowerCase())
        ? (darkMode ? 'bg-red-500/15 text-red-300' : 'bg-red-100 text-red-700')
        : (darkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-700');
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{status}</span>;
  };

  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <Layout darkMode={darkMode} setDarkMode={setDarkMode} onNavigate={onNavigate} currentPage={currentPage} topBarCaption="📦 ระบบซื้อ">
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6 text-sm">
            <button type="button" onClick={() => navigate('/documents')} className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'} transition`}>
              เอกสาร
            </button>
            <span className={darkMode ? 'text-gray-600' : 'text-gray-400'}>/</span>
            <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>📦 ระบบซื้อ</span>
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>ระบบจัดซื้อ</h1>
              <p className={`text-sm mt-1 ${textMuted}`}>SO/PR → PO → GR → รับสินค้าเข้าคลัง</p>
            </div>
            {/* Count badges */}
            <div className="flex gap-3">
              {[
                { label: 'ใบสั่งขาย', count: soCount, color: darkMode ? 'text-amber-400' : 'text-amber-700', bg: darkMode ? 'bg-gray-800 border-gray-700' : 'bg-amber-50 border-amber-100' },
                { label: 'ใบขอซื้อ', count: prCount, color: darkMode ? 'text-blue-400' : 'text-blue-700', bg: darkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-100' },
                { label: 'ใบสั่งซื้อ', count: poRecords.length, color: darkMode ? 'text-violet-400' : 'text-violet-700', bg: darkMode ? 'bg-gray-800 border-gray-700' : 'bg-violet-50 border-violet-100' },
                { label: 'ใบรับสินค้า', count: grCount, color: darkMode ? 'text-green-400' : 'text-green-700', bg: darkMode ? 'bg-gray-800 border-gray-700' : 'bg-green-50 border-green-100' },
              ].map((b) => (
                <div key={b.label} className={`rounded-2xl border px-4 py-2.5 text-center min-w-[80px] ${b.bg}`}>
                  <p className={`text-xl font-bold ${b.color}`}>{b.count}</p>
                  <p className={`text-xs ${textMuted}`}>{b.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tab bar */}
          <div className={`flex gap-1 p-1 rounded-2xl mb-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? (darkMode ? 'bg-gray-700 text-white shadow' : 'bg-white text-gray-900 shadow')
                    : (darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'pr' && <PRTab darkMode={darkMode} isAdmin={isAdmin} />}
          {activeTab === 'po' && (
            <PoTab
              darkMode={darkMode}
              textMuted={textMuted}
              isLoading={isLoading}
              records={filteredPoRecords}
              allCount={poRecords.length}
              search={search}
              setSearch={setSearch}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              selectedRecord={selectedRecord}
              editorState={editorState}
              editorRef={editorRef}
              onView={handlePoView}
              onEdit={handlePoEdit}
              onDelete={handlePoDelete}
              onCreate={handlePoCreate}
              onCreateFromSO={() => { void loadCodes(); setSoToPOOpen(true); }}
              onCreateFromPR={() => { void loadCodes(); setPrToPOOpen(true); }}
              onCloseSelected={() => setSelectedRecord(null)}
              onEditorNavigate={handleEditorNavigate}
              renderStatus={renderPoStatus}
              getVendorDisplay={getVendorDisplay}
            />
          )}
          {activeTab === 'gr' && <GRTab darkMode={darkMode} isAdmin={isAdmin} />}

        </div>
      </div>

      <SOToPOModal
        isOpen={soToPOOpen}
        darkMode={darkMode}
        vendorCodes={vendorCodes}
        onClose={() => setSoToPOOpen(false)}
        onCreatePO={(draft) => {
          const { _sourceSOId, _sourceSOItemIds, ...cleanDraft } = draft;
          setSoToPOOpen(false);
          setPendingSOConversion(_sourceSOId ? { soId: _sourceSOId, itemIds: _sourceSOItemIds || [] } : null);
          setActiveTab('po');
          setSelectedRecord(null);
          setEditorState({ type: PO_TYPE, initialData: cleanDraft });
        }}
      />

      <PRToPOModal
        isOpen={prToPOOpen}
        darkMode={darkMode}
        vendorCodes={vendorCodes}
        onClose={() => setPrToPOOpen(false)}
        onCreatePO={(draft) => {
          const { _sourcePRId, _sourcePRItemIds, ...cleanDraft } = draft;
          setPrToPOOpen(false);
          setPendingPRConversion(_sourcePRId ? { prId: _sourcePRId, itemIds: _sourcePRItemIds || [] } : null);
          setActiveTab('po');
          setSelectedRecord(null);
          setEditorState({ type: PO_TYPE, initialData: cleanDraft });
        }}
      />
    </Layout>
  );
}

// ── PO Tab ──────────────────────────────────────────────────────────────────
const TOP_N = 10;

function PoTab({
  darkMode, textMuted, isLoading, records, allCount, search, setSearch,
  statusFilter, setStatusFilter, selectedRecord, editorState, editorRef,
  onView, onEdit, onDelete, onCreate, onCreateFromSO, onCreateFromPR, onCloseSelected,
  onEditorNavigate, renderStatus, getVendorDisplay,
}: any) {
  const [showAll, setShowAll] = useState(false);
  const sectionCard = `rounded-2xl border p-5 shadow-sm ${darkMode ? 'border-gray-700 bg-gray-900/80' : 'border-gray-200 bg-white'}`;

  const isFiltered = search.trim() !== '' || statusFilter !== 'All';
  const displayRecords = (isFiltered || showAll) ? records : records.slice(0, TOP_N);
  const hasMore = !isFiltered && !showAll && records.length > TOP_N;

  return (
    <>
      {/* ── List card — hidden when form or view is open ── */}
      {!editorState && !selectedRecord && (
      <div className={`rounded-2xl border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        {/* Toolbar */}
        <div className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex gap-3 flex-1 w-full">
            <input
              type="text"
              placeholder="ค้นหาใบสั่งซื้อ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`flex-1 rounded-xl border px-4 py-2 text-sm outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400'}`}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`rounded-xl border px-3 py-2 text-sm outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            >
              {PO_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === 'All' ? 'ทุกสถานะ' : s}</option>)}
            </select>
          </div>
          <button type="button" onClick={onCreateFromPR}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition whitespace-nowrap">
            📋 ออก PO จาก ใบขอซื้อ
          </button>
          <button type="button" onClick={onCreateFromSO}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition whitespace-nowrap">
            📋 ออก PO จาก ใบสั่งขาย
          </button>
          <button type="button" onClick={onCreate}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 transition whitespace-nowrap">
            + สร้างใบสั่งซื้อ
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className={`text-center py-16 ${textMuted}`}>
            <div className="text-3xl mb-3">⏳</div>
            <p className="text-sm">กำลังโหลด...</p>
          </div>
        ) : records.length === 0 ? (
          <div className={`text-center py-16 ${textMuted}`}>
            <div className="text-4xl mb-3">📦</div>
            <p className="text-sm font-medium">{search ? 'ไม่พบใบสั่งซื้อที่ค้นหา' : 'ยังไม่มีใบสั่งซื้อ'}</p>
            {!search && (
              <button type="button" onClick={onCreate}
                className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 transition">
                + สร้างใบสั่งซื้อ
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                  <th className="px-5 py-3 text-left">เลขที่ PO</th>
                  <th className="px-5 py-3 text-left">เลขที่ QU (Vendor)</th>
                  <th className="px-5 py-3 text-left">Vendor</th>
                  <th className="px-5 py-3 text-left">วันที่</th>
                  <th className="px-5 py-3 text-left">กำหนดส่ง</th>
                  <th className="px-5 py-3 text-right">มูลค่า (฿)</th>
                  <th className="px-5 py-3 text-left">สถานะ</th>
                  <th className="px-5 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {displayRecords.map((record: any) => (
                  <tr key={getRecordKey(record)} className={`transition-colors ${darkMode ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'}`}>
                    <td className="px-5 py-3.5">
                      <button type="button" onClick={() => onView(record)}
                        className={`font-semibold hover:underline ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                        {record.documentNumber || '-'}
                      </button>
                      {record.referenceNo && <p className={`text-xs mt-0.5 ${textMuted}`}>Ref: {record.referenceNo}</p>}
                    </td>
                    <td className={`px-5 py-3.5 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{record.vendorQuotationNo || '-'}</td>
                    <td className={`px-5 py-3.5 ${textMuted}`}>{getVendorDisplay(record)}</td>
                    <td className={`px-5 py-3.5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{formatDate(record.documentDate)}</td>
                    <td className={`px-5 py-3.5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{formatDate(record.deliveryDate)}</td>
                    <td className={`px-5 py-3.5 text-right font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(record.total)}</td>
                    <td className="px-5 py-3.5">{renderStatus(record)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1.5 flex-wrap">
                        <button type="button" onClick={() => onEdit(record)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>แก้ไข</button>
                        <button type="button" onClick={() => onDelete(record)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-red-900/40 text-red-300 hover:bg-red-800/60' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>ลบ</button>
                        <button type="button" onClick={() => onView(record)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>ดู</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && records.length > 0 && (
          <div className={`px-5 py-3 border-t flex items-center justify-between text-xs ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
            <div className="flex items-center gap-3">
              <span>แสดง {displayRecords.length} จาก {allCount} รายการ</span>
              <span className="font-semibold">
                รวม ฿{formatCurrency(displayRecords.reduce((s: number, r: any) => s + Number(r.total || 0), 0))}
              </span>
            </div>
            {hasMore && (
              <button type="button" onClick={() => setShowAll(true)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${darkMode ? 'bg-gray-700 text-orange-300 hover:bg-gray-600' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}>
                ดูทั้งหมด {records.length} รายการ →
              </button>
            )}
          </div>
        )}
      </div>
      )} {/* end list conditional */}

      {/* ── View panel ── */}
      {selectedRecord && !editorState && (
        <div className={`rounded-2xl border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>

          {/* Top bar */}
          <div className={`rounded-t-2xl border-b px-6 py-4 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                  Purchase Order
                </p>
                <h3 className={`mt-1 text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {selectedRecord.documentNumber}
                </h3>
                <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{selectedRecord.title || '-'}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button type="button" onClick={() => onEdit(selectedRecord)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 transition">
                  แก้ไข
                </button>
                <button type="button" onClick={onCloseSelected}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  ← ย้อนกลับ
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 space-y-6">

            {/* Overview banner */}
            <div className={`overflow-hidden rounded-2xl border ${darkMode ? 'border-orange-500/30 bg-gradient-to-r from-slate-900 via-orange-950/40 to-slate-900' : 'border-orange-200 bg-gradient-to-r from-orange-50 via-white to-amber-50'}`}>
              <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>PO Overview</p>
                  <h4 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedRecord.documentNumber}</h4>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{selectedRecord.title || '-'}</p>
                  <div className="pt-1">
                    {renderStatus(selectedRecord)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:min-w-[280px]">
                  <div className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-200' : 'text-orange-700'}`}>Vendor</p>
                    <p className={`mt-2 text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {getVendorDisplay(selectedRecord) || '-'}
                    </p>
                  </div>
                  <div className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-200' : 'text-orange-700'}`}>วันที่</p>
                    <p className={`mt-2 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatDate(selectedRecord.documentDate)}
                    </p>
                  </div>
                  <div className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-200' : 'text-orange-700'}`}>เลขที่ QU (Vendor)</p>
                    <p className={`mt-2 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedRecord.vendorQuotationNo || '-'}
                    </p>
                  </div>
                  <div className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-orange-500/30 bg-orange-950/40' : 'border-orange-200 bg-orange-50'}`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>มูลค่ารวม</p>
                    <p className={`mt-2 text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>฿{formatCurrency(selectedRecord.total)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Detail info grid */}
            <div className={sectionCard}>
              <div className="mb-4">
                <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted}`}>รายละเอียด</p>
                <h4 className={`mt-1 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Document Information</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'เลขที่ PO', value: selectedRecord.documentNumber || '-' },
                  { label: 'Vendor', value: getVendorDisplay(selectedRecord) || '-' },
                  { label: 'เลขที่ QU (Vendor)', value: selectedRecord.vendorQuotationNo || '-' },
                  { label: 'วันที่เอกสาร', value: formatDate(selectedRecord.documentDate) },
                  { label: 'กำหนดส่ง', value: formatDate(selectedRecord.deliveryDate) },
                  { label: 'มูลค่า', value: `฿${formatCurrency(selectedRecord.total)}` },
                  { label: 'สถานะ', value: selectedRecord.status || '-' },
                  { label: 'อ้างอิง', value: selectedRecord.referenceNo || '-' },
                  { label: 'หมายเหตุ', value: selectedRecord.remark || '-' },
                ].map((item) => (
                  <div key={item.label}>
                    <p className={`text-xs uppercase tracking-wide ${textMuted}`}>{item.label}</p>
                    <p className={`mt-1 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Items table */}
            {selectedRecord.items && selectedRecord.items.length > 0 && (
              <div className={`overflow-hidden rounded-2xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className={`px-5 py-4 border-b ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted}`}>Line Items</p>
                  <h4 className={`mt-1 text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    รายการสินค้า ({selectedRecord.items.length} รายการ)
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
                        <th className="px-5 py-3 text-left">หน่วยนับ</th>
                        <th className="px-5 py-3 text-right">ราคาทุน/หน่วย</th>
                        <th className="px-5 py-3 text-right">รวมทุน</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                      {selectedRecord.items.map((item: any, idx: number) => (
                        <tr key={item.id || idx} className={`transition-colors ${darkMode ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}`}>
                          <td className={`px-5 py-3 ${textMuted}`}>{idx + 1}</td>
                          <td className={`px-5 py-3 ${textMuted}`}>{item.productCode || '-'}</td>
                          <td className={`px-5 py-3 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.productName || item.description || '-'}</td>
                          <td className={`px-5 py-3 text-right ${darkMode ? 'text-white' : 'text-gray-900'}`}>{Number(item.quantity || item.qty || 0).toLocaleString()}</td>
                          <td className={`px-5 py-3 ${textMuted}`}>{item.unitName || item.unitCode || '-'}</td>
                          <td className={`px-5 py-3 text-right ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>฿{formatCurrency(Number(item.sellingPrice || item.cost || 0))}</td>
                          <td className={`px-5 py-3 text-right font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>฿{formatCurrency(Number(item.totalSellingPrice || item.totalCost || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      {(() => {
                        const subtotal = (selectedRecord.items as any[]).reduce(
                          (sum: number, it: any) => sum + Number(it.totalSellingPrice || it.totalCost || 0), 0
                        );
                        const taxAmt = Number(selectedRecord.tax || 0);
                        const grand = Number(selectedRecord.total || 0);
                        return (
                          <>
                            <tr className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              <td colSpan={5} className="px-5 py-2 text-right text-xs">ยอดก่อน VAT</td>
                              <td className="px-5 py-2 text-right text-xs">฿{formatCurrency(subtotal)}</td>
                            </tr>
                            {taxAmt > 0 && (
                              <tr className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                <td colSpan={5} className="px-5 py-2 text-right text-xs">VAT ({selectedRecord.taxRate ?? 7}%)</td>
                                <td className="px-5 py-2 text-right text-xs">฿{formatCurrency(taxAmt)}</td>
                              </tr>
                            )}
                            <tr className={`font-bold border-t ${darkMode ? 'bg-gray-700/30 text-white border-gray-600' : 'bg-orange-50 text-gray-900 border-gray-200'}`}>
                              <td colSpan={5} className="px-5 py-3 text-right text-sm">มูลค่ารวม (รวม VAT)</td>
                              <td className={`px-5 py-3 text-right text-sm ${darkMode ? '' : 'text-orange-700'}`}>
                                ฿{formatCurrency(grand)}
                              </td>
                            </tr>
                          </>
                        );
                      })()}
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Editor ── */}
      {editorState && (
        <div ref={editorRef}>
          <AllDocumentForm documentType={editorState.type} initialData={editorState.initialData} onNavigate={onEditorNavigate} darkMode={darkMode} />
        </div>
      )}
    </>
  );
}
