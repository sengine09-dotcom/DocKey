import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout/Layout';
import codeService from '../services/codeService';

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
    description: 'Master customer codes used in Monitor and Invoice documents.',
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
      { key: 'idTerm', label: 'Term ID' },
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
    description: 'Master product codes for line items in Monitor and Invoice documents.',
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
    description: 'Master destinations used for shipment and delivery references.',
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
};

const toDateInputValue = (value: any) => {
  if (!value) return '';
  return String(value).slice(0, 10);
};

export default function CodeMaster({ onNavigate = () => {}, currentPage = 'customer-code' }: any) {
  const [darkMode, setDarkMode] = useState(true);
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const config = pageConfigs[currentPage] || pageConfigs['customer-code'];

  const loadRecords = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await codeService.getAll(config.apiType);
      setRecords(response.data.data || []);
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
    if (!window.confirm(`Delete ${codeId}?`)) {
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

  return (
    <Layout
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      onNavigate={onNavigate}
      currentPage={currentPage}
    >
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="max-w-7xl mx-auto px-6 py-8">
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
                placeholder="Search code or name"
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
                Add Code
              </button>
            </div>
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
                        {(field.options || []).map((option: any) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
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
                  {isSaving ? 'Saving...' : 'Save Code'}
                </button>
              </div>
            </div>
          )}

          <div className={`overflow-hidden rounded-2xl border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
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
