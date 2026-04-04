import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout/Layout';
import AllDocumentForm from '../components/Documents/AllDocumentForm';
import documentService, { MainDocumentType } from '../services/documentService';
import codeService from '../services/codeService';
import useThemePreference from '../hooks/useThemePreference';
import { showAppAlert, showAppConfirm } from '../services/dialogService';

const DOCUMENT_TYPES: MainDocumentType[] = ['quotation', 'invoice', 'receipt', 'purchase_order', 'work_order'];
const QUOTATION_STATUS_FILTER_OPTIONS = ['All', 'Draft', 'Sent', 'Waiting Customer', 'Follow Up', 'Negotiating', 'Approved', 'Won', 'Rejected', 'Lost', 'Expired', 'Converted'];

const documentTypeConfigs: Record<MainDocumentType, any> = {
  quotation: {
    icon: '📝',
    label: 'Quotation',
    title: 'Quotation Documents',
    description: 'Quotation records stored in the central Document model.',
    accent: 'blue',
    createLabel: 'Create Quotation',
  },
  invoice: {
    icon: '🧾',
    label: 'Invoice',
    title: 'Invoice Documents',
    description: 'Invoice records managed from the shared Document model.',
    accent: 'emerald',
    createLabel: 'Create Invoice',
  },
  receipt: {
    icon: '💵',
    label: 'Receipt',
    title: 'Receipt Documents',
    description: 'Receipt records split by documentType inside the Document model.',
    accent: 'amber',
    createLabel: 'Create Receipt',
  },
  purchase_order: {
    icon: '📦',
    label: 'PO',
    title: 'Purchase Order Documents',
    description: 'Purchase orders managed as Document records.',
    accent: 'violet',
    createLabel: 'Create PO',
  },
  work_order: {
    icon: '🛠️',
    label: 'Work Order',
    title: 'Work Order Documents',
    description: 'Work orders separated by documentType in the Document table.',
    accent: 'rose',
    createLabel: 'Create Work Order',
  },
};

const documentTypeGroups = [
  {
    title: 'Commercial Documents',
    subtitle: 'Quotation / Invoice / Receipt',
    types: ['quotation', 'invoice', 'receipt'] as MainDocumentType[],
  },
  {
    title: 'Operations Documents',
    subtitle: 'PO / Work Order',
    types: ['purchase_order', 'work_order'] as MainDocumentType[],
  },
];

const cardToneClasses: Record<string, string> = {
  blue: 'border-blue-500 bg-blue-600 text-white',
  emerald: 'border-emerald-500 bg-emerald-600 text-white',
  amber: 'border-amber-500 bg-amber-500 text-white',
  violet: 'border-violet-500 bg-violet-600 text-white',
  rose: 'border-rose-500 bg-rose-600 text-white',
};

const badgeToneClasses: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  violet: 'bg-violet-100 text-violet-700',
  rose: 'bg-rose-100 text-rose-700',
};

const darkBadgeToneClasses: Record<string, string> = {
  blue: 'bg-blue-500/15 text-blue-300',
  emerald: 'bg-emerald-500/15 text-emerald-300',
  amber: 'bg-amber-500/15 text-amber-300',
  violet: 'bg-violet-500/15 text-violet-300',
  rose: 'bg-rose-500/15 text-rose-300',
};

const createEmptyCollections = () => ({
  quotation: [],
  invoice: [],
  receipt: [],
  purchase_order: [],
  work_order: [],
}) as Record<MainDocumentType, any[]>;

const isMainDocumentType = (value: unknown): value is MainDocumentType => DOCUMENT_TYPES.includes(String(value || '').trim().toLowerCase().replace(/-/g, '_') as MainDocumentType);

const normalizeMainDocumentType = (value: unknown): MainDocumentType | null => {
  const normalized = String(value || '').trim().toLowerCase().replace(/-/g, '_');
  return isMainDocumentType(normalized) ? normalized : null;
};

const getRecordKey = (record: any) => record?.id || record?.documentId || record?.documentNumber;

const formatDate = (value: any) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('th-TH');
};

