import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout/Layout';
import codeService from '../services/codeService';
import useThemePreference from '../hooks/useThemePreference';
import { showAppConfirm } from '../services/dialogService';

const usedOptions = [
  { value: 'Y', label: 'Active' },
  { value: 'N', label: 'Inactive' },
];

const yesNoOptions = [
  { value: 'Y', label: 'Yes' },
  { value: 'N', label: 'No' },
];

const pageConfigs: Record<string, any> = {
  'customer-code': {
    apiType: 'customer',
    title: 'Customer Codes',
    icon: '🏢',
    cardDescription: 'เลือกรหัสลูกค้าเพื่อจัดการ master data สำหรับงาน Monitor และ Invoice',
    description: 'Master customer codes used in Monitor and Invoice documents.',
    searchPlaceholder: 'Search customer code or name',
    listTitle: 'Recent Customer Codes',
    createLabel: 'Add Customer Code',
    idField: 'customerId',
    nameField: 'customerName',
    columns: [
      { key: 'customerId', label: 'Code' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'shortName', label: 'Short Name' },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'used', label: 'Status', type: 'status' },
    ],
    fields: [
      { key: 'customerId', label: 'Customer ID', required: true },
      { key: 'agentId', label: 'Agent ID' },
      { key: 'customerName', label: 'Customer Name', required: true },
      { key: 'shortName', label: 'Short Name' },
      { key: 'registerDate', label: 'Register Date', type: 'date' },
      { key: 'registrationNo', label: 'Registration No' },
      { key: 'address', label: 'Address', type: 'textarea', fullWidth: true },
      { key: 'phone', label: 'Phone' },
      { key: 'fax', label: 'Fax' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'creditLimit', label: 'Credit Limit', type: 'number', step: '0.0001' },
      { key: 'idTerm', label: 'Payment Term', type: 'select', loadOptionsFrom: 'paymentTerm' },
      { key: 'internalTerm', label: 'Internal Term', type: 'number' },
      { key: 'remark', label: 'Remark', type: 'textarea', fullWidth: true },
      { key: 'used', label: 'Status', type: 'select', options: usedOptions },
      { key: 'totalShare', label: 'Total Share', type: 'number', step: '0.0001' },
      { key: 'gstId', label: 'GST ID' },
      { key: 'isGuarantee', label: 'Guarantee Flag', type: 'number' },
      { key: 'guaranteePrice', label: 'Guarantee Price', type: 'number', step: '0.0001' },
      { key: 'guaranteeDateStart', label: 'Guarantee Start', type: 'date' },
      { key: 'guaranteeDateEnd', label: 'Guarantee End', type: 'date' },
    ],
    initialValues: {
      customerId: '', agentId: '', customerName: '', shortName: '', registerDate: '', registrationNo: '', address: '', phone: '', fax: '', email: '', contactPerson: '', creditLimit: '', idTerm: '', internalTerm: '', remark: '', used: 'Y', totalShare: '', gstId: '', isGuarantee: '', guaranteePrice: '', guaranteeDateStart: '', guaranteeDateEnd: '',
    },
  },
  'product-code': {
    apiType: 'product',
    title: 'Product Codes',
    icon: '📦',
    cardDescription: 'เลือกรหัสสินค้าเพื่อดูและจัดการข้อมูลที่ใช้ในรายการเอกสาร',
    description: 'Master product codes for line items in Monitor and Invoice documents.',
    searchPlaceholder: 'Search product code or product name',
    listTitle: 'Recent Product Codes',
    createLabel: 'Add Product Code',
    idField: 'productId',
    nameField: 'productName',
    columns: [
      { key: 'productId', label: 'Code' },
      { key: 'productName', label: 'Product Name' },
      { key: 'type', label: 'Type' },
      { key: 'marking', label: 'Marking' },
      { key: 'used', label: 'Status', type: 'status' },
    ],
    fields: [
      { key: 'productId', label: 'Product ID', required: true },
      { key: 'productName', label: 'Product Name', required: true },
      { key: 'marking', label: 'Marking' },
      { key: 'type', label: 'Type' },
      { key: 'bagSize', label: 'Bag Size' },
      { key: 'pWeight', label: 'Weight', type: 'number', step: '0.01' },
      { key: 'comValue', label: 'Com Value' },
      { key: 'description', label: 'Description', type: 'textarea', fullWidth: true },
      { key: 'idSupplier', label: 'Supplier ID' },
      { key: 'showInStock', label: 'Show In Stock', type: 'select', options: yesNoOptions },
      { key: 'used', label: 'Status', type: 'select', options: usedOptions },
    ],
    initialValues: {
      productId: '', productName: '', marking: '', type: '', bagSize: '', pWeight: '', comValue: '', description: '', idSupplier: '', showInStock: 'Y', used: 'Y',
    },
  },
  'destination-code': {
    apiType: 'destination',
    title: 'Destination Codes',
    icon: '📍',
    cardDescription: 'เลือกปลายทางเพื่อจัดการข้อมูล shipment และ delivery reference',
    description: 'Master destinations used for shipment and delivery references.',
    searchPlaceholder: 'Search destination code or name',
    listTitle: 'Recent Destination Codes',
    createLabel: 'Add Destination Code',
    idField: 'destId',
    nameField: 'destination',
    columns: [
      { key: 'destId', label: 'Code' },
      { key: 'destination', label: 'Destination' },
      { key: 'location', label: 'Location' },
      { key: 'used', label: 'Status', type: 'status' },
    ],
    fields: [
      { key: 'destId', label: 'Destination ID', required: true },
      { key: 'destination', label: 'Destination', required: true },
      { key: 'location', label: 'Location' },
      { key: 'used', label: 'Status', type: 'select', options: usedOptions },
    ],
    initialValues: {
      destId: '', destination: '', location: '', used: 'Y',
    },
  },
  'payment-term-code': {
    apiType: 'payment-term',
    title: 'Payment Term Codes',
    icon: '💳',
    cardDescription: 'เลือก payment term เพื่อดูเงื่อนไขเครดิตที่ใช้ในเอกสารทั้งหมด',
    description: 'Master payment terms used for monitor and invoice documents.',
    searchPlaceholder: 'Search term code or name',
    listTitle: 'Recent Payment Term Codes',
    createLabel: 'Add Payment Term Code',
    idField: 'termId',
    nameField: 'termName',
    columns: [
      { key: 'termId', label: 'Code' },
      { key: 'termName', label: 'Term Name' },
      { key: 'shortName', label: 'Short Name' },
      { key: 'days', label: 'Days' },
      { key: 'used', label: 'Status', type: 'status' },
    ],
    fields: [
      { key: 'termId', label: 'Term ID', required: true },
      { key: 'termName', label: 'Term Name' },
      { key: 'shortName', label: 'Short Name' },
      { key: 'days', label: 'Days' },
      { key: 'used', label: 'Status', type: 'select', options: usedOptions },
    ],
    initialValues: {
      termId: '', termName: '', shortName: '', days: '', used: 'Y',
    },
  },
  'end-user-code': {
    apiType: 'end-user',
    title: 'End User Codes',
    icon: '👤',
    cardDescription: 'เลือกรหัสผู้รับปลายทางเพื่อใช้กับ Delivered to ใน Monitor Document',
    description: 'Master end user codes used for Delivered to in monitor documents.',
    searchPlaceholder: 'Search end user code or name',
    listTitle: 'Recent End User Codes',
    createLabel: 'Add End User Code',
    idField: 'eUserId',
    nameField: 'eUserName',
    columns: [
      { key: 'eUserId', label: 'Code' },
      { key: 'eUserName', label: 'End User Name' },
      { key: 'shortName', label: 'Short Name' },
      { key: 'used', label: 'Status', type: 'status' },
    ],
    fields: [
      { key: 'eUserId', label: 'End User ID', required: true },
      { key: 'eUserName', label: 'End User Name', required: true },
      { key: 'shortName', label: 'Short Name' },
      { key: 'used', label: 'Status', type: 'select', options: usedOptions },
    ],
    initialValues: {
      eUserId: '', eUserName: '', shortName: '', used: 'Y',
    },
  },
};

