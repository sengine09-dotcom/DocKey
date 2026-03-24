import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout/Layout';
import KeyDocumentMonitor from './KeyDocumentMonitor';
import KeyInvoice from './KeyInvoice';
import monitorService from '../services/monitorService';
import invoiceService from '../services/invoiceService';
import useThemePreference from '../hooks/useThemePreference';
import { showAppAlert, showAppConfirm } from '../services/dialogService';

type DocumentType = 'monitor' | 'invoice';

const documentConfigs: Record<DocumentType, any> = {
  monitor: {
    icon: '🖥️',
    title: 'Monitor Documents',
    caption: 'Documents Master',
    description: 'เลือกงาน Monitor ก่อน แล้วค่อยเปิดหน้าจัดการหรือสร้างเอกสารใหม่จากจุดเดียว',
    listTitle: 'Recent Monitor Documents',
    loadingText: 'Loading monitors...',
    emptyText: 'No monitor documents found.',
    searchPlaceholder: 'Search monitor ID, customer, PO No',
    page: 'monitor-home',
    detailPage: 'key-monitor',
    rowKey: 'monitorId',
    statusFallback: 'Unprinted',
    columns: [
      { key: 'monitorId', label: 'Monitor ID', primary: true },
      { key: 'customer', label: 'Customer' },
      { key: 'poNo', label: 'PO No' },
      { key: 'poDate', label: 'PO Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    searchFields: ['monitorId', 'customer', 'poNo', 'status'],
    summary: (items: any[]) => ([
      { label: 'Total Documents', value: items.length, tone: 'blue' },
      { label: 'Unprinted', value: items.filter((item: any) => item.status === 'Unprinted').length, tone: 'amber' },
      { label: 'Printed', value: items.filter((item: any) => item.status === 'Printed').length, tone: 'green' },
    ]),
  },
  invoice: {
    icon: '🧾',
    title: 'Invoice Documents',
    caption: 'Documents Master',
    description: 'เลือกงาน Invoice ก่อน แล้วค่อยไปที่หน้าหลักหรือเปิดเอกสารที่ต้องตรวจต่อได้ทันที',
    listTitle: 'Recent Invoice Documents',
    loadingText: 'Loading invoices...',
    emptyText: 'No invoice documents found.',
    searchPlaceholder: 'Search invoice ID, no, customer',
    page: 'invoice-home',
    detailPage: 'key-invoice',
    rowKey: 'invoiceNo',
    statusFallback: 'Pending',
    columns: [
      { key: 'invoiceId', label: 'Invoice ID', primary: true },
      { key: 'invoiceNo', label: 'Invoice No' },
      { key: 'customer', label: 'Customer' },
      { key: 'invoiceDate', label: 'Invoice Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    searchFields: ['invoiceId', 'invoiceNo', 'customer', 'status'],
    summary: (items: any[]) => ([
      { label: 'Total Documents', value: items.length, tone: 'blue' },
      { label: 'Pending', value: items.filter((item: any) => item.status === 'Pending').length, tone: 'amber' },
      { label: 'Paid', value: items.filter((item: any) => item.status === 'Paid').length, tone: 'green' },
    ]),
  },
};

const statToneClasses: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-green-100 text-green-700',
};

const darkStatToneClasses: Record<string, string> = {
  blue: 'bg-blue-500/15 text-blue-300',
  amber: 'bg-amber-500/15 text-amber-300',
  green: 'bg-green-500/15 text-green-300',
};

export default function Documents({ onNavigate = () => { }, currentPage = 'documents', initialData = null }: any) {
  const [darkMode, setDarkMode] = useThemePreference();
  const [selectedType, setSelectedType] = useState<DocumentType>('monitor');
  const [editorState, setEditorState] = useState<{ type: DocumentType; initialData: any } | null>(null);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [docCounts, setDocCounts] = useState({
    monitor: 0, monitorUnprinted: 0,
    invoice: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const buildDocCounts = (nextMonitors: any[], nextInvoices: any[]) => ({
    monitor: nextMonitors.length,
    monitorUnprinted: nextMonitors.filter((item: any) => item.status === 'Unprinted').length,
    invoice: nextInvoices.length,
  });

  useEffect(() => {
    const nextType = initialData?.selectedType;
    if (nextType === 'monitor' || nextType === 'invoice') {
      setSelectedType(nextType);
    }
  }, [initialData]);

  const loadDocuments = async () => {
    setIsLoading(true);
    setError('');

    try {
      const [mon, inv] = await Promise.allSettled([
        monitorService.getAll(),
        invoiceService.getAll(),
      ]);

      const nextMonitors = mon.status === 'fulfilled' ? (mon.value?.data?.data || []) : [];
      const nextInvoices = inv.status === 'fulfilled' ? (inv.value?.data?.data || []) : [];

      setMonitors(nextMonitors);
      setInvoices(nextInvoices);
      setDocCounts(buildDocCounts(nextMonitors, nextInvoices));

      if (mon.status === 'rejected' || inv.status === 'rejected') {
        setError('Some document data could not be loaded completely.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
  }, []);

  useEffect(() => {
    const handleWindowFocus = () => {
      void loadDocuments();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadDocuments();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const formatDate = (value: any) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleDateString('th-TH');
  };

  const config = documentConfigs[selectedType];

  const records = selectedType === 'monitor' ? monitors : invoices;

  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return records;

    return records.filter((item: any) =>
      config.searchFields.some((field: string) => String(item[field] ?? '').toLowerCase().includes(keyword))
    );
  }, [config.searchFields, records, search]);

  const currentSummary = useMemo(() => config.summary(records), [config, records]);

  const handleCreateDocument = () => {
    setEditorState({ type: selectedType, initialData: null });
  };

  const handleOpenRecord = (record: any) => {
    setEditorState({ type: selectedType, initialData: { ...record, __mode: 'view' } });
  };

  const handleEditRecord = (record: any) => {
    setEditorState({ type: selectedType, initialData: { ...record, __mode: 'edit' } });
  };

  const handleDeleteRecord = async (record: any) => {
    const recordId = selectedType === 'monitor' ? record.monitorId : record.invoiceNo;
    const recordLabel = selectedType === 'monitor' ? 'Monitor Document' : 'Invoice';
    const customerLabel = record.customer || '-';

    const confirmed = await showAppConfirm({
      title: `Delete ${recordLabel}`,
      message: `Delete ${recordId}?\n\nCustomer: ${customerLabel}\n\nThis action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      if (selectedType === 'monitor') {
        await monitorService.delete(record.monitorId);
        setMonitors((prev) => prev.filter((item: any) => item.monitorId !== record.monitorId));
      } else {
        await invoiceService.delete(record.invoiceNo);
        setInvoices((prev) => prev.filter((item: any) => item.invoiceNo !== record.invoiceNo));
      }

      setDocCounts((prev) => ({
        ...prev,
        monitor: selectedType === 'monitor' ? Math.max(0, prev.monitor - 1) : prev.monitor,
        monitorUnprinted: selectedType === 'monitor' && record.status === 'Unprinted'
          ? Math.max(0, prev.monitorUnprinted - 1)
          : prev.monitorUnprinted,
        invoice: selectedType === 'invoice' ? Math.max(0, prev.invoice - 1) : prev.invoice,
      }));

      if (editorState?.initialData?.[config.rowKey] === record[config.rowKey]) {
        setEditorState(null);
      }
    } catch (_error) {
      await showAppAlert({
        title: 'Delete Failed',
        message: selectedType === 'monitor' ? 'Failed to delete monitor document.' : 'Failed to delete invoice.',
        tone: 'danger',
      });
    }
  };

  const handleEditorNavigate = (page: string, state?: unknown) => {
    if (page === 'documents') {
      const nextState = (state as any) || {};
      const nextType = nextState.selectedType;

      if (nextType === 'monitor' || nextType === 'invoice') {
        setSelectedType(nextType);
      }

      if (nextState.action === 'save' && nextState.savedRecord) {
        if (nextType === 'monitor') {
          setMonitors((prev) => {
            const existingIndex = prev.findIndex((item: any) => item.monitorId === nextState.savedRecord.monitorId);
            const nextMonitors = existingIndex === -1
              ? [nextState.savedRecord, ...prev]
              : prev.map((item: any, index: number) => (index === existingIndex ? nextState.savedRecord : item));

            setDocCounts(buildDocCounts(nextMonitors, invoices));
            return nextMonitors;
          });
        }

        if (nextType === 'invoice') {
          setInvoices((prev) => {
            const existingIndex = prev.findIndex((item: any) => item.invoiceNo === nextState.savedRecord.invoiceNo);
            const nextInvoices = existingIndex === -1
              ? [nextState.savedRecord, ...prev]
              : prev.map((item: any, index: number) => (index === existingIndex ? nextState.savedRecord : item));

            setDocCounts(buildDocCounts(monitors, nextInvoices));
            return nextInvoices;
          });
        }
      }

      setEditorState(null);
      return;
    }

    onNavigate(page, state);
  };

  const renderStatus = (status: string | undefined) => {
    const value = status || config.statusFallback;
    const tone = value === 'Printed' || value === 'Paid'
      ? (darkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-100 text-green-700')
      : value === 'Overdue'
      ? (darkMode ? 'bg-red-500/15 text-red-300' : 'bg-red-100 text-red-700')
      : (darkMode ? 'bg-yellow-500/15 text-yellow-300' : 'bg-yellow-100 text-yellow-700');

    return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{value}</span>;
  };

  return (
    <Layout
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      onNavigate={onNavigate}
      currentPage={currentPage}
      topBarCaption={`${config.icon} ${config.title}`}
    >
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          {isLoading ? (
            <div className={`text-center py-16 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <div className="text-4xl mb-3">⏳</div>
              <p>Loading...</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSelectedType('monitor')}
                  className={`text-left rounded-xl border p-4 transition-all ${
                    selectedType === 'monitor'
                      ? 'border-blue-500 bg-blue-600 text-white shadow-md'
                      : darkMode
                      ? 'border-gray-700 bg-gray-800 text-gray-300 hover:border-blue-500 hover:bg-gray-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:shadow-sm'
                  }`}
                >
                  <div className="text-2xl mb-2">🖥️</div>
                  <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                    selectedType === 'monitor' ? 'text-blue-100' : darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>Step 1</p>
                  <h2 className={`text-lg font-bold mb-2 ${selectedType === 'monitor' ? 'text-white' : darkMode ? 'text-white' : 'text-gray-900'}`}>Monitor</h2>
                  <p className={`mb-3 text-sm ${selectedType === 'monitor' ? 'text-blue-100' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    เลือกเอกสาร Monitor เพื่อจัดการเอกสารจากหน้าหลักนี้ได้ทันที
                  </p>
                  <div className="flex gap-4">
                    <div className={`flex-1 rounded-lg p-3 ${
                      selectedType === 'monitor'
                        ? 'bg-white/15 border border-white/30'
                        : darkMode
                        ? 'bg-gray-700'
                        : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <p className={`text-xs ${selectedType === 'monitor' ? 'text-blue-100' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total</p>
                      <p className={`text-xl font-bold ${selectedType === 'monitor' ? 'text-white' : darkMode ? 'text-white' : 'text-gray-900'}`}>{docCounts.monitor}</p>
                    </div>
                    <div className={`flex-1 rounded-lg p-3 ${
                      selectedType === 'monitor'
                        ? 'bg-yellow-300/20 border border-yellow-200/40'
                        : darkMode
                        ? 'bg-yellow-900/30'
                        : 'bg-yellow-50 border border-yellow-200'
                    }`}>
                      <p className={`text-xs ${selectedType === 'monitor' ? 'text-yellow-100' : darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>Unprinted</p>
                      <p className={`text-xl font-bold ${selectedType === 'monitor' ? 'text-yellow-100' : darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>{docCounts.monitorUnprinted}</p>
                    </div>
                  </div>
                  <p className={`mt-2 text-xs ${selectedType === 'monitor' ? 'text-blue-100' : darkMode ? 'text-blue-400' : 'text-blue-600'}`}>เลือกแล้ว workflow ด้านล่างจะเปลี่ยนตามประเภทเอกสาร</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedType('invoice')}
                  className={`text-left rounded-xl border p-4 transition-all ${
                    selectedType === 'invoice'
                      ? 'border-purple-500 bg-purple-600 text-white shadow-md'
                      : darkMode
                      ? 'border-gray-700 bg-gray-800 text-gray-300 hover:border-purple-500 hover:bg-gray-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-purple-400 hover:shadow-sm'
                  }`}
                >
                  <div className="text-2xl mb-2">🧾</div>
                  <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                    selectedType === 'invoice' ? 'text-purple-100' : darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>Step 1</p>
                  <h2 className={`text-lg font-bold mb-2 ${selectedType === 'invoice' ? 'text-white' : darkMode ? 'text-white' : 'text-gray-900'}`}>Invoice</h2>
                  <p className={`mb-3 text-sm ${selectedType === 'invoice' ? 'text-purple-100' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    เลือกเอกสาร Invoice เพื่อจัดการเอกสารจากหน้าหลักนี้ได้ทันที
                  </p>
                  <div className="flex gap-4">
                    <div className={`flex-1 rounded-lg p-3 ${
                      selectedType === 'invoice'
                        ? 'bg-white/15 border border-white/30'
                        : darkMode
                        ? 'bg-gray-700'
                        : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <p className={`text-xs ${selectedType === 'invoice' ? 'text-purple-100' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total</p>
                      <p className={`text-xl font-bold ${selectedType === 'invoice' ? 'text-white' : darkMode ? 'text-white' : 'text-gray-900'}`}>{docCounts.invoice}</p>
                    </div>
                  </div>
                  <p className={`mt-2 text-xs ${selectedType === 'invoice' ? 'text-purple-100' : darkMode ? 'text-purple-400' : 'text-purple-600'}`}>เลือกแล้ว workflow ด้านล่างจะเปลี่ยนตามประเภทเอกสาร</p>
                </button>
              </div>

              <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className={`text-sm font-medium ${selectedType === 'monitor' ? (darkMode ? 'text-blue-300' : 'text-blue-700') : (darkMode ? 'text-purple-300' : 'text-purple-700')}`}>
                    {config.icon} {config.caption}
                  </p>
                  <h2 className={`mt-2 text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {config.title}
                  </h2>
                  <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    จัดการเอกสารและเปิดฟอร์มสร้างหรือดูรายละเอียดได้จากหน้าเดียว
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={config.searchPlaceholder}
                    className={`rounded-lg border px-4 py-2 text-sm ${
                      darkMode
                        ? 'border-gray-600 bg-gray-800 text-white placeholder:text-gray-500'
                        : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleCreateDocument}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    Create New
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadDocuments()}
                    className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                      darkMode
                        ? 'border border-gray-600 bg-gray-800 text-gray-100 hover:bg-gray-700'
                        : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Reload
                  </button>
                </div>
              </div>

              {error && (
                <div className={`rounded-xl border px-4 py-3 text-sm ${darkMode ? 'border-amber-500/40 bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className={`rounded-2xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Step 1</p>
                  <h3 className={`mt-2 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Choose document type</h3>
                  <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>เลือก Monitor หรือ Invoice จากการ์ดด้านบนก่อน ระบบจะเปลี่ยนรายการและฟอร์มให้ตรงประเภททันที</p>
                </div>
                <div className={`rounded-2xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Step 2</p>
                  <h3 className={`mt-2 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Create or review here</h3>
                  <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>กด Create New เพื่อเปิดฟอร์มในหน้านี้ หรือกด Open จากรายการล่าสุดเพื่อดูเอกสารเดิมได้ทันที</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {currentSummary.map((item: any) => (
                  <div
                    key={item.label}
                    className={`rounded-2xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}
                  >
                    <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.label}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.value}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? darkStatToneClasses[item.tone] : statToneClasses[item.tone]}`}>
                        {selectedType === 'monitor' ? 'Monitor' : 'Invoice'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {editorState && (
                editorState.type === 'monitor' ? (
                  <KeyDocumentMonitor
                    embedded={true}
                    darkMode={darkMode}
                    setDarkMode={setDarkMode}
                    onNavigate={handleEditorNavigate}
                    initialData={editorState.initialData}
                  />
                ) : (
                  <KeyInvoice
                    embedded={true}
                    darkMode={darkMode}
                    setDarkMode={setDarkMode}
                    onNavigate={handleEditorNavigate}
                    initialData={editorState.initialData}
                  />
                )
              )}

              <div className={`overflow-hidden rounded-2xl border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
                <div className={`flex items-center justify-between gap-4 px-6 py-5 ${darkMode ? 'border-b border-gray-700 bg-gray-800' : 'border-b border-gray-200 bg-white'}`}>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Step 2</p>
                    <h3 className={`mt-1 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{config.listTitle}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Latest records</div>
                    <button
                      type="button"
                      onClick={handleCreateDocument}
                      className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      Add {selectedType === 'monitor' ? 'Monitor' : 'Invoice'}
                    </button>
                  </div>
                </div>

                <div className={`grid px-6 py-4 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-600'}`} style={{ gridTemplateColumns: `repeat(${config.columns.length}, minmax(0, 1fr)) 240px` }}>
                  {config.columns.map((column: any) => (
                    <div key={column.key}>{column.label}</div>
                  ))}
                  <div>Action</div>
                </div>

                {filteredRecords.length === 0 ? (
                  <div className={`px-6 py-12 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {config.emptyText}
                  </div>
                ) : (
                  filteredRecords.map((item: any) => (
                    <div
                      key={item[config.rowKey]}
                      className={`grid items-center px-6 py-4 text-sm ${
                        darkMode ? 'border-t border-gray-700 text-gray-100' : 'border-t border-gray-200 text-gray-900'
                      }`}
                      style={{ gridTemplateColumns: `repeat(${config.columns.length}, minmax(0, 1fr)) 240px` }}
                    >
                      {config.columns.map((column: any) => {
                        if (column.type === 'status') {
                          return <div key={column.key}>{renderStatus(item[column.key])}</div>;
                        }

                        const value = column.type === 'date' ? formatDate(item[column.key]) : (item[column.key] || '-');
                        return (
                          <div
                            key={column.key}
                            className={column.primary ? 'font-semibold' : darkMode ? 'text-gray-300' : 'text-gray-700'}
                          >
                            {value}
                          </div>
                        );
                      })}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenRecord(item)}
                          className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditRecord(item)}
                          className={`rounded-md px-3 py-2 text-xs font-medium ${
                            darkMode
                              ? 'bg-gray-700 text-gray-100 hover:bg-gray-600'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteRecord(item)}
                          className="rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
