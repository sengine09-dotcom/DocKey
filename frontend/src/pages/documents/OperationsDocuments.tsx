import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/Layout/Layout';
import AllDocumentForm from '../../components/Documents/AllDocumentForm';
import useThemePreference from '../../hooks/useThemePreference';
import { showAppAlert, showAppConfirm } from '../../services/dialogService';
import documentService, { MainDocumentType } from '../../services/documentService';
import {
  documentTypeConfigs, accentClasses, createEmptyCollections, DocumentsByType,
  getRecordKey, formatDate, formatCurrency, replaceRecord, loadTabDocuments,
} from './documentShared';

type OperationsTab = 'wo' | 'do';

const TABS: { id: OperationsTab; label: string; icon: string }[] = [
  { id: 'wo', label: 'ใบสั่งงาน (WO)', icon: '🔧' },
  { id: 'do', label: 'ใบส่งสินค้า (DO)', icon: '🚚' },
];

export default function OperationsDocuments({ onNavigate = () => { }, currentPage = 'documents' }: any) {
  const [darkMode, setDarkMode] = useThemePreference();
  const [activeTab, setActiveTab] = useState<OperationsTab>('wo');
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    void axios.get('/api/auth/me').then((res) => {
      setIsAdmin(String(res.data?.user?.role || '').toLowerCase() === 'admin');
    }).catch(() => {});
  }, []);

  return (
    <Layout darkMode={darkMode} setDarkMode={setDarkMode} onNavigate={onNavigate} currentPage={currentPage} topBarCaption="🛠️ ระบบหลังบ้าน">
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6 text-sm">
            <button type="button" onClick={() => navigate('/documents')} className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'} transition`}>
              เอกสาร
            </button>
            <span className={darkMode ? 'text-gray-600' : 'text-gray-400'}>/</span>
            <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🛠️ ระบบหลังบ้าน</span>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>ระบบหลังบ้าน</h1>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              สร้างใบสั่งงาน → มอบหมาย → ส่งสินค้า (ตัดสต๊อก) → ปิดงาน
            </p>
          </div>

          {/* Tab bar */}
          <div className={`flex gap-1 p-1 rounded-2xl mb-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
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
          {activeTab === 'wo' && <WOTab darkMode={darkMode} onNavigate={onNavigate} isAdmin={isAdmin} />}
          {activeTab === 'do' && <DOTab darkMode={darkMode} onNavigate={onNavigate} isAdmin={isAdmin} />}

        </div>
      </div>
    </Layout>
  );
}

// ── WO Tab ──────────────────────────────────────────────────────────────────

const WO_TYPE: MainDocumentType = 'work_order';
const WO_STATUS_OPTIONS = ['All', 'Draft', 'Open', 'In Progress', 'On Hold', 'Completed', 'Closed', 'Cancelled'];

function WOTab({ darkMode, onNavigate, isAdmin }: { darkMode: boolean; onNavigate: any; isAdmin: boolean }) {
  const [docs, setDocs] = useState<DocumentsByType>(createEmptyCollections());
  const [editorState, setEditorState] = useState<{ type: MainDocumentType; initialData: any } | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const cfg = documentTypeConfigs[WO_TYPE];
  const acc = accentClasses[cfg.accent];

  useEffect(() => {
    loadTabDocuments(WO_TYPE).then((rows) => {
      setDocs((prev) => ({ ...prev, [WO_TYPE]: rows }));
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!editorState) return;
    window.requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [editorState]);

  const records = docs[WO_TYPE] || [];

  const filteredRecords = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return records.filter((r) => {
      const matchKw = !kw || [r.documentNumber, r.title, r.assignedTo, r.referenceNo, r.status, r.remark]
        .some((v) => String(v ?? '').toLowerCase().includes(kw));
      const matchStatus = statusFilter === 'All' || String(r.status || '').trim() === statusFilter;
      return matchKw && matchStatus;
    });
  }, [records, search, statusFilter]);

  const handleCreate = () => { setSelectedRecord(null); setEditorState({ type: WO_TYPE, initialData: null }); };

  const handleView = async (record: any) => {
    setEditorState(null);
    try {
      const id = record?.documentId || record?.id || record?.documentNumber;
      const res = await documentService.getById(WO_TYPE, id);
      setSelectedRecord(res?.data?.data || record);
    } catch { setSelectedRecord(record); }
  };

  const handleEdit = (record: any) => {
    setSelectedRecord(null);
    setEditorState({ type: WO_TYPE, initialData: { ...record, __mode: 'edit' } });
  };

  const handleDelete = async (record: any) => {
    const confirmed = await showAppConfirm({
      title: 'ลบใบสั่งงาน',
      message: `ต้องการลบ ${record.documentNumber || 'เอกสารนี้'}?\n\nไม่สามารถกู้คืนได้`,
      confirmText: 'ลบ', cancelText: 'ยกเลิก', tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await documentService.delete(WO_TYPE, getRecordKey(record));
      setDocs((prev) => ({ ...prev, [WO_TYPE]: prev[WO_TYPE].filter((r) => getRecordKey(r) !== getRecordKey(record)) }));
      if (getRecordKey(selectedRecord) === getRecordKey(record)) setSelectedRecord(null);
    } catch {
      await showAppAlert({ title: 'ลบไม่สำเร็จ', message: 'ไม่สามารถลบเอกสารได้', tone: 'danger' });
    }
  };

  const handleEditorNavigate = (page: string, state?: unknown) => {
    if (page === 'documents') {
      const s = (state as any) || {};
      if (s.action === 'save' && s.savedRecord) {
        setDocs((prev) => ({ ...prev, [WO_TYPE]: replaceRecord(prev[WO_TYPE], s.savedRecord) }));
        setSelectedRecord(s.savedRecord);
        void loadTabDocuments(WO_TYPE).then((rows) => setDocs((prev) => ({ ...prev, [WO_TYPE]: rows })));
      }
      setEditorState(null);
      return;
    }
    onNavigate(page, state);
  };

  const renderStatus = (record: any) => {
    const status = record?.status || 'Open';
    const s = String(status).toLowerCase();
    const tone = ['completed', 'closed'].includes(s) ? (darkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-100 text-green-700')
      : ['cancelled'].includes(s) ? (darkMode ? 'bg-red-500/15 text-red-300' : 'bg-red-100 text-red-700')
      : ['in progress'].includes(s) ? (darkMode ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-100 text-blue-700')
      : ['on hold'].includes(s) ? (darkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-700')
      : (darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700');
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{status}</span>;
  };

  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <>
      <div className={`rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
        {/* Toolbar */}
        <div className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex gap-3 flex-1 w-full">
            <input
              type="text"
              placeholder="ค้นหาใบสั่งงาน..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`flex-1 rounded-xl border px-4 py-2 text-sm outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`rounded-xl border px-3 py-2 text-sm outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            >
              {WO_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button type="button" onClick={handleCreate}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${acc.btn} whitespace-nowrap`}>
            + {cfg.createLabel}
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className={`text-center py-16 ${textMuted}`}><div className="text-3xl mb-3">⏳</div><p className="text-sm">กำลังโหลดเอกสาร...</p></div>
        ) : filteredRecords.length === 0 ? (
          <div className={`text-center py-16 ${textMuted}`}>
            <div className="text-4xl mb-3">🔧</div>
            <p className="text-sm font-medium">{search ? 'ไม่พบใบสั่งงานที่ค้นหา' : 'ยังไม่มีใบสั่งงาน'}</p>
            {!search && <button type="button" onClick={handleCreate} className={`mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${acc.btn}`}>+ {cfg.createLabel}</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                  <th className="px-5 py-3 text-left">เลขที่งาน</th>
                  <th className="px-5 py-3 text-left">ชื่องาน / ผู้รับผิดชอบ</th>
                  <th className="px-5 py-3 text-left">วันที่</th>
                  <th className="px-5 py-3 text-left">กำหนดเสร็จ</th>
                  <th className="px-5 py-3 text-right">มูลค่า (฿)</th>
                  <th className="px-5 py-3 text-left">สถานะ</th>
                  <th className="px-5 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {filteredRecords.map((record) => (
                  <tr key={getRecordKey(record)} className={`transition-colors ${darkMode ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'}`}>
                    <td className="px-5 py-3.5">
                      <button type="button" onClick={() => handleView(record)} className={`font-semibold hover:underline ${darkMode ? 'text-rose-400' : 'text-rose-600'}`}>
                        {record.documentNumber || '-'}
                      </button>
                      {record.referenceNo && <p className={`text-xs mt-0.5 ${textMuted}`}>Ref: {record.referenceNo}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{record.title || '-'}</p>
                      <p className={`text-xs mt-0.5 ${textMuted}`}>{record.assignedTo ? `👤 ${record.assignedTo}` : 'ยังไม่มอบหมาย'}</p>
                    </td>
                    <td className={`px-5 py-3.5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{formatDate(record.documentDate)}</td>
                    <td className={`px-5 py-3.5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{formatDate(record.scheduledDate)}</td>
                    <td className={`px-5 py-3.5 text-right font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(record.total)}</td>
                    <td className="px-5 py-3.5">{renderStatus(record)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => handleEdit(record)} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>แก้ไข</button>
                        {isAdmin && <button type="button" onClick={() => handleDelete(record)} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-red-900/40 text-red-300 hover:bg-red-800/60' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>ลบ</button>}
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
          </div>
        )}
      </div>

      {/* View panel */}
      {selectedRecord && !editorState && (
        <div className={`mt-6 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🔧 {selectedRecord.documentNumber}</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => handleEdit(selectedRecord)} className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${acc.btn}`}>แก้ไข</button>
              <button type="button" onClick={() => setSelectedRecord(null)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>ปิด</button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'ชื่องาน', value: selectedRecord.title || '-' },
              { label: 'ผู้รับผิดชอบ', value: selectedRecord.assignedTo || '-' },
              { label: 'วันที่', value: formatDate(selectedRecord.documentDate) },
              { label: 'กำหนดเสร็จ', value: formatDate(selectedRecord.scheduledDate) },
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
      )}

      {/* Editor */}
      {editorState && (
        <div ref={editorRef} className="mt-6">
          <AllDocumentForm documentType={editorState.type} initialData={editorState.initialData} onNavigate={handleEditorNavigate} darkMode={darkMode} />
        </div>
      )}
    </>
  );
}

// ── DO Tab ──────────────────────────────────────────────────────────────────

const DO_TYPE: MainDocumentType = 'delivery_order';
const DO_STATUS_OPTIONS = ['All', 'Draft', 'Delivered', 'Cancelled'];

function DOTab({ darkMode, onNavigate, isAdmin }: { darkMode: boolean; onNavigate: any; isAdmin: boolean }) {
  const [docs, setDocs] = useState<DocumentsByType>(createEmptyCollections());
  const [editorState, setEditorState] = useState<{ type: MainDocumentType; initialData: any } | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const cfg = documentTypeConfigs[DO_TYPE];
  const acc = accentClasses[cfg.accent];

  useEffect(() => {
    loadTabDocuments(DO_TYPE).then((rows) => {
      setDocs((prev) => ({ ...prev, [DO_TYPE]: rows }));
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!editorState) return;
    window.requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [editorState]);

  const records = docs[DO_TYPE] || [];

  const filteredRecords = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return records.filter((r) => {
      const matchKw = !kw || [r.documentNumber, r.title, r.referenceNo, r.status, r.remark, r.linkedSOId]
        .some((v) => String(v ?? '').toLowerCase().includes(kw));
      const matchStatus = statusFilter === 'All' || String(r.status || '').trim() === statusFilter;
      return matchKw && matchStatus;
    });
  }, [records, search, statusFilter]);

  const handleCreate = () => { setSelectedRecord(null); setEditorState({ type: DO_TYPE, initialData: null }); };

  const handleView = async (record: any) => {
    setSelectedRecord(null);
    try {
      const id = record?.documentId || record?.id || record?.documentNumber;
      const res = await documentService.getById(DO_TYPE, id);
      const full = res?.data?.data || record;
      setEditorState({ type: DO_TYPE, initialData: { ...full, __mode: 'view' } });
    } catch {
      setEditorState({ type: DO_TYPE, initialData: { ...record, __mode: 'view' } });
    }
  };

  const handleEdit = (record: any) => {
    setSelectedRecord(null);
    setEditorState({ type: DO_TYPE, initialData: { ...record, __mode: 'edit' } });
  };

  const handleDelete = async (record: any) => {
    const confirmed = await showAppConfirm({
      title: 'ลบใบส่งสินค้า',
      message: `ต้องการลบ ${record.documentNumber || 'เอกสารนี้'}?\n\nไม่สามารถกู้คืนได้`,
      confirmText: 'ลบ', cancelText: 'ยกเลิก', tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await documentService.delete(DO_TYPE, getRecordKey(record));
      setDocs((prev) => ({ ...prev, [DO_TYPE]: prev[DO_TYPE].filter((r) => getRecordKey(r) !== getRecordKey(record)) }));
      if (getRecordKey(selectedRecord) === getRecordKey(record)) setSelectedRecord(null);
    } catch {
      await showAppAlert({ title: 'ลบไม่สำเร็จ', message: 'ไม่สามารถลบเอกสารได้', tone: 'danger' });
    }
  };

  const handleEditorNavigate = (page: string, state?: unknown) => {
    if (page === 'documents') {
      const s = (state as any) || {};
      if (s.action === 'save' && s.savedRecord) {
        setDocs((prev) => ({ ...prev, [DO_TYPE]: replaceRecord(prev[DO_TYPE], s.savedRecord) }));
        setSelectedRecord(s.savedRecord);
        void loadTabDocuments(DO_TYPE).then((rows) => setDocs((prev) => ({ ...prev, [DO_TYPE]: rows })));
      }
      setEditorState(null);
      return;
    }
    onNavigate(page, state);
  };

  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <>
      {!editorState && <div className={`rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
        {/* Toolbar */}
        <div className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex gap-3 flex-1 w-full">
            <input
              type="text"
              placeholder="ค้นหา เลขเอกสาร, อ้างอิง SO, สถานะ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`flex-1 rounded-xl border px-4 py-2 text-sm outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`rounded-xl border px-3 py-2 text-sm outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            >
              {DO_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button type="button" onClick={handleCreate}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${acc.btn} whitespace-nowrap`}>
            + {cfg.createLabel}
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className={`text-center py-16 ${textMuted}`}><div className="text-3xl mb-3">⏳</div><p className="text-sm">กำลังโหลดเอกสาร...</p></div>
        ) : filteredRecords.length === 0 ? (
          <div className={`text-center py-16 ${textMuted}`}>
            <div className="text-4xl mb-3">🚚</div>
            <p className="text-sm font-medium">{search ? 'ไม่พบใบส่งสินค้าที่ค้นหา' : 'ยังไม่มีใบส่งสินค้า'}</p>
            {!search && <button type="button" onClick={handleCreate} className={`mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${acc.btn}`}>+ {cfg.createLabel}</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                  <th className="px-5 py-3 text-left">เลขเอกสาร</th>
                  <th className="px-5 py-3 text-left">วันที่</th>
                  <th className="px-5 py-3 text-left">อ้างอิง SO</th>
                  <th className="px-5 py-3 text-left">สร้างโดย</th>
                  <th className="px-5 py-3 text-right">ยอดรวม (฿)</th>
                  <th className="px-5 py-3 text-left">สถานะ</th>
                  <th className="px-5 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {filteredRecords.map((record) => (
                  <tr key={getRecordKey(record)} className={`transition-colors ${darkMode ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'}`}>
                    <td className="px-5 py-3.5">
                      <button type="button" onClick={() => handleView(record)} className={`font-semibold hover:underline ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                        {record.documentNumber || '-'}
                      </button>
                      {record.referenceNo && <p className={`text-xs mt-0.5 ${textMuted}`}>Ref: {record.referenceNo}</p>}
                    </td>
                    <td className={`px-5 py-3.5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{formatDate(record.documentDate)}</td>
                    <td className={`px-5 py-3.5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{record.referenceNo || '-'}</td>
                    <td className={`px-5 py-3.5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{record.createdBy || '-'}</td>
                    <td className={`px-5 py-3.5 text-right font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(record.total || record.totalAmount)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${acc.badge}`}>{record.status}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => handleEdit(record)} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>แก้ไข</button>
                        {isAdmin && <button type="button" onClick={() => handleDelete(record)} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-red-900/40 text-red-300 hover:bg-red-800/60' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>ลบ</button>}
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
          </div>
        )}
      </div>}

      {/* Editor / View */}
      {editorState && (
        <div ref={editorRef} className="mt-6">
          <AllDocumentForm documentType={editorState.type} initialData={editorState.initialData} onNavigate={handleEditorNavigate} darkMode={darkMode} />
        </div>
      )}
    </>
  );
}