const formatCurrency = (value: any) => {
  const amount = Number(value || 0);
  return amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const toDateInputValue = (value: any) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

const getSubtypeDetails = (record: any) => {
  if (record?.documentType === 'quotation') {
    return [
      { label: 'Quotation Status', value: record.status || 'Draft' },
      { label: 'Margin %', value: `${Number(record.margin || 0).toFixed(2)}%` },
      { label: 'Valid Until', value: formatDate(record.validUntil) },
      { label: 'Attention To', value: record.attentionTo || '-' },
    ];
  }

  if (record?.documentType === 'invoice') {
    return [
      { label: 'Due Date', value: formatDate(record.dueDate) },
      { label: 'DO No', value: record.doNo || '-' },
    ];
  }

  if (record?.documentType === 'receipt') {
    return [
      { label: 'Received Date', value: formatDate(record.receivedDate) },
      { label: 'Payment Ref', value: record.paymentReference || '-' },
    ];
  }

  if (record?.documentType === 'purchase_order') {
    return [
      { label: 'Supplier', value: record.supplierName || '-' },
      { label: 'Delivery Date', value: formatDate(record.deliveryDate) },
    ];
  }

  return [
    { label: 'Scheduled Date', value: formatDate(record?.scheduledDate) },
    { label: 'Assigned To', value: record?.assignedTo || '-' },
  ];
};

const replaceRecord = (records: any[], nextRecord: any) => {
  const nextKey = getRecordKey(nextRecord);
  const existingIndex = records.findIndex((record) => getRecordKey(record) === nextKey || record.documentNumber === nextRecord.documentNumber);

  if (existingIndex === -1) {
    return [nextRecord, ...records];
  }

  return records.map((record, index) => (index === existingIndex ? nextRecord : record));
};


const isLinkedQuotation = (record: any) => {
  if (record?.documentType !== 'quotation') return false;
  const status = String(record?.status || '').trim().toLowerCase();
  return status === 'converted' || status === 'link invoice';
};

const isLinkedInvoice = (record: any) => {
  if (record?.documentType !== 'invoice') return false;
  const status = String(record?.status || '').trim().toLowerCase();
  return status === 'link receipt';
};

const buildPreviewDocumentNumber = (type: MainDocumentType, records: any[]) => {
  const prefixes: Record<MainDocumentType, string> = {
    quotation: 'QT',
    invoice: 'INV',
    receipt: 'RC',
    purchase_order: 'PO',
    work_order: 'WO',
  };

  const yearPart = String(new Date().getFullYear()).slice(-2);
  const prefix = `${prefixes[type]}-${yearPart}-`;
  const maxSequence = records.reduce((currentMax, record) => {
    const documentNumber = String(record?.documentNumber || '');
    if (!documentNumber.startsWith(prefix)) {
      return currentMax;
    }

    const parts = documentNumber.split('-');
    const sequence = Number(parts[parts.length - 1] || 0);
    return Number.isFinite(sequence) ? Math.max(currentMax, sequence) : currentMax;
  }, 0);

  return `${prefix}${String(maxSequence + 1).padStart(6, '0')}`;
};

const buildInvoiceDraftFromQuotation = (quotation: any) => {
  const quotationNumber = String(quotation?.documentNumber || '').trim();
  const quotationTitle = String(quotation?.title || '').trim();
  const quotationRemark = String(quotation?.remark || '').trim();
  const linkRemark = quotationNumber ? `Linked from quotation ${quotationNumber}` : 'Linked from quotation';

  return {
    __mode: 'create',
    title: quotationTitle ? `Invoice for ${quotationTitle}` : 'Invoice',
    documentDate: toDateInputValue(quotation?.documentDate) || toDateInputValue(new Date()),
    customer: quotation?.customer || '',
    billTo: quotation?.billTo || quotation?.customerName || '',
    shipTo: quotation?.shipTo || '',
    destination: quotation?.destination || quotation?.shipTo || '',
    paymentTerm: quotation?.paymentTerm || '',
    paymentMethod: quotation?.paymentMethod || 'Bank Transfer',
    referenceNo: quotationNumber,
    status: 'Pending',
    remark: quotationRemark ? `${quotationRemark}\n\n${linkRemark}` : linkRemark,
    taxRate: String(quotation?.taxRate ?? 0),
    dueDate: toDateInputValue(quotation?.validUntil),
    doNo: '',
    margin: String(quotation?.margin ?? 0),
    linkedQuotationId: quotation?.documentId || quotation?.id || '',
    linkedQuotationNumber: quotationNumber,
    items: Array.isArray(quotation?.items)
      ? quotation.items.map((item: any) => ({
        id: item?.id || '',
        productCode: item?.productCode || '',
        productName: item?.productName || '',
        packing: item?.packing || '',
        quantity: item?.quantity || '',
        cost: item?.cost || '',
        margin: item?.margin || '',
        sellingPrice: item?.sellingPrice || '',
        totalCost: item?.totalCost || '',
        totalSellingPrice: item?.totalSellingPrice || '',
        unitId: item?.unitId || '',
      }))
      : [],
  };
};

const buildReceiptDraftFromInvoice = (invoice: any) => {
  const invoiceNumber = String(invoice?.documentNumber || '').trim();
  const invoiceTitle = String(invoice?.title || '').trim();
  const invoiceRemark = String(invoice?.remark || '').trim();
  const linkRemark = invoiceNumber ? `Linked from invoice ${invoiceNumber}` : 'Linked from invoice';
  const today = toDateInputValue(new Date());

  return {
    __mode: 'create',
    title: invoiceTitle ? `Receipt for ${invoiceTitle}` : 'Receipt',
    documentDate: today,
    customer: invoice?.customer || '',
    billTo: invoice?.billTo || invoice?.customerName || '',
    shipTo: invoice?.shipTo || '',
    destination: invoice?.destination || invoice?.shipTo || '',
    paymentTerm: invoice?.paymentTerm || '',
    paymentMethod: invoice?.paymentMethod || '',
    referenceNo: invoiceNumber,
    status: 'Received',
    remark: invoiceRemark ? `${invoiceRemark}\n\n${linkRemark}` : linkRemark,
    taxRate: String(invoice?.taxRate ?? 0),
    receivedDate: today,
    paymentReference: '',
    linkedInvoiceId: invoice?.documentId || invoice?.id || '',
    linkedInvoiceNumber: invoiceNumber,
    items: Array.isArray(invoice?.items)
      ? invoice.items.map((item: any) => ({
        id: item?.id || '',
        productCode: item?.productCode || '',
        productName: item?.productName || '',
        quantity: item?.quantity || '',
        margin: item?.margin || '',
        sellingPrice: item?.sellingPrice || '',
        totalCost: item?.totalCost || '',
        totalSellingPrice: item?.totalSellingPrice || '',
        unitId: item?.unitId || '',
      }))
      : [],
  };
};

export default function Documents({ onNavigate = () => { }, currentPage = 'documents', initialData = null }: any) {
  const [darkMode, setDarkMode] = useThemePreference();
  const [selectedType, setSelectedType] = useState<MainDocumentType>('quotation');
  const [documentsByType, setDocumentsByType] = useState<Record<MainDocumentType, any[]>>(createEmptyCollections);
  const [customerCodes, setCustomerCodes] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [editorState, setEditorState] = useState<{ type: MainDocumentType; initialData: any } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const nextType = normalizeMainDocumentType(initialData?.selectedType);
    if (nextType) {
      setSelectedType(nextType);
    }
  }, [initialData]);

  useEffect(() => {
    const loadCustomerCodes = async () => {
      try {
        const response = await codeService.getAll('customer');
        setCustomerCodes(response?.data?.data || []);
      } catch {
        setCustomerCodes([]);
      }
    };

    void loadCustomerCodes();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    setError('');

    try {
      const results = await Promise.allSettled(DOCUMENT_TYPES.map((type) => documentService.getAll(type)));
      const nextCollections = createEmptyCollections();
      results.forEach((result, index) => {
        const type = DOCUMENT_TYPES[index];
        if (result.status === 'fulfilled') {
          nextCollections[type] = result.value?.data?.data || [];
        }
      });
      setDocumentsByType(nextCollections);

      if (results.some((result) => result.status === 'rejected')) {
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

  const config = documentTypeConfigs[selectedType];
  const records = documentsByType[selectedType] || [];

  const getRecordParty = (record: any) => {
    const customerValue = String(record?.customer || '').trim();
    const matchedCustomer = customerCodes.find((customer) => customer.customerCode === customerValue);
    return matchedCustomer?.customerName
      || matchedCustomer?.shortName
      || record?.customerName
      || record?.supplierName
      || record?.attentionTo
      || record?.assignedTo
      || '-';
  };

  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesKeyword = !keyword || [
        record.documentNumber,
        record.title,
        record.customerName,
        record.customer,
        record.referenceNo,
        record.status,
        record.remark,
        record.supplierName,
        record.paymentReference,
        record.assignedTo,
      ].some((value) => String(value ?? '').toLowerCase().includes(keyword));

      const matchesStatus = selectedType !== 'quotation'
        || statusFilter === 'All'
        || String(record.status || '').trim() === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [records, search, selectedType, statusFilter]);

  const summary = useMemo(() => {
    const totalAmount = records.reduce((sum, record) => sum + Number(record.total || 0), 0);
    const completedCount = records.filter((record) => ['green', 'blue'].includes(record.color)).length;
    const withItemsCount = records.filter((record) => Number(record.itemCount || 0) > 0).length;

    return [
      { label: 'Total Documents', value: records.length },
      { label: 'Total Amount', value: `฿${formatCurrency(totalAmount)}` },
      { label: 'With Items', value: withItemsCount },
      { label: 'Active / Completed', value: completedCount },
    ];
  }, [records]);

  const handleSelectType = (type: MainDocumentType) => {
    setSelectedType(type);
    setSelectedRecord(null);
    setEditorState(null);
    setSearch('');
    setStatusFilter('All');
  };

  const handleCreateDocument = async () => {
    setSelectedRecord(null);
    setEditorState({ type: selectedType, initialData: null });
  };

  const handleViewRecord = async (record: any) => {
    setEditorState(null);
    try {
      const identifier = record?.documentId || record?.id || record?.documentNumber;
      if (!identifier) {
        setSelectedRecord(record);
        return;
      }
      const response = await documentService.getById(record.documentType || selectedType, identifier);
      setSelectedRecord(response?.data?.data || record);
    } catch {
      setSelectedRecord(record);
    }
  };

  const handleEditRecord = async (record: any) => {
    setSelectedRecord(null);
    setEditorState({ type: selectedType, initialData: { ...record, __mode: 'edit' } });
  };

  const handleLinkQuotationToInvoice = (quotation: any) => {
    setSelectedType('invoice');
    setSelectedRecord(null);
    setEditorState({
      type: 'invoice',
      initialData: buildInvoiceDraftFromQuotation(quotation),
    });
  };

  const handleLinkInvoiceToReceipt = (invoice: any) => {
    setSelectedType('receipt');
    setSelectedRecord(null);
    setEditorState({
      type: 'receipt',
      initialData: buildReceiptDraftFromInvoice(invoice),
    });
  };

  const handleDeleteRecord = async (record: any) => {
    const documentId = getRecordKey(record);
    const confirmed = await showAppConfirm({
      title: `Delete ${config.label}`,
      message: `Delete ${record.documentNumber || documentId}?\n\nThis action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      await documentService.delete(selectedType, documentId);
      setDocumentsByType((prev) => ({
        ...prev,
        [selectedType]: prev[selectedType].filter((item) => getRecordKey(item) !== documentId),
      }));

      if (getRecordKey(selectedRecord) === documentId) {
        setSelectedRecord(null);
      }
    } catch (_error) {
      await showAppAlert({
        title: 'Delete Failed',
        message: `Failed to delete ${config.label.toLowerCase()} document.`,
        tone: 'danger',
      });
    }
  };

  const handleEditorNavigate = (page: string, state?: unknown) => {
    if (page === 'documents') {
      const nextState = (state as any) || {};
      const nextType = normalizeMainDocumentType(nextState.selectedType);

      if (nextType) {
        setSelectedType(nextType);
      }

      if (nextState.action === 'save' && nextState.savedRecord) {
        setDocumentsByType((prev) => ({
          ...prev,
          [(nextType || selectedType) as MainDocumentType]: replaceRecord(prev[(nextType || selectedType) as MainDocumentType], nextState.savedRecord),
        }));
        setSelectedRecord(nextState.savedRecord);
        void loadDocuments();
      }

      setEditorState(null);
      return;
    }

    onNavigate(page, state);
  };

  const renderStatus = (record: any) => {
    const status = record?.status || 'Draft';
    const tone = record?.color === 'green'
      ? (darkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-100 text-green-700')
      : record?.color === 'red'
        ? (darkMode ? 'bg-red-500/15 text-red-300' : 'bg-red-100 text-red-700')
        : record?.color === 'blue'
          ? (darkMode ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-100 text-blue-700')
          : (darkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-700');

    return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
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
              <p>Loading documents...</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="space-y-4">
                {documentTypeGroups.map((group) => (
                  <div key={group.title} className={`rounded-2xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
                    <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{group.subtitle}</p>
                        <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{group.title}</h2>
                      </div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Documents are now separated by documentType from the shared Document model.</p>
                    </div>

                    <div className={`grid gap-4 ${group.types.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                      {group.types.map((type) => {
                        const typeConfig = documentTypeConfigs[type];
                        const isActive = selectedType === type;
                        const count = documentsByType[type]?.length || 0;

                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleSelectType(type)}
                            className={`rounded-2xl border p-4 text-left transition-all ${isActive
                              ? `${cardToneClasses[typeConfig.accent]} shadow-md`
                              : darkMode
                                ? 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500'
                                : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400'
                              }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="text-2xl">{typeConfig.icon}</div>
                                <h3 className={`mt-3 text-lg font-semibold ${isActive ? 'text-white' : darkMode ? 'text-white' : 'text-gray-900'}`}>{typeConfig.label}</h3>
                                <p className={`mt-2 text-sm ${isActive ? 'text-white/85' : darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{typeConfig.description}</p>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isActive ? 'bg-white/15 text-white' : darkMode ? darkBadgeToneClasses[typeConfig.accent] : badgeToneClasses[typeConfig.accent]}`}>
                                {count} docs
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{config.icon} Shared Document Workspace</p>
                  <h2 className={`mt-2 text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{config.title}</h2>
                  <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>เอกสารทั้งหมดในหน้านี้อ้างอิงจาก Document model และใช้ documentType เป็นตัวแยกประเภท</p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {selectedType === 'quotation' ? (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Quotation Status</span>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={`rounded-lg border px-4 py-2 text-sm ${darkMode
                          ? 'border-gray-600 bg-gray-800 text-white'
                          : 'border-gray-300 bg-white text-gray-900'
                          }`}
                      >
                        {QUOTATION_STATUS_FILTER_OPTIONS.map((statusOption) => (
                          <option key={statusOption} value={statusOption}>{statusOption}</option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Search ${config.label.toLowerCase()} number, title, customer, status`}
                    className={`rounded-lg border px-4 py-2 text-sm ${darkMode
                      ? 'border-gray-600 bg-gray-800 text-white placeholder:text-gray-500'
                      : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={handleCreateDocument}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    {config.createLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadDocuments()}
                    className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${darkMode
                      ? 'border border-gray-600 bg-gray-800 text-gray-100 hover:bg-gray-700'
                      : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    Reload
                  </button>
                </div>
              </div>

              {error ? (
                <div className={`rounded-xl border px-4 py-3 text-sm ${darkMode ? 'border-amber-500/40 bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                  {error}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {summary.map((item) => (
                  <div key={item.label} className={`rounded-2xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.label}</p>
                    <p className={`mt-3 text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.value}</p>
                    <div className="mt-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? darkBadgeToneClasses[config.accent] : badgeToneClasses[config.accent]}`}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {editorState ? (
                <AllDocumentForm
                  darkMode={darkMode}
                  onNavigate={handleEditorNavigate}
                  initialData={editorState.initialData}
                  documentType={editorState.type}
                  suggestedDocumentNumber={buildPreviewDocumentNumber(editorState.type, documentsByType[editorState.type] || [])}
                />
              ) : null}

              {selectedRecord && !editorState ? (
                <div className={`rounded-2xl border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
                  <div className={`flex flex-col gap-4 border-b px-6 py-5 ${darkMode ? 'border-gray-700' : 'border-gray-200'} lg:flex-row lg:items-start lg:justify-between`}>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{documentTypeConfigs[selectedRecord.documentType]?.icon || config.icon}</span>
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{documentTypeConfigs[selectedRecord.documentType]?.label || config.label}</p>
                          <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedRecord.documentNumber || '-'}</h3>
                        </div>
                      </div>
                      <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{selectedRecord.title || 'Untitled document'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {renderStatus(selectedRecord)}
                      {selectedRecord.documentType === 'quotation' ? (
                        <button
                          type="button"
                          onClick={() => handleLinkQuotationToInvoice(selectedRecord)}
                          disabled={isLinkedQuotation(selectedRecord)}
                          className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${isLinkedQuotation(selectedRecord) ? 'cursor-not-allowed bg-gray-500' : 'bg-violet-600 hover:bg-violet-700'}`}
                        >
                          {isLinkedQuotation(selectedRecord) ? 'Linked' : 'Link to Invoice'}
                        </button>
                      ) : null}
                      {selectedRecord.documentType === 'invoice' ? (
                        <button
                          type="button"
                          onClick={() => handleLinkInvoiceToReceipt(selectedRecord)}
                          disabled={isLinkedInvoice(selectedRecord)}
                          className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${isLinkedInvoice(selectedRecord) ? 'cursor-not-allowed bg-gray-500' : 'bg-amber-600 hover:bg-amber-700'}`}
                        >
                          {isLinkedInvoice(selectedRecord) ? 'Linked' : 'Link to Receipt'}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void handleEditRecord(selectedRecord)}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Edit {documentTypeConfigs[selectedRecord.documentType]?.label || config.label}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6 px-6 py-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {[
                        { label: 'Document Date', value: formatDate(selectedRecord.documentDate) },
                        { label: 'Customer / Party', value: getRecordParty(selectedRecord) },
                        { label: 'Reference No', value: selectedRecord.referenceNo || '-' },
                        { label: 'Total Amount', value: `฿${formatCurrency(selectedRecord.total)}` },
                        { label: 'Bill To', value: selectedRecord.billTo || '-' },
                        { label: 'Ship To', value: selectedRecord.shipTo || '-' },
                        { label: 'Payment Method', value: selectedRecord.paymentMethod || '-' },
                        { label: 'Items', value: selectedRecord.itemCount || 0 },
                        ...getSubtypeDetails(selectedRecord),
                      ].map((field) => (
                        <div key={`${field.label}-${field.value}`} className={`rounded-xl border px-4 py-3 ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                          <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{field.label}</p>
                          <p className={`mt-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{field.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className={`rounded-xl border px-4 py-4 ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Remark</p>
                      <p className={`mt-2 text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{selectedRecord.remark || '-'}</p>
                    </div>

                    <div className={`overflow-hidden rounded-2xl border 
                      ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
                      <div className={`grid px-4 py-3 text-xs font-semibold uppercase tracking-wide 
                        ${darkMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-50 text-gray-600'}`}
                        style={{ gridTemplateColumns: '56px 56px minmax(200px,1.8fr) 56px 120px 120px 120px 120px 100px 100px 100px' }}>
                        <div>Line</div>
                        <div>Code</div>
                        <div>Product Name</div>
                        <div>Qty</div>
                        <div>Margin</div>
                        <div>Cost</div>
                        <div>Selling Price</div>
                        <div>Total Cost</div>
                        <div>Unit</div>
                        <div>Total</div>
                      </div>

                      {selectedRecord.items?.length ? selectedRecord.items.map((item: any, index: number) => (
                        <div key={`document-item-${selectedRecord.documentId}-${index}`}
                          className={`grid px-4 py-3 text-sm 
                          ${darkMode ? 'border-t border-gray-700 text-gray-200' :
                              'border-t border-gray-200 text-gray-800'}`}
                          style={{ gridTemplateColumns: '56px 56px minmax(200px,1.8fr) 56px 120px 120px 120px 120px 100px 100px 100px' }}>
                          <div>{item.lineNo || index + 1}</div>
                          <div>{item.productCode || '-'}</div>
                          <div>{item.productName || '-'}</div>
                          <div>{item.quantity || '-'}</div>
                          <div>{item.margin || '-'}</div>
                          <div>{item.cost ?
                            Number(item.cost).toLocaleString(
                              'en-US',
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : '-'}
                          </div>
                          <div>{item.sellingPrice ?
                            Number(item.sellingPrice).toLocaleString(
                              'en-US',
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : '-'}
                          </div>
                          <div>{item.totalCost ?
                            Number(item.totalCost).toLocaleString(
                              'en-US',
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : '-'}
                          </div>
                          <div>{item.unit || '-'}</div>
                          <div>{item.totalSellingPrice ?
                            Number(item.totalSellingPrice).toLocaleString('en-US',
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : '-'}
                          </div>
                        </div>
                      )) : (
                        <div className={`px-4 py-8 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          No line items recorded for this document.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className={`overflow-hidden rounded-2xl border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
                <div className={`flex items-center justify-between gap-4 border-b px-6 py-5 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Document List</p>
                    <h3 className={`mt-1 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{config.title}</h3>
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{filteredRecords.length} visible of {records.length}</div>
                </div>

                <div className={`grid px-6 py-4 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-50 text-gray-600'}`} style={{ gridTemplateColumns: 'minmax(140px, 1.1fr) minmax(180px, 1.3fr) minmax(140px, 1fr) 120px 120px 140px 340px' }}>
                  <div>Document No</div>
                  <div>Title</div>
                  <div>Customer / Party</div>
                  <div>Date</div>
                  <div>Status</div>
                  <div>Total</div>
                  <div>Action</div>
                </div>

                {filteredRecords.length === 0 ? (
                  <div className={`px-6 py-12 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No {config.label.toLowerCase()} documents found.
                  </div>
                ) : (
                  filteredRecords.map((record) => (
                    <div key={getRecordKey(record)} className={`grid items-center px-6 py-4 text-sm ${darkMode ? 'border-t border-gray-700 text-gray-100' : 'border-t border-gray-200 text-gray-900'}`} style={{ gridTemplateColumns: 'minmax(140px, 1.1fr) minmax(180px, 1.3fr) minmax(140px, 1fr) 120px 120px 140px 340px' }}>
                      <div className="font-semibold">{record.documentNumber || '-'}</div>
                      <div className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{record.title || '-'}</div>
                      <div className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{getRecordParty(record)}</div>
                      <div>{formatDate(record.documentDate)}</div>
                      <div>{renderStatus(record)}</div>
                      <div>฿{formatCurrency(record.total)}</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button"
                          onClick={() => handleViewRecord(record)}
                          className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700">
                          View
                        </button>
                        {record.documentType === 'quotation' ? (
                          <button
                            type="button"
                            onClick={() => handleLinkQuotationToInvoice(record)}
                            disabled={isLinkedQuotation(record)}
                            className={`rounded-md px-3 py-2 text-xs font-medium text-white 
                            ${isLinkedQuotation(record) ? 'cursor-not-allowed bg-gray-500' :
                                'bg-violet-600 hover:bg-violet-700'}`}>
                            {isLinkedQuotation(record) ? 'Linked' : 'Link Invoice'}
                          </button>
                        ) : null}
                        {record.documentType === 'invoice' ? (
                          <button
                            type="button"
                            onClick={() => handleLinkInvoiceToReceipt(record)}
                            disabled={isLinkedInvoice(record)}
                            className={`rounded-md px-3 py-2 text-xs font-medium text-white ${isLinkedInvoice(record) ? 'cursor-not-allowed bg-gray-500' : 'bg-amber-600 hover:bg-amber-700'}`}
                          >
                            {isLinkedInvoice(record) ? 'Linked' : 'Link Receipt'}
                          </button>
                        ) : null}
                        <button type="button" onClick={() => void handleEditRecord(record)} className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700">Edit</button>
                        <button type="button" onClick={() => void handleDeleteRecord(record)} className="rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700">Delete</button>
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
