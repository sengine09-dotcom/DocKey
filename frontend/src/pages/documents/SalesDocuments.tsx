import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import AllDocumentForm from '../../components/Documents/AllDocumentForm';
import useThemePreference from '../../hooks/useThemePreference';
import { showAppAlert, showAppConfirm } from '../../services/dialogService';
import documentService, { MainDocumentType } from '../../services/documentService';
import codeService from '../../services/codeService';
import {
  documentTypeConfigs, accentClasses, createEmptyCollections, DocumentsByType,
  getRecordKey, formatDate, formatCurrency, replaceRecord, loadTabDocuments,
  buildInvoiceDraftFromQuotation, buildReceiptDraftFromInvoice,
  buildDepositInvoiceDraftFromQuotation,
  buildDepositInvoiceDraftFromSO,
  buildDPFromDepositInvoice,
  buildBalanceInvoiceFromDP,
  buildReceiptDraftFromBalanceInvoice,
  QUOTATION_STATUS_OPTIONS, getQuotationStatusStyle,
  DEPOSIT_INVOICE_STATUS_OPTIONS, getDepositInvoiceStatusStyle,
} from './documentShared';
import soService from '../../services/soService';
import SOTab from './SOTab';

type SalesTabId = MainDocumentType | 'so';


const SO_TAB_META = { id: 'so' as const, icon: '🛒', labelTh: 'ใบสั่งขาย', label: 'Sale Order', accent: 'blue', createLabel: 'สร้าง SO' };

