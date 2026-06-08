import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import AllDocumentForm from '../../components/Documents/AllDocumentForm';
import useThemePreference from '../../hooks/useThemePreference';
import { showAppAlert, showAppConfirm } from '../../services/dialogService';
import documentService, { MainDocumentType } from '../../services/documentService';
import codeService from '../../services/codeService';
import {
  documentTypeConfigs, accentClasses, createEmptyCollections, DocumentsByType,
  getRecordKey, formatDate, formatCurrency, replaceRecord, loadAllDocuments,
  buildInvoiceDraftFromQuotation, buildDepositReceiptDraftFromQuotation, buildReceiptDraftFromInvoice,
  QUOTATION_STATUS_OPTIONS,
} from './documentShared';

const SALES_TABS: MainDocumentType[] = ['quotation', 'deposit_receipt', 'invoice', 'receipt'];

export default function SalesDocuments({ onNavigate = () => { }, currentPage = 'documents' }: any) {
  const [darkMode, setDarkMode] = useThemePreference();
  const [activeTab, setActiveTab] = useState<MainDocumentType>('quotation');
  const [docs, setDocs] = useState<DocumentsByType>(createEmptyCollections());
  const [customerCodes, setCustomerCodes] = useState<any[]>([]);
  const [paymentTermCodes, setPaymentTermCodes] = useState<any[]>([]);
  const [editorState, setEditorState] = useState<{ type: MainDocumentType; initialData: any } | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const editorRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const cfg = documentTypeConfigs[activeTab];
  const acc = accentClasses[cfg.accent];

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [d, custRes, termRes] = await Promise.all([
          loadAllDocuments(),
          codeService.getAll('customer'),
          codeService.getAll('payment-term'),
        ]);
        setDocs(d);
        setCustomerCodes(custRes?.data?.data || []);
        setPaymentTermCodes(termRes?.data?.data || []);
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

  const records = docs[activeTab] || [];

  const getPartyLabel = (record: any) => {
    const custCode = String(record?.customer || '').trim();
    const matched = customerCodes.find((c) => c.customerCode === custCode);
    return matched?.customerName || matched?.shortName || record?.customerName || record?.attentionTo || '-';
  };

  const getPaymentLabel = (record: any) => {
    const termId = String(record?.paymentTerm || '').trim();
    const matched = paymentTermCodes.find((t) => String(t.termId || '').trim() === termId);
    return matched?.termName || matched?.termCode || record?.paymentMethod || '-';
  };

  const filteredRecords = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return records.filter((r) => {
      const matchKw = !kw || [r.documentNumber, r.title, r.customerName, r.customer, r.referenceNo, r.status, r.remark, r.attentionTo]
        .some((v) => String(v ?? '').toLowerCase().includes(kw));
      const matchStatus = activeTab !== 'quotation' || statusFilter === 'All' || String(r.status || '').trim() === statusFilter;
      return matchKw && matchStatus;
    });
  }, [records, search, statusFilter, activeTab]);

  const handleTabChange = (tab: MainDocumentType) => {
    setActiveTab(tab);
    setSearch('');
    setStatusFilter('All');
    setSelectedRecord(null);
    setEditorState(null);
  };

  const handleCreate = () => { setSelectedRecord(null); setEditorState({ type: activeTab, initialData: null }); };

  const handleView = async (record: any) => {
    setEditorState(null);
    try {
      const id = record?.documentId || record?.id || record?.documentNumber;
      const res = await documentService.getById(record.documentType || activeTab, id);
      setSelectedRecord(res?.data?.data || record);
    } catch { setSelectedRecord(record); }
  };

  const handleEdit = (record: any) => {
    setSelectedRecord(null);
    setEditorState({ type: activeTab, initialData: { ...record, __mode: 'edit' } });
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

  const handleLinkToInvoice = (quotation: any) => {
    setActiveTab('invoice');
    setSelectedRecord(null);
    setEditorState({ type: 'invoice', initialData: buildInvoiceDraftFromQuotation(quotation) });
  };

  const handleLinkToDeposit = (quotation: any) => {
    setActiveTab('deposit_receipt');
    setSelectedRecord(null);
    setEditorState({ type: 'deposit_receipt', initialData: buildDepositReceiptDraftFromQuotation(quotation) });
  };

  const handleLinkToReceipt = (invoice: any) => {
    setActiveTab('receipt');
    setSelectedRecord(null);
    setEditorState({ type: 'receipt', initialData: buildReceiptDraftFromInvoice(invoice) });
  };

  const handleEditorNavigate = (page: string, state?: unknown) => {
    if (page === 'documents') {
      const s = (state as any) || {};
      if (s.action === 'save' && s.savedRecord) {
        const type = (s.selectedType || activeTab) as MainDocumentType;
        setDocs((prev) => ({ ...prev, [type]: replaceRecord(prev[type], s.savedRecord) }));
        setSelectedRecord(s.savedRecord);
        void loadAllDocuments().then(setDocs);
      }
      setEditorState(null);
      return;
    }
    onNavigate(page, state);
  };

  const renderStatus = (record: any) => {
    const status = record?.status || 'Draft';
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
                ใบเสนอราคา → ใบรับมัดจำ → ใบแจ้งหนี้ → ใบเสร็จรับเงิน
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className={`flex gap-1 mb-6 p-1 rounded-2xl w-fit ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            {SALES_TABS.map((tab) => {
              const c = documentTypeConfigs[tab];
              const a = accentClasses[c.accent];
              const isActive = activeTab === tab;
              const count = docs[tab]?.length || 0;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleTabChange(tab)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive ? a.activeTab : darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                  }`}
                >
                  <span>{c.icon}</span>
                  <span className="hidden sm:inline">{c.labelTh}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isActive ? 'bg-white/20 text-white' : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${darkMode ? 'border-red-800 bg-red-900/20 text-red-300' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {error}
            </div>
          )}

          {/* Content area */}
          <div className={`rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
            {/* Toolbar */}
            <div className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex gap-3 flex-1 w-full">
                <input
                  type="text"
                  placeholder={`ค้นหา${cfg.labelTh}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`flex-1 rounded-xl border px-4 py-2 text-sm outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400'}`}
                />
                {activeTab === 'quotation' && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`rounded-xl border px-3 py-2 text-sm outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  >
                    {QUOTATION_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
              </div>
              <button
                type="button"
                onClick={handleCreate}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${acc.btn} whitespace-nowrap`}
              >
                <span>+</span> {cfg.createLabel}
              </button>
            </div>

            {/* List */}
            {isLoading ? (
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
                      <tr
                        key={getRecordKey(record)}
                        className={`transition-colors ${darkMode ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => handleView(record)}
                            className={`font-semibold hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
                          >
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
                        <td className={`px-5 py-3.5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {formatDate(record.documentDate)}
                        </td>
                        <td className={`px-5 py-3.5 text-right font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {formatCurrency(record.total)}
                        </td>
                        <td className="px-5 py-3.5">{renderStatus(record)}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-2">
                            {/* Quick-link buttons for quotation */}
                            {activeTab === 'quotation' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleLinkToDeposit(record)}
                                  title="สร้างใบรับมัดจำ"
                                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-cyan-900/40 text-cyan-300 hover:bg-cyan-800/60' : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'}`}
                                >
                                  🏦 มัดจำ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleLinkToInvoice(record)}
                                  title="สร้างใบแจ้งหนี้"
                                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-800/60' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                                >
                                  🧾 Invoice
                                </button>
                              </>
                            )}
                            {/* Quick-link for invoice → receipt */}
                            {activeTab === 'invoice' && (
                              <button
                                type="button"
                                onClick={() => handleLinkToReceipt(record)}
                                title="สร้างใบเสร็จ"
                                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-amber-900/40 text-amber-300 hover:bg-amber-800/60' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                              >
                                💵 ใบเสร็จ
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleEdit(record)}
                              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                              แก้ไข
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(record)}
                              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-red-900/40 text-red-300 hover:bg-red-800/60' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                            >
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

            {/* Footer count */}
            {!isLoading && filteredRecords.length > 0 && (
              <div className={`px-5 py-3 border-t text-xs ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
                แสดง {filteredRecords.length} จาก {records.length} รายการ
                {filteredRecords.length > 0 && (
                  <span className="ml-3 font-semibold">
                    รวม ฿{formatCurrency(filteredRecords.reduce((s, r) => s + Number(r.total || 0), 0))}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* View detail panel */}
          {selectedRecord && !editorState && (
            <div className={`mt-6 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {cfg.icon} {selectedRecord.documentNumber || 'เอกสาร'}
                </h2>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleEdit(selectedRecord)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${acc.btn} text-white`}>
                    แก้ไข
                  </button>
                  <button type="button" onClick={() => setSelectedRecord(null)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    ปิด
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'ชื่อเรื่อง', value: selectedRecord.title || '-' },
                  { label: 'ลูกค้า', value: getPartyLabel(selectedRecord) },
                  { label: 'วันที่', value: formatDate(selectedRecord.documentDate) },
                  { label: 'มูลค่า', value: `฿${formatCurrency(selectedRecord.total)}` },
                  { label: 'สถานะ', value: selectedRecord.status || '-' },
                  { label: 'การชำระ', value: getPaymentLabel(selectedRecord) },
                  { label: 'หมายเหตุ', value: selectedRecord.remark || '-' },
                  { label: 'อ้างอิง', value: selectedRecord.referenceNo || '-' },
                ].map((item) => (
                  <div key={item.label}>
                    <p className={`text-xs uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.label}</p>
                    <p className={`mt-1 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editor */}
          {editorState && (
            <div ref={editorRef} className="mt-6">
              <AllDocumentForm
                documentType={editorState.type}
                initialData={editorState.initialData}
                onNavigate={handleEditorNavigate}
                darkMode={darkMode}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
