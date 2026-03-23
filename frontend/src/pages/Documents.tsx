import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout/Layout';
import monitorService from '../services/monitorService';
import invoiceService from '../services/invoiceService';
import useThemePreference from '../hooks/useThemePreference';

export default function Documents({ onNavigate = () => { }, currentPage = 'documents' }: any) {
  const [darkMode, setDarkMode] = useThemePreference();
  const [selectedType, setSelectedType] = useState<'monitor' | 'invoice'>('monitor');
  const [monitors, setMonitors] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [docCounts, setDocCounts] = useState({
    monitor: 0, monitorUnprinted: 0,
    invoice: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      setIsLoading(true);
      const [mon, inv] = await Promise.allSettled([
        monitorService.getAll(),
        invoiceService.getAll(),
      ]);
      const monitors = mon.status === 'fulfilled' ? (mon.value?.data?.data || []) : [];
      const invoices = inv.status === 'fulfilled' ? (inv.value?.data?.data || []) : [];
      setMonitors(monitors);
      setInvoices(invoices);
      setDocCounts({
        monitor: monitors.length,
        monitorUnprinted: monitors.filter((m: any) => m.status === 'Unprinted').length,
        invoice: invoices.length,
      });
      setIsLoading(false);
    };
    fetchCounts();
  }, []);

  const formatDate = (value: any) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleDateString('th-TH');
  };

  const headerTitle = selectedType === 'monitor' ? '🖥️ Monitors' : '🧾 Invoices';
  const headerSubtitle = selectedType === 'monitor'
    ? 'Manage and review monitor documents'
    : 'Manage and review invoice documents';

  const filteredMonitors = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return monitors;
    return monitors.filter((item: any) =>
      [item.monitorId, item.customer, item.poNo, item.status]
        .some((value) => String(value ?? '').toLowerCase().includes(keyword))
    );
  }, [monitors, search]);

  const filteredInvoices = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return invoices;
    return invoices.filter((item: any) =>
      [item.invoiceId, item.invoiceNo, item.customer, item.status]
        .some((value) => String(value ?? '').toLowerCase().includes(keyword))
    );
  }, [invoices, search]);

  return (
    <Layout
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      onNavigate={onNavigate}
      currentPage={currentPage}
      topBarCaption={selectedType === 'monitor' ? '🖥️ Monitors' : '🧾 Invoices'}
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
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Monitor Card */}
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
                  }`}>Document Type</p>
                  <h2 className={`text-lg font-bold mb-2 ${selectedType === 'monitor' ? 'text-white' : darkMode ? 'text-white' : 'text-gray-900'}`}>Monitor</h2>
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
                  <p className={`mt-2 text-xs ${selectedType === 'monitor' ? 'text-blue-100' : darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Click to show Monitor list below</p>
                </button>

                {/* Invoice Card */}
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
                  }`}>Document Type</p>
                  <h2 className={`text-lg font-bold mb-2 ${selectedType === 'invoice' ? 'text-white' : darkMode ? 'text-white' : 'text-gray-900'}`}>Invoice</h2>
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
                  <p className={`mt-2 text-xs ${selectedType === 'invoice' ? 'text-purple-100' : darkMode ? 'text-purple-400' : 'text-purple-600'}`}>Click to show Invoice list below</p>
                </button>

                
              </div>

              <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className={`text-sm font-medium ${selectedType === 'monitor' ? (darkMode ? 'text-blue-300' : 'text-blue-700') : (darkMode ? 'text-purple-300' : 'text-purple-700')}`}>
                    {selectedType === 'monitor' ? '🖥️ Documents Master' : '🧾 Documents Master'}
                  </p>
                  <h2 className={`mt-2 text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {selectedType === 'monitor' ? 'Monitor Documents' : 'Invoice Documents'}
                  </h2>
                  <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {selectedType === 'monitor'
                      ? 'Manage monitor records and check print status in one place.'
                      : 'Manage invoice records and review payment status in one place.'}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={selectedType === 'monitor' ? 'Search monitor ID, customer, PO No' : 'Search invoice ID, no, customer'}
                    className={`rounded-lg border px-4 py-2 text-sm ${
                      darkMode
                        ? 'border-gray-600 bg-gray-800 text-white placeholder:text-gray-500'
                        : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => onNavigate(selectedType === 'monitor' ? 'monitor-home' : 'invoice-home')}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    Open Full Page
                  </button>
                </div>
              </div>

              {/* Document List Section */}
              <div className={`overflow-hidden rounded-2xl border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
                <div className={`grid px-6 py-4 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-600'}`} style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) 180px' }}>
                  {selectedType === 'monitor' ? (
                    <>
                      <div>Monitor ID</div>
                      <div>Customer</div>
                      <div>PO No</div>
                      <div>PO Date</div>
                    </>
                  ) : (
                    <>
                      <div>Invoice ID</div>
                      <div>Invoice No</div>
                      <div>Customer</div>
                      <div>Invoice Date</div>
                    </>
                  )}
                  <div>Status</div>
                </div>

                {selectedType === 'monitor' ? (
                  filteredMonitors.length === 0 ? (
                    <div className={`px-6 py-12 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No monitor documents found.
                    </div>
                  ) : (
                    filteredMonitors.map((item: any) => (
                      <div
                        key={item.monitorId}
                        className={`grid items-center px-6 py-4 text-sm ${
                          darkMode ? 'border-t border-gray-700 text-gray-100' : 'border-t border-gray-200 text-gray-900'
                        }`}
                        style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) 180px' }}
                      >
                        <div className="font-semibold">{item.monitorId || '-'}</div>
                        <div className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{item.customer || '-'}</div>
                        <div className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{item.poNo || '-'}</div>
                        <div className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{formatDate(item.poDate)}</div>
                        <div>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.status === 'Printed'
                              ? (darkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-100 text-green-700')
                              : (darkMode ? 'bg-yellow-500/15 text-yellow-300' : 'bg-yellow-100 text-yellow-700')
                          }`}>
                            {item.status || 'Unprinted'}
                          </span>
                        </div>
                      </div>
                    ))
                  )
                ) : filteredInvoices.length === 0 ? (
                  <div className={`px-6 py-12 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No invoice documents found.
                  </div>
                ) : (
                  filteredInvoices.map((item: any) => (
                    <div
                      key={item.invoiceNo}
                      className={`grid items-center px-6 py-4 text-sm ${
                        darkMode ? 'border-t border-gray-700 text-gray-100' : 'border-t border-gray-200 text-gray-900'
                      }`}
                      style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) 180px' }}
                    >
                      <div className="font-semibold">{item.invoiceId || '-'}</div>
                      <div className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{item.invoiceNo || '-'}</div>
                      <div className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{item.customer || '-'}</div>
                      <div className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{formatDate(item.invoiceDate)}</div>
                      <div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.status === 'Paid'
                            ? (darkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-100 text-green-700')
                            : item.status === 'Overdue'
                            ? (darkMode ? 'bg-red-500/15 text-red-300' : 'bg-red-100 text-red-700')
                            : (darkMode ? 'bg-yellow-500/15 text-yellow-300' : 'bg-yellow-100 text-yellow-700')
                        }`}>
                          {item.status || 'Pending'}
                        </span>
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