export default function SalesDocuments({ onNavigate = () => { }, currentPage = 'documents' }: any) {
  const [darkMode, setDarkMode] = useThemePreference();
  const [activeTab, setActiveTab] = useState<SalesTabId>('quotation');
  const [docs, setDocs] = useState<DocumentsByType>(createEmptyCollections());
  const [customerCodes, setCustomerCodes] = useState<any[]>([]);
  const [paymentTermCodes, setPaymentTermCodes] = useState<any[]>([]);
  const [vendorCodes, setVendorCodes] = useState<any[]>([]);
  const [unitCodes, setUnitCodes] = useState<any[]>([]);
  const [editorState, setEditorState] = useState<{ type: MainDocumentType; initialData: any } | null>(null);
  const [pendingSO, setPendingSO] = useState<any>(null);
  const [confirmedSOs, setConfirmedSOs] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const loadedTabsRef = useRef<Set<SalesTabId>>(new Set());
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codesLoadedRef = useRef(false);
  const navigate = useNavigate();

  const loadCodes = useCallback(async () => {
    if (codesLoadedRef.current) return;
    codesLoadedRef.current = true;
    const [custRes, termRes, vendorRes, unitRes] = await Promise.all([
      codeService.getAll('customer'),
      codeService.getAll('payment-term'),
      codeService.getAll('vendor'),
      codeService.getAll('unit-code'),
    ]);
    setCustomerCodes(custRes?.data?.data || []);
    setPaymentTermCodes(termRes?.data?.data || []);
    setVendorCodes(vendorRes?.data?.data || []);
    setUnitCodes(unitRes?.data?.data || []);
  }, []);

  const isSOTab = activeTab === 'so';
  const cfg = isSOTab ? { ...SO_TAB_META } as any : documentTypeConfigs[activeTab as MainDocumentType];
  const acc = accentClasses[isSOTab ? 'blue' : (cfg as any).accent];

  const fetchTab = useCallback(async (tab: SalesTabId, params: { search?: string } = {}) => {
    if (tab === 'so') return;
    setIsTabLoading(true);
    try {
      const rows = await loadTabDocuments(tab as MainDocumentType, params);
      setDocs((prev) => ({ ...prev, [tab]: rows }));
      if (!params.search) loadedTabsRef.current.add(tab);
    } finally {
      setIsTabLoading(false);
    }
  }, []);

  useEffect(() => {
    void axios.get('/api/auth/me').then((res) => {
      setIsAdmin(String(res.data?.user?.role || '').toLowerCase() === 'admin');
    });
    void fetchTab('quotation');
  }, [fetchTab]);

  useEffect(() => {
    if (!editorState) return;
    window.requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [editorState]);

  const records = docs[activeTab] || [];

  const getPartyLabel = (record: any) =>
    record?.customerName || record?.attentionTo || String(record?.customer || '').trim() || '-';

  const getPaymentLabel = (record: any) => {
    const termId = String(record?.paymentTerm || '').trim();
    const matched = paymentTermCodes.find((t) => String(t.termId || '').trim() === termId);
    return matched?.termName || matched?.termCode || record?.paymentMethod || '-';
  };

  const getVendorName = (vendorCode: string) => {
    if (!vendorCode) return '';
    const matched = vendorCodes.find((v) => v.vendorCode === vendorCode);
    return matched?.name || vendorCode;
  };

  const filteredRecords = useMemo(() => {
    const base = docs[activeTab as MainDocumentType] || [];
    const canFilter = activeTab === 'quotation' || activeTab === 'deposit_invoice';
    if (!canFilter || statusFilter === 'All') return base;
    return base.filter((r) => String(r.status || '').trim() === statusFilter);
  }, [docs, activeTab, statusFilter]);

  const handleTabChange = (tab: SalesTabId) => {
    setActiveTab(tab);
    setSearch('');
    setStatusFilter('All');
    setSelectedRecord(null);
    setEditorState(null);
    if (tab !== 'so') setPendingSO(null);
    if (tab !== 'so' && !loadedTabsRef.current.has(tab)) {
      void fetchTab(tab);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (activeTab === 'so') return;
    const tab = activeTab as MainDocumentType;
    if (!value.trim()) {
      loadedTabsRef.current.delete(tab);
      void fetchTab(tab);
      return;
    }
    searchTimerRef.current = setTimeout(() => {
      void fetchTab(tab, { search: value.trim() });
    }, 400);
  };

  const handleCreate = () => { void loadCodes(); setSelectedRecord(null); setEditorState({ type: activeTab as MainDocumentType, initialData: null }); };

  const handleView = async (record: any) => {
    void loadCodes();
    setSelectedRecord(null);
    try {
      const id = record?.documentId || record?.id || record?.documentNumber;
      const res = await documentService.getById(record.documentType || activeTab, id);
      setEditorState({ type: activeTab as MainDocumentType, initialData: { ...(res?.data?.data || record), __mode: 'view' } });
    } catch {
      setEditorState({ type: activeTab as MainDocumentType, initialData: { ...record, __mode: 'view' } });
    }
  };

  const handleEdit = (record: any) => {
    void loadCodes();
    setSelectedRecord(null);
    setEditorState({ type: activeTab as MainDocumentType, initialData: { ...record, __mode: 'edit' } });
  };

  const handleDelete = async (record: any) => {
    const confirmed = await showAppConfirm({
      title: `ลบ ${cfg.label}`,
      message: `ต้องการลบ ${record.documentNumber || 'เอกสารนี้'}?\n\nไม่สามารถกู้คืนได้`,
      confirmText: 'ลบ', cancelText: 'ยกเลิก', tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await documentService.delete(activeTab, getRecordKey(record));
      setDocs((prev) => ({ ...prev, [activeTab]: prev[activeTab].filter((r) => getRecordKey(r) !== getRecordKey(record)) }));
      if (getRecordKey(selectedRecord) === getRecordKey(record)) setSelectedRecord(null);
    } catch {
      await showAppAlert({ title: 'ลบไม่สำเร็จ', message: 'ไม่สามารถลบเอกสารได้', tone: 'danger' });
    }
  };

  const fetchFullRecord = async (record: any, type: MainDocumentType) => {
    if (Array.isArray(record?.items) && record.items.length > 0) return record;
    try {
      const id = record?.documentId || record?.id || record?.documentNumber;
      const res = await documentService.getById(type, id);
      return res?.data?.data || record;
    } catch {
      return record;
    }
  };

  const handleLinkToInvoice = async (quotation: any) => {
    const full = await fetchFullRecord(quotation, 'quotation');
    setActiveTab('invoice');
    setSelectedRecord(null);
    setEditorState({ type: 'invoice', initialData: buildInvoiceDraftFromQuotation(full) });
  };

  const handleLinkToReceipt = async (invoice: any) => {
    const full = await fetchFullRecord(invoice, 'invoice');
    setActiveTab('receipt');
    setSelectedRecord(null);

    if (full.linkedDepositReceiptId) {
      try {
        const dpRes = await documentService.getById('deposit_receipt', full.linkedDepositReceiptId);
        const dp = dpRes?.data?.data;
        setEditorState({ type: 'receipt', initialData: buildReceiptDraftFromBalanceInvoice(full, dp) });
      } catch {
        setEditorState({ type: 'receipt', initialData: buildReceiptDraftFromInvoice(full) });
      }
    } else {
      setEditorState({ type: 'receipt', initialData: buildReceiptDraftFromInvoice(full) });
    }
  };

  const handleLinkToSO = async (quotation: any) => {
    const full = await fetchFullRecord(quotation, 'quotation');
    const customerName = (() => {
      const code = String(full.customer || '').trim();
      if (!code) return '';
      const matched = customerCodes.find((c) => c.customerCode === code);
      return matched?.customerName || matched?.shortName || '';
    })();
    setEditorState(null);
    setSelectedRecord(null);
    setPendingSO({ ...full, customerName });
    setActiveTab('so');
  };

  const handleLinkToDI = async (quotation: any) => {
    const full = await fetchFullRecord(quotation, 'quotation');
    await loadCodes();

    let soList: any[] = [];
    try {
      const res = await soService.getAll();
      const allSOs = res?.data?.data || [];
      soList = allSOs.filter(
        (so: any) =>
          so.status === 'CONFIRMED' &&
          (!full.customer || so.customerCode === full.customer),
      );
    } catch {
      soList = [];
    }
    setConfirmedSOs(soList);

    if (soList.length === 0) {
      await showAppAlert({ title: 'ไม่พบ SO', message: 'ยังไม่มี SO ที่ยืนยันแล้ว กรุณาสร้าง SO ก่อน', tone: 'warning' });
      return;
    }

    const autoSO = soList.length === 1 ? soList[0] : null;
    setActiveTab('deposit_invoice');
    setSelectedRecord(null);
    setEditorState({
      type: 'deposit_invoice',
      initialData: {
        ...buildDepositInvoiceDraftFromQuotation(full, autoSO),
        __confirmedSOs: soList,
      },
    });
  };

  const handleSOtoDI = async (so: any) => {
    await loadCodes();
    setActiveTab('deposit_invoice');
    setSelectedRecord(null);
    setEditorState({
      type: 'deposit_invoice',
      initialData: buildDepositInvoiceDraftFromSO(so),
    });
  };

  const handleSOtoBalanceInvoice = async (so: any) => {
    const dp = docs['deposit_receipt']?.find((d: any) => d.linkedSOId === so.id);
    if (!dp) {
      await showAppAlert({ title: 'ไม่พบใบรับมัดจำ', message: 'ยังไม่มีใบรับมัดจำสำหรับ SO นี้ กรุณาสร้างใบแจ้งหนี้มัดจำและรับมัดจำก่อน', tone: 'warning' });
      return;
    }
    const full = await fetchFullRecord(dp, 'deposit_receipt');
    setActiveTab('invoice');
    setSelectedRecord(null);
    setEditorState({ type: 'invoice', initialData: buildBalanceInvoiceFromDP(full) });
  };

  const handleLinkToDPFromDI = async (di: any) => {
    const id = di?.documentId || di?.id || di?.documentNumber;
    let full = di;
    if (id) {
      try {
        const res = await documentService.getById('deposit_invoice', id);
        full = res?.data?.data || di;
      } catch { /* fall back to cached record */ }
    }
    setActiveTab('deposit_receipt');
    setSelectedRecord(null);
    setEditorState({ type: 'deposit_receipt', initialData: buildDPFromDepositInvoice(full) });
  };

  const handleLinkToBalanceInvoice = async (dp: any) => {
    const full = await fetchFullRecord(dp, 'deposit_receipt');
    setActiveTab('invoice');
    setSelectedRecord(null);
    setEditorState({ type: 'invoice', initialData: buildBalanceInvoiceFromDP(full) });
  };

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

  const handleEditorNavigate = (page: string, state?: unknown) => {
    if (page === 'documents') {
      const s = (state as any) || {};
      if (s.action === 'save' && s.savedRecord) {
        const type = (s.selectedType || activeTab) as MainDocumentType;
        setDocs((prev) => ({ ...prev, [type]: replaceRecord(prev[type], s.savedRecord) }));
        setSelectedRecord(s.savedRecord);
        loadedTabsRef.current.delete(type);
        if (type === 'deposit_receipt') {
          loadedTabsRef.current.delete('deposit_invoice');
        }
        void fetchTab(type);
      }
      setEditorState(null);
      return;
    }
    if (page === 'so') {
      const quotation = (state as any) || {};
      const customerName = (() => {
        const code = String(quotation.customer || '').trim();
        if (!code) return '';
        const matched = customerCodes.find((c) => c.customerCode === code);
        return matched?.customerName || matched?.shortName || '';
      })();
      setEditorState(null);
      setSelectedRecord(null);
      setPendingSO({ ...quotation, customerName });
      setActiveTab('so');
      return;
    }
    onNavigate(page, state);
  };

  const accentTextCls: Record<string, string> = {
    blue:    darkMode ? 'text-blue-300'    : 'text-blue-600',
    cyan:    darkMode ? 'text-cyan-300'    : 'text-cyan-600',
    teal:    darkMode ? 'text-teal-300'    : 'text-teal-600',
    emerald: darkMode ? 'text-emerald-300' : 'text-emerald-600',
    amber:   darkMode ? 'text-amber-300'   : 'text-amber-600',
  };
  const bannerBgCls: Record<string, string> = {
    blue:    darkMode ? 'border-blue-500/30 bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900'       : 'border-blue-200 bg-gradient-to-r from-blue-50 via-white to-sky-50',
    cyan:    darkMode ? 'border-cyan-500/30 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900'       : 'border-cyan-200 bg-gradient-to-r from-cyan-50 via-white to-teal-50',
    teal:    darkMode ? 'border-teal-500/30 bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-900'       : 'border-teal-200 bg-gradient-to-r from-teal-50 via-white to-cyan-50',
    emerald: darkMode ? 'border-emerald-500/30 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900' : 'border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50',
    amber:   darkMode ? 'border-amber-500/30 bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900'    : 'border-amber-200 bg-gradient-to-r from-amber-50 via-white to-yellow-50',
  };
  const bannerCardCls: Record<string, string> = {
    blue:    darkMode ? 'border-white/10 bg-white/5' : 'border-blue-100 bg-white/80',
    cyan:    darkMode ? 'border-white/10 bg-white/5' : 'border-cyan-100 bg-white/80',
    teal:    darkMode ? 'border-white/10 bg-white/5' : 'border-teal-100 bg-white/80',
    emerald: darkMode ? 'border-white/10 bg-white/5' : 'border-emerald-100 bg-white/80',
    amber:   darkMode ? 'border-white/10 bg-white/5' : 'border-amber-100 bg-white/80',
  };
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';

  const renderStatus = (record: any, isQuotation = false, isDepositInvoice = false) => {
    const status = record?.status || 'Draft';
    if (isQuotation) {
      const style = getQuotationStatusStyle(status);
      return <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={style}>{status}</span>;
    }
    if (isDepositInvoice) {
      const style = getDepositInvoiceStatusStyle(status);
      return <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={style}>{status}</span>;
    }
    const tone = record?.color === 'green' ? (darkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-100 text-green-700')
      : record?.color === 'red' ? (darkMode ? 'bg-red-500/15 text-red-300' : 'bg-red-100 text-red-700')
      : record?.color === 'blue' ? (darkMode ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-100 text-blue-700')
      : (darkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-700');
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{status}</span>;
  };

  return (
    <Layout darkMode={darkMode} setDarkMode={setDarkMode} onNavigate={onNavigate} currentPage={currentPage} topBarCaption="💼 ระบบขาย">
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6 text-sm">
            <button type="button" onClick={() => navigate('/documents')} className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'} transition`}>
              เอกสาร
            </button>
            <span className={darkMode ? 'text-gray-600' : 'text-gray-400'}>/</span>
            <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>💼 ระบบขาย</span>
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>ระบบขาย</h1>
              <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                ใบเสนอราคา → ใบสั่งขาย → ใบมัดจำ → ใบแจ้งหนี้ → ใบเสร็จรับเงิน
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className={`flex gap-1 mb-6 p-1 rounded-2xl w-fit ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            {/* quotation first */}
            {(() => {
              const tab = 'quotation' as const;
              const c = documentTypeConfigs[tab];
              const a = accentClasses[c.accent];
              const isActive = activeTab === tab;
              const count = docs[tab]?.length || 0;
              return (
                <button key={tab} type="button" onClick={() => handleTabChange(tab)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? a.activeTab : darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-white'}`}>
                  <span>{c.icon}</span>
                  <span className="hidden sm:inline">{c.labelTh}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isActive ? 'bg-white/20 text-white' : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>{count}</span>
                </button>
              );
            })()}
            {/* SO second */}
            {(() => {
              const isActive = activeTab === 'so';
              const soAccent = accentClasses['blue'];
              return (
                <button key="so" type="button" onClick={() => handleTabChange('so')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? soAccent.activeTab : darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-white'}`}>
                  <span>{SO_TAB_META.icon}</span>
                  <span className="hidden sm:inline">{SO_TAB_META.labelTh}</span>
                </button>
              );
            })()}
            {/* deposit_invoice → deposit_receipt → invoice → receipt */}
            {(['deposit_invoice', 'deposit_receipt', 'invoice', 'receipt'] as const).map((tab) => {
              const c = documentTypeConfigs[tab];
              const a = accentClasses[c.accent];
              const isActive = activeTab === tab;
              const count = docs[tab]?.length || 0;
              return (
                <button key={tab} type="button" onClick={() => handleTabChange(tab)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? a.activeTab : darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-white'}`}>
                  <span>{c.icon}</span>
                  <span className="hidden sm:inline">{c.labelTh}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isActive ? 'bg-white/20 text-white' : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {activeTab === 'so' && (
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
          )}

          {activeTab !== 'so' && (
            <>
              {/* LIST — hidden while viewing or editing */}
              {!selectedRecord && !editorState && (
                <div className={`rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
                  <div className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div className="flex gap-3 flex-1 w-full">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder={`ค้นหา${cfg.labelTh}... (เลขที่, ลูกค้า, หมายเหตุ)`}
                          value={search}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          className={`w-full rounded-xl border px-4 py-2 text-sm outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400'}`}
                        />
                        {isTabLoading && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">กำลังโหลด...</span>
                        )}
                      </div>
                      {activeTab === 'quotation' && (
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                          className={`rounded-xl border px-3 py-2 text-sm outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                          {QUOTATION_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )}
                      {activeTab === 'deposit_invoice' && (
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                          className={`rounded-xl border px-3 py-2 text-sm outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                          {DEPOSIT_INVOICE_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )}
                    </div>
                    <button type="button" onClick={handleCreate}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${acc.btn} whitespace-nowrap`}>
                      <span>+</span> {cfg.createLabel}
                    </button>
                  </div>

                  {isTabLoading && filteredRecords.length === 0 ? (
                    <div className={`text-center py-16 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <div className="text-3xl mb-3">⏳</div>
                      <p className="text-sm">กำลังโหลดเอกสาร...</p>
                    </div>
                  ) : filteredRecords.length === 0 ? (
                    <div className={`text-center py-16 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      <div className="text-4xl mb-3">{cfg.icon}</div>
                      <p className="text-sm font-medium">{search ? `ไม่พบ${cfg.labelTh}ที่ค้นหา` : `ยังไม่มี${cfg.labelTh}`}</p>
                      {!search && (
                        <button type="button" onClick={handleCreate} className={`mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${acc.btn}`}>
                          + {cfg.createLabel}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                            <th className="px-5 py-3 text-left">เลขที่เอกสาร</th>
                            <th className="px-5 py-3 text-left">ชื่อ / ลูกค้า</th>
                            <th className="px-5 py-3 text-left">วันที่</th>
                            <th className="px-5 py-3 text-right">มูลค่า (฿)</th>
                            <th className="px-5 py-3 text-left">สถานะ</th>
                            <th className="px-5 py-3 text-right">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                          {filteredRecords.map((record) => (
                            <tr key={getRecordKey(record)} className={`transition-colors ${darkMode ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'}`}>
                              <td className="px-5 py-3.5">
                                <button type="button" onClick={() => handleView(record)}
                                  className={`font-semibold hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                  {record.documentNumber || '-'}
                                </button>
                                {record.referenceNo && (
                                  <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Ref: {record.referenceNo}</p>
                                )}
                              </td>
                              <td className="px-5 py-3.5">
                                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{record.title || '-'}</p>
                                <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{getPartyLabel(record)}</p>
                              </td>
                              <td className={`px-5 py-3.5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{formatDate(record.documentDate)}</td>
                              <td className={`px-5 py-3.5 text-right font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(record.total)}</td>
                              <td className="px-5 py-3.5">{renderStatus(record, activeTab === 'quotation', activeTab === 'deposit_invoice')}</td>
                              <td className="px-5 py-3.5">
                                <div className="flex justify-end gap-2">
                                  {activeTab === 'quotation' && (
                                    <button type="button" onClick={() => handleLinkToSO(record)}
                                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-blue-900/40 text-blue-300 hover:bg-blue-800/60' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                                      🛒 ใบสั่งขาย
                                    </button>
                                  )}
                                  {activeTab === 'deposit_invoice' && (
                                    <button type="button" onClick={() => handleLinkToDPFromDI(record)}
                                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-cyan-900/40 text-cyan-300 hover:bg-cyan-800/60' : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'}`}>
                                      🏦 สร้างใบรับมัดจำ
                                    </button>
                                  )}
                                  {activeTab === 'deposit_receipt' && (
                                    <button type="button" onClick={() => handleLinkToBalanceInvoice(record)}
                                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-800/60' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                                      🧾 ใบแจ้งหนี้งวดสุดท้าย
                                    </button>
                                  )}
                                  {activeTab === 'invoice' && (
                                    <button type="button" onClick={() => handleLinkToReceipt(record)}
                                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-amber-900/40 text-amber-300 hover:bg-amber-800/60' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
                                      💵 ใบเสร็จ
                                    </button>
                                  )}
                                  <button type="button" onClick={() => handleEdit(record)}
                                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                    แก้ไข
                                  </button>
                                  <button type="button" onClick={() => handleDelete(record)}
                                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-red-900/40 text-red-300 hover:bg-red-800/60' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                                    ลบ
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {filteredRecords.length > 0 && (
                    <div className={`px-5 py-3 border-t text-xs ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
                      แสดง {filteredRecords.length} จาก {records.length} รายการ
                      <span className="ml-3 font-semibold">
                        รวม ฿{formatCurrency(filteredRecords.reduce((s, r) => s + Number(r.total || 0), 0))}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* FULL-PAGE VIEW — PR style */}
              {selectedRecord && !editorState && (
                <div>
                  {/* Top bar — back + actions */}
                  <div className="flex items-center justify-between mb-4">
                    <button type="button" onClick={() => setSelectedRecord(null)}
                      className={`rounded-xl px-3 py-2 text-sm font-medium transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      ← กลับ
                    </button>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => handleEdit(selectedRecord)}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${acc.btn}`}>
                        แก้ไข
                      </button>
                      <button type="button" onClick={() => handleDelete(selectedRecord)}
                        className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition bg-red-500 hover:bg-red-600">
                        ลบ
                      </button>
                    </div>
                  </div>

                  {/* Overview banner — gradient header with doc info + stat cards */}
                  <div className={`overflow-hidden rounded-2xl border mb-6 ${bannerBgCls[cfg.accent] || bannerBgCls.blue}`}>
                    <div className="p-6">
                      <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${accentTextCls[cfg.accent] || accentTextCls.blue}`}>{cfg.icon} {cfg.labelTh}</p>
                      <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedRecord.documentNumber || '-'}</h2>
                      {selectedRecord.title && (
                        <p className={`text-sm mt-1 mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{selectedRecord.title}</p>
                      )}
                      <div className="mt-3 mb-5">{renderStatus(selectedRecord, activeTab === 'quotation', activeTab === 'deposit_invoice')}</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className={`rounded-xl border p-4 ${bannerCardCls[cfg.accent] || bannerCardCls.blue}`}>
                          <p className={`text-xs uppercase tracking-wide ${textMuted}`}>มูลค่ารวม</p>
                          <p className={`text-xl font-bold mt-1 ${accentTextCls[cfg.accent] || accentTextCls.blue}`}>฿{formatCurrency(selectedRecord.total)}</p>
                        </div>
                        <div className={`rounded-xl border p-4 ${bannerCardCls[cfg.accent] || bannerCardCls.blue}`}>
                          <p className={`text-xs uppercase tracking-wide ${textMuted}`}>จำนวนรายการ</p>
                          <p className={`text-xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{Array.isArray(selectedRecord.items) ? selectedRecord.items.length : 0} รายการ</p>
                        </div>
                        <div className={`rounded-xl border p-4 ${bannerCardCls[cfg.accent] || bannerCardCls.blue}`}>
                          <p className={`text-xs uppercase tracking-wide ${textMuted}`}>วันที่เอกสาร</p>
                          <p className={`text-base font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatDate(selectedRecord.documentDate)}</p>
                        </div>
                        <div className={`rounded-xl border p-4 ${bannerCardCls[cfg.accent] || bannerCardCls.blue}`}>
                          <p className={`text-xs uppercase tracking-wide ${textMuted}`}>ลูกค้า</p>
                          <p className={`text-base font-bold mt-1 truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{getPartyLabel(selectedRecord)}</p>
                        </div>
                        <div className={`rounded-xl border p-4 ${bannerCardCls[cfg.accent] || bannerCardCls.blue}`}>
                          <p className={`text-xs uppercase tracking-wide ${textMuted}`}>การชำระเงิน</p>
                          <p className={`text-base font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{getPaymentLabel(selectedRecord)}</p>
                        </div>
                        <div className={`rounded-xl border p-4 ${bannerCardCls[cfg.accent] || bannerCardCls.blue}`}>
                          <p className={`text-xs uppercase tracking-wide ${textMuted}`}>เลขที่อ้างอิง</p>
                          <p className={`text-base font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedRecord.referenceNo || '-'}</p>
                        </div>
                        <div className={`rounded-xl border p-4 col-span-2 ${bannerCardCls[cfg.accent] || bannerCardCls.blue}`}>
                          <p className={`text-xs uppercase tracking-wide ${textMuted}`}>หมายเหตุ</p>
                          <p className={`text-sm font-medium mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedRecord.remark || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items table */}
                  {Array.isArray(selectedRecord.items) && selectedRecord.items.length > 0 && (
                    <div className={`overflow-hidden rounded-2xl border mb-6 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className={`px-5 py-3.5 border-b text-xs font-semibold uppercase tracking-wide ${darkMode ? 'border-gray-700 bg-gray-900/60 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                        รายการสินค้า ({selectedRecord.items.length} รายการ)
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-gray-800/60 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                              <th className="px-5 py-3 text-left w-8">#</th>
                              <th className="px-5 py-3 text-left">รหัสสินค้า</th>
                              <th className="px-5 py-3 text-left">ชื่อสินค้า</th>
                              <th className="px-5 py-3 text-right">จำนวน</th>
                              <th className="px-5 py-3 text-left">หน่วย</th>
                              <th className="px-5 py-3 text-right">ต้นทุน/หน่วย (฿)</th>
                              <th className="px-5 py-3 text-right">ราคาขาย/หน่วย (฿)</th>
                              <th className="px-5 py-3 text-right">ยอดรวม (฿)</th>
                              {activeTab === 'quotation' && <th className="px-5 py-3 text-left">Vendor</th>}
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                            {selectedRecord.items.map((item: any, idx: number) => (
                              <tr key={item.lineNo ?? idx} className={darkMode ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}>
                                <td className={`px-5 py-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{item.lineNo ?? idx + 1}</td>
                                <td className={`px-5 py-3 font-mono text-xs ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{item.productCode || '-'}</td>
                                <td className={`px-5 py-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.productName || '-'}</td>
                                <td className={`px-5 py-3 text-right ${darkMode ? 'text-white' : 'text-gray-900'}`}>{Number(item.quantity || 0).toLocaleString()}</td>
                                <td className={`px-5 py-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.unitName || (unitCodes.find((u: any) => u.unitCode === item.unitCode)?.unitName) || item.unitCode || '-'}</td>
                                <td className={`px-5 py-3 text-right ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>{formatCurrency(Number(item.cost || 0))}</td>
                                <td className={`px-5 py-3 text-right ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(Number(item.quantity) > 0 ? Number(item.totalSellingPrice || 0) / Number(item.quantity) : Number(item.sellingPrice || 0))}</td>
                                <td className={`px-5 py-3 text-right font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(Number(item.totalSellingPrice || 0))}</td>
                                {activeTab === 'quotation' && (
                                  <td className={`px-5 py-3 text-xs ${item.vendorCode ? (darkMode ? 'text-emerald-300' : 'text-emerald-700') : (darkMode ? 'text-gray-600' : 'text-gray-400')}`}>
                                    {item.vendorCode ? getVendorName(item.vendorCode) : '-'}
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className={`font-bold text-sm ${darkMode ? 'bg-gray-700/30 text-white' : 'bg-gray-50 text-gray-900'}`}>
                              <td colSpan={activeTab === 'quotation' ? 8 : 7} className="px-5 py-3 text-right">ยอดรวมทั้งสิ้น</td>
                              <td className={`px-5 py-3 text-right ${accentTextCls[cfg.accent] || accentTextCls.blue}`}>
                                ฿{formatCurrency(selectedRecord.total)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Quick-link actions */}
                  {(activeTab === 'quotation' || activeTab === 'deposit_invoice' || activeTab === 'deposit_receipt' || activeTab === 'invoice') && (
                    <div className="flex gap-3 flex-wrap">
                      {activeTab === 'quotation' && (
                        <button type="button" onClick={() => handleLinkToSO(selectedRecord)}
                          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${darkMode ? 'bg-blue-900/40 text-blue-300 hover:bg-blue-800/60' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                          🛒 สร้างใบสั่งขาย
                        </button>
                      )}
                      {activeTab === 'deposit_invoice' && (
                        <button type="button" onClick={() => handleLinkToDPFromDI(selectedRecord)}
                          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${darkMode ? 'bg-cyan-900/40 text-cyan-300 hover:bg-cyan-800/60' : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'}`}>
                          🏦 สร้างใบรับมัดจำ
                        </button>
                      )}
                      {activeTab === 'deposit_receipt' && (
                        <button type="button" onClick={() => handleLinkToBalanceInvoice(selectedRecord)}
                          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${darkMode ? 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-800/60' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                          🧾 สร้างใบแจ้งหนี้งวดสุดท้าย
                        </button>
                      )}
                      {activeTab === 'invoice' && (
                        <button type="button" onClick={() => handleLinkToReceipt(selectedRecord)}
                          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${darkMode ? 'bg-amber-900/40 text-amber-300 hover:bg-amber-800/60' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
                          💵 สร้างใบเสร็จ
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* EDITOR */}
              {editorState && (
                <div ref={editorRef} className="mt-6">
                  <AllDocumentForm
                    documentType={editorState.type}
                    initialData={editorState.initialData}
                    onNavigate={handleEditorNavigate}
                    darkMode={darkMode}
                    preloadedCustomers={customerCodes}
                    preloadedVendors={vendorCodes}
                    preloadedUnitCodes={unitCodes}
                    preloadedPaymentTerms={paymentTermCodes}
                    preloadedQuotations={docs.quotation}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
