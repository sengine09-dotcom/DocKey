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
  getRecordKey, formatDate, formatCurrency, replaceRecord, loadAllDocuments, getRecordVendorLabel,
} from './documentShared';

const TYPE: MainDocumentType = 'purchase_order';
const PO_STATUS_OPTIONS = ['All', 'Open', 'Approved', 'Ordered', 'Partial', 'Received', 'Completed', 'Cancelled', 'Closed'];

export default function PurchaseDocuments({ onNavigate = () => { }, currentPage = 'documents' }: any) {
  const [darkMode, setDarkMode] = useThemePreference();
  const [docs, setDocs] = useState<DocumentsByType>(createEmptyCollections());
  const [vendorCodes, setVendorCodes] = useState<any[]>([]);
  const [editorState, setEditorState] = useState<{ type: MainDocumentType; initialData: any } | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const cfg = documentTypeConfigs[TYPE];
  const acc = accentClasses[cfg.accent];

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [d, vendorRes] = await Promise.all([
          loadAllDocuments(),
          codeService.getAll('vendor'),
        ]);
        setDocs(d);
        setVendorCodes(vendorRes?.data?.data || []);
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

  const records = docs[TYPE] || [];

  const getVendorDisplay = (record: any) => {
    const code = String(record?.vendorCode || '').trim();
    const matched = vendorCodes.find((v) => v.vendorCode === code);
    return matched ? `${code} - ${matched.name || matched.vendorCode}` : getRecordVendorLabel(record);
  };

  const filteredRecords = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return records.filter((r) => {
      const matchKw = !kw || [r.documentNumber, r.title, r.vendorCode, r.supplierName, r.referenceNo, r.status, r.remark]
        .some((v) => String(v ?? '').toLowerCase().includes(kw));
      const matchStatus = statusFilter === 'All' || String(r.status || '').trim() === statusFilter;
      return matchKw && matchStatus;
    });
  }, [records, search, statusFilter]);

  const handleCreate = () => { setSelectedRecord(null); setEditorState({ type: TYPE, initialData: null }); };

  const handleView = async (record: any) => {
    setEditorState(null);
    try {
      const id = record?.documentId || record?.id || record?.documentNumber;
      const res = await documentService.getById(TYPE, id);
      setSelectedRecord(res?.data?.data || record);
    } catch { setSelectedRecord(record); }
  };

  const handleEdit = (record: any) => {
    setSelectedRecord(null);
    setEditorState({ type: TYPE, initialData: { ...record, __mode: 'edit' } });
  };

  const handleDelete = async (record: any) => {
    const confirmed = await showAppConfirm({
      title: 'ลบใบสั่งซื้อ',
      message: `ต้องการลบ ${record.documentNumber || 'เอกสารนี้'}?\n\nไม่สามารถกู้คืนได้`,
      confirmText: 'ลบ', cancelText: 'ยกเลิก', tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await documentService.delete(TYPE, getRecordKey(record));
      setDocs((prev) => ({ ...prev, [TYPE]: prev[TYPE].filter((r) => getRecordKey(r) !== getRecordKey(record)) }));
      if (getRecordKey(selectedRecord) === getRecordKey(record)) setSelectedRecord(null);
    } catch {
      await showAppAlert({ title: 'ลบไม่สำเร็จ', message: 'ไม่สามารถลบเอกสารได้', tone: 'danger' });
    }
  };

  const handleEditorNavigate = (page: string, state?: unknown) => {
    if (page === 'documents') {
      const s = (state as any) || {};
      if (s.action === 'save' && s.savedRecord) {
        setDocs((prev) => ({ ...prev, [TYPE]: replaceRecord(prev[TYPE], s.savedRecord) }));
        setSelectedRecord(s.savedRecord);
        void loadAllDocuments().then(setDocs);
      }
      setEditorState(null);
      return;
    }
    onNavigate(page, state);
  };

  const renderStatus = (record: any) => {
    const status = record?.status || 'Open';
    const tone = ['received', 'completed', 'closed'].includes(String(status).toLowerCase())
      ? (darkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-100 text-green-700')
      : ['cancelled'].includes(String(status).toLowerCase())
        ? (darkMode ? 'bg-red-500/15 text-red-300' : 'bg-red-100 text-red-700')
        : (darkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-700');
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{status}</span>;
  };

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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>ระบบซื้อ — ใบสั่งซื้อ</h1>
              <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                สร้าง PO → อนุมัติ → สั่งซื้อ → รับสินค้า → ปิด PO
              </p>
            </div>
            <div className={`rounded-2xl border px-5 py-3 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-violet-50 border-violet-100'}`}>
              <p className={`text-2xl font-bold ${darkMode ? 'text-violet-400' : 'text-violet-700'}`}>{records.length}</p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-violet-600'}`}>ใบสั่งซื้อทั้งหมด</p>
            </div>
          </div>

          {/* Content */}
          <div className={`rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
            {/* Toolbar */}
            <div className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex gap-3 flex-1 w-full">
                <input
                  type="text"
                  placeholder="ค้นหาใบสั่งซื้อ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`flex-1 rounded-xl border px-4 py-2 text-sm outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`rounded-xl border px-3 py-2 text-sm outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                >
                  {PO_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button
                type="button"
                onClick={handleCreate}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${acc.btn} whitespace-nowrap`}
              >
                + {cfg.createLabel}
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
                <div className="text-4xl mb-3">📦</div>
                <p className="text-sm font-medium">{search ? 'ไม่พบใบสั่งซื้อที่ค้นหา' : 'ยังไม่มีใบสั่งซื้อ'}</p>
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
                      <th className="px-5 py-3 text-left">เลขที่ PO</th>
                      <th className="px-5 py-3 text-left">ชื่อ / Vendor</th>
                      <th className="px-5 py-3 text-left">วันที่</th>
                      <th className="px-5 py-3 text-left">กำหนดส่ง</th>
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
                            className={`font-semibold hover:underline ${darkMode ? 'text-violet-400' : 'text-violet-600'}`}>
                            {record.documentNumber || '-'}
                          </button>
                          {record.referenceNo && (
                            <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Ref: {record.referenceNo}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{record.title || '-'}</p>
                          <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{getVendorDisplay(record)}</p>
                        </td>
                        <td className={`px-5 py-3.5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{formatDate(record.documentDate)}</td>
                        <td className={`px-5 py-3.5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{formatDate(record.deliveryDate)}</td>
                        <td className={`px-5 py-3.5 text-right font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(record.total)}</td>
                        <td className="px-5 py-3.5">{renderStatus(record)}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-2">
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

            {!isLoading && filteredRecords.length > 0 && (
              <div className={`px-5 py-3 border-t text-xs ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
                แสดง {filteredRecords.length} จาก {records.length} รายการ
                <span className="ml-3 font-semibold">รวม ฿{formatCurrency(filteredRecords.reduce((s, r) => s + Number(r.total || 0), 0))}</span>
              </div>
            )}
          </div>

          {/* View panel */}
          {selectedRecord && !editorState && (
            <div className={`mt-6 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>📦 {selectedRecord.documentNumber}</h2>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleEdit(selectedRecord)} className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${acc.btn}`}>แก้ไข</button>
                  <button type="button" onClick={() => setSelectedRecord(null)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>ปิด</button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'ชื่อเรื่อง', value: selectedRecord.title || '-' },
                  { label: 'Vendor', value: getVendorDisplay(selectedRecord) },
                  { label: 'วันที่', value: formatDate(selectedRecord.documentDate) },
                  { label: 'กำหนดส่ง', value: formatDate(selectedRecord.deliveryDate) },
                  { label: 'มูลค่า', value: `฿${formatCurrency(selectedRecord.total)}` },
                  { label: 'สถานะ', value: selectedRecord.status || '-' },
                  { label: 'อ้างอิง', value: selectedRecord.referenceNo || '-' },
                  { label: 'หมายเหตุ', value: selectedRecord.remark || '-' },
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
              <AllDocumentForm documentType={editorState.type} initialData={editorState.initialData} onNavigate={handleEditorNavigate} darkMode={darkMode} />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