const toDateInputValue = (value: any) => {
  if (!value) return '';
  return String(value).slice(0, 10);
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

export default function CodeMaster({ onNavigate = () => {}, currentPage = 'customer-code' }: any) {
  const [darkMode, setDarkMode] = useThemePreference();
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [paymentTermOptions, setPaymentTermOptions] = useState<{ value: string; label: string }[]>([]);
  const [isLoadingTerms, setIsLoadingTerms] = useState(false);
  const [codeCounts, setCodeCounts] = useState({ customer: 0, product: 0, destination: 0, paymentTerm: 0, endUser: 0 });

  const config = pageConfigs[currentPage] || pageConfigs['customer-code'];

  const loadRecords = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await codeService.getAll(config.apiType);
      const loaded = response.data.data || [];
      setRecords(loaded);
      // refresh that type's count in the summary cards
      const countKey = config.apiType === 'payment-term'
        ? 'paymentTerm'
        : config.apiType === 'end-user'
        ? 'endUser'
        : config.apiType;
      setCodeCounts((prev) => ({ ...prev, [countKey]: loaded.length }));
    } catch (loadError: any) {
      setError(loadError?.response?.data?.message || loadError.message || 'Failed to load codes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setSearch('');
    setFormValues(config.initialValues);
    setIsFormOpen(false);
    setEditingId(null);
    loadRecords();
  }, [currentPage]);

  useEffect(() => {
    setIsLoadingTerms(true);
    codeService.getAll('payment-term').then((res) => {
      const terms = res.data.data || [];
      setPaymentTermOptions(
        terms.map((t: any) => ({ value: t.termId, label: `${t.termId} - ${t.termName || t.shortName || t.termId}` }))
      );
    }).catch(() => {}).finally(() => setIsLoadingTerms(false));
  }, []);

  // Fetch all code counts for summary cards
  useEffect(() => {
    Promise.allSettled([
      codeService.getAll('customer'),
      codeService.getAll('product'),
      codeService.getAll('destination'),
      codeService.getAll('payment-term'),
      codeService.getAll('end-user'),
    ]).then(([cust, prod, dest, term, endUser]) => {
      setCodeCounts({
        customer:    cust.status === 'fulfilled' ? (cust.value?.data?.data?.length ?? 0) : 0,
        product:     prod.status === 'fulfilled' ? (prod.value?.data?.data?.length ?? 0) : 0,
        destination: dest.status === 'fulfilled' ? (dest.value?.data?.data?.length ?? 0) : 0,
        paymentTerm: term.status === 'fulfilled' ? (term.value?.data?.data?.length ?? 0) : 0,
        endUser:     endUser.status === 'fulfilled' ? (endUser.value?.data?.data?.length ?? 0) : 0,
      });
    });
  }, []);

  const openCreateForm = () => {
    setEditingId(null);
    setFormValues(config.initialValues);
    setIsFormOpen(true);
  };

  const openEditForm = (record: any) => {
    const nextValues: Record<string, any> = { ...config.initialValues };
    config.fields.forEach((field: any) => {
      const rawValue = record[field.key];
      nextValues[field.key] = field.type === 'date' ? toDateInputValue(rawValue) : rawValue ?? '';
    });
    setEditingId(record[config.idField]);
    setFormValues(nextValues);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormValues(config.initialValues);
  };

  const handleChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const missingRequired = config.fields.find((field: any) => field.required && !String(formValues[field.key] || '').trim());
    if (missingRequired) {
      setError(`${missingRequired.label} is required`);
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      if (editingId) {
        await codeService.update(config.apiType, editingId, formValues);
      } else {
        await codeService.create(config.apiType, formValues);
      }
      await loadRecords();
      closeForm();
    } catch (saveError: any) {
      setError(saveError?.response?.data?.message || saveError.message || 'Failed to save code');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (record: any) => {
    const codeId = record[config.idField];
    const confirmed = await showAppConfirm({
      title: 'Delete Code',
      message: `Delete ${codeId}?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      setError('');
      await codeService.delete(config.apiType, codeId);
      await loadRecords();
    } catch (deleteError: any) {
      setError(deleteError?.response?.data?.message || deleteError.message || 'Failed to delete code');
    }
  };

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return records;

    return records.filter((row) =>
      Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(keyword))
    );
  }, [records, search]);

  const currentSummary = useMemo(() => {
    const activeCount = records.filter((row: any) => String(row.used || 'Y') === 'Y').length;
    const inactiveCount = records.length - activeCount;

    return [
      { label: 'Total Records', value: records.length, tone: 'blue' },
      { label: 'Active', value: activeCount, tone: 'green' },
      { label: 'Inactive', value: inactiveCount, tone: 'amber' },
    ];
  }, [records]);

  const codeCards = [
    { id: 'customer-code', icon: '🏢', label: 'Customer', count: codeCounts.customer, description: pageConfigs['customer-code'].cardDescription },
    { id: 'product-code', icon: '📦', label: 'Product', count: codeCounts.product, description: pageConfigs['product-code'].cardDescription },
    { id: 'destination-code', icon: '📍', label: 'Destination', count: codeCounts.destination, description: pageConfigs['destination-code'].cardDescription },
    { id: 'payment-term-code', icon: '💳', label: 'Payment Term', count: codeCounts.paymentTerm, description: pageConfigs['payment-term-code'].cardDescription },
    { id: 'end-user-code', icon: '👤', label: 'End User', count: codeCounts.endUser, description: pageConfigs['end-user-code'].cardDescription },
  ];

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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5 mb-8">
            {codeCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => onNavigate(card.id)}
                className={`text-left rounded-xl border p-4 transition-all ${
                  currentPage === card.id
                    ? 'border-blue-500 bg-blue-600 text-white shadow-md'
                    : darkMode
                    ? 'border-gray-700 bg-gray-800 text-gray-300 hover:border-blue-500 hover:bg-gray-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:shadow-sm'
                }`}
              >
                <div className="text-2xl mb-2">{card.icon}</div>
                <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                  currentPage === card.id ? 'text-blue-100' : darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Step 1</p>
                <h2 className={`text-lg font-bold mb-2 ${
                  currentPage === card.id ? 'text-white' : darkMode ? 'text-white' : 'text-gray-900'
                }`}>{card.label}</h2>
                <p className={`mb-3 text-sm ${currentPage === card.id ? 'text-blue-100' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {card.description}
                </p>
                <div className={`inline-flex rounded-lg px-3 py-2 text-sm font-semibold ${
                  currentPage === card.id
                    ? 'bg-white/15 text-white'
                    : darkMode
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {card.count} records
                </div>
              </button>
            ))}
          </div>

          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                {config.icon} Codes Master
              </p>
              <h1 className={`mt-2 text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {config.title}
              </h1>
              <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {config.description}
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
                onClick={openCreateForm}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                {config.createLabel}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-8">
            <div className={`rounded-2xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
              <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Step 1</p>
              <h3 className={`mt-2 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Choose code type</h3>
              <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>เลือกประเภท code จากการ์ดด้านบนก่อน เพื่อให้ฟอร์ม รายการ และ action ทำงานกับชุดข้อมูลเดียวกัน</p>
            </div>
            <div className={`rounded-2xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
              <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Step 2</p>
              <h3 className={`mt-2 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Create or review here</h3>
              <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>เพิ่มข้อมูลใหม่จากปุ่มด้านบน หรือค้นหา แก้ไข และลบจากรายการด้านล่างได้ทันทีจากหน้าเดียว</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-8">
            {currentSummary.map((item) => (
              <div
                key={item.label}
                className={`rounded-2xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}
              >
                <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.label}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.value}</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? darkStatToneClasses[item.tone] : statToneClasses[item.tone]}`}>
                    {config.icon} {config.label || config.title.replace(' Codes', '')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${darkMode ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {error}
            </div>
          )}

          {isFormOpen && (
            <div className={`mb-6 rounded-2xl border p-6 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Step 2</p>
                  <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {editingId ? `Edit ${config.title}` : `Add ${config.title}`}
                  </h2>
                  <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Maintain code master information for document entry.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeForm}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {config.fields.map((field: any) => (
                  <label
                    key={field.key}
                    className={`${field.fullWidth ? 'md:col-span-2' : ''} flex flex-col gap-2 text-sm`}
                  >
                    <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      {field.label}
                    </span>

                    {field.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        value={formValues[field.key] ?? ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className={`rounded-lg border px-4 py-3 ${darkMode ? 'border-gray-600 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={formValues[field.key] ?? ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className={`rounded-lg border px-4 py-3 ${darkMode ? 'border-gray-600 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                      >
                        {field.loadOptionsFrom === 'paymentTerm' ? (
                          isLoadingTerms ? (
                            <option value="">Loading payment terms...</option>
                          ) : (
                            <>
                              <option value="">— Select payment term —</option>
                              {paymentTermOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </>
                          )
                        ) : (
                          (field.options || []).map((option: any) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))
                        )}
                      </select>
                    ) : (
                      <input
                        type={field.type || 'text'}
                        step={field.step}
                        value={formValues[field.key] ?? ''}
                        disabled={Boolean(editingId && field.key === config.idField)}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className={`rounded-lg border px-4 py-3 ${darkMode ? 'border-gray-600 bg-gray-900 text-white disabled:bg-gray-800 disabled:text-gray-500' : 'border-gray-300 bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-500'}`}
                      />
                    )}
                  </label>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          <div className={`overflow-hidden rounded-2xl border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
            <div className={`flex items-center justify-between gap-4 px-6 py-5 ${darkMode ? 'border-b border-gray-700 bg-gray-800' : 'border-b border-gray-200 bg-white'}`}>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Step 2</p>
                <h3 className={`mt-1 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{config.listTitle}</h3>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={loadRecords}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${darkMode ? 'bg-gray-700 text-gray-100 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Add New
                </button>
              </div>
            </div>
            <div className={`grid px-6 py-4 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-600'}`} style={{ gridTemplateColumns: `repeat(${config.columns.length}, minmax(0, 1fr)) 220px` }}>
              {config.columns.map((column: any) => (
                <div key={column.key}>{column.label}</div>
              ))}
              <div>Actions</div>
            </div>

            {isLoading ? (
              <div className={`px-6 py-12 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Loading codes...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className={`px-6 py-12 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No code found.
              </div>
            ) : (
              filteredRows.map((row) => (
                <div
                  key={row[config.idField]}
                  className={`grid items-center px-6 py-4 text-sm ${
                    darkMode ? 'border-t border-gray-700 text-gray-100' : 'border-t border-gray-200 text-gray-900'
                  }`}
                  style={{ gridTemplateColumns: `repeat(${config.columns.length}, minmax(0, 1fr)) 220px` }}
                >
                  {config.columns.map((column: any) => {
                    const value = row[column.key];
                    if (column.type === 'status') {
                      return (
                        <div key={column.key}>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${String(value || 'Y') === 'Y' ? (darkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700')}`}>
                            {String(value || 'Y') === 'Y' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={column.key} className={`${column.key === config.idField ? 'font-semibold' : darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {value || '-'}
                      </div>
                    );
                  })}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(row)}
                      className="rounded-md bg-amber-500 px-3 py-2 text-xs font-medium text-white hover:bg-amber-600"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
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
      </div>
    </Layout>
  );
}
