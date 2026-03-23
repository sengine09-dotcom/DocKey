import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import monitorService from '../services/monitorService';
import invoiceService from '../services/invoiceService';
import useThemePreference from '../hooks/useThemePreference';

export default function Dashboard({ onNavigate = () => {} }: any) {
  const [monitors, setMonitors] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useThemePreference();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [monitorsResult, invoicesResult] = await Promise.allSettled([
        monitorService.getAll(),
        invoiceService.getAll(),
      ]);
      setMonitors(monitorsResult.status === 'fulfilled' ? (monitorsResult.value?.data?.data || []) : []);
      setInvoices(invoicesResult.status === 'fulfilled' ? (invoicesResult.value?.data?.data || []) : []);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const unprintedMonitors = monitors.filter((m: any) => m.status === 'Unprinted');
  const totalDocs = monitors.length + invoices.length;

  const StatCard = ({ title, value, icon, bgClass, textClass }: any) => (
    <div className={`rounded-xl border p-6 flex items-center gap-5 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
      <div className={`text-3xl w-14 h-14 flex items-center justify-center rounded-xl ${bgClass}`}>{icon}</div>
      <div>
        <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{title}</p>
        <p className={`text-3xl font-bold mt-0.5 ${textClass}`}>{value}</p>
      </div>
    </div>
  );

  return (
    <Layout darkMode={darkMode} setDarkMode={setDarkMode} onNavigate={onNavigate} currentPage="dashboard">
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        {/* Page Header */}
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-10`}>
          <div className="max-w-7xl mx-auto px-6 py-6">
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>📊 Dashboard</h1>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Overview of all documents in the system</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {isLoading ? (
            <div className={`text-center py-16 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <div className="text-4xl mb-3">⏳</div>
              <p>Loading dashboard...</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard title="Total Documents" value={totalDocs} icon="📁"
                  bgClass={darkMode ? 'bg-blue-900/40' : 'bg-blue-100'}
                  textClass={darkMode ? 'text-blue-300' : 'text-blue-700'} />
                <StatCard title="Monitor Documents" value={monitors.length} icon="🖥️"
                  bgClass={darkMode ? 'bg-indigo-900/40' : 'bg-indigo-100'}
                  textClass={darkMode ? 'text-indigo-300' : 'text-indigo-700'} />
                <StatCard title="Invoice Documents" value={invoices.length} icon="🧾"
                  bgClass={darkMode ? 'bg-purple-900/40' : 'bg-purple-100'}
                  textClass={darkMode ? 'text-purple-300' : 'text-purple-700'} />
                <StatCard title="Unprinted Monitors" value={unprintedMonitors.length} icon="🖨️"
                  bgClass={darkMode ? 'bg-yellow-900/40' : 'bg-yellow-100'}
                  textClass={darkMode ? 'text-yellow-300' : 'text-yellow-700'} />
              </div>

              {/* Monitor Documents Table */}
              <div className={`rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm overflow-hidden`}>
                <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🖥️ Monitor Documents</h2>
                  <button onClick={() => onNavigate('monitor-home')} className="text-sm text-blue-500 hover:text-blue-600 font-medium">View All →</button>
                </div>
                {monitors.length === 0 ? (
                  <div className={`px-6 py-10 text-center text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No monitor documents yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'} text-xs uppercase`}>
                          <th className="px-6 py-3 text-left">Monitor ID</th>
                          <th className="px-6 py-3 text-left">Customer</th>
                          <th className="px-6 py-3 text-left">Issued Date</th>
                          <th className="px-6 py-3 text-right">Total Sales</th>
                          <th className="px-6 py-3 text-center">Status</th>
                          <th className="px-6 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                        {monitors.slice(0, 10).map((m: any) => (
                          <tr key={m.monitorId} className={`${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} transition-colors`}>
                            <td className={`px-6 py-3 font-mono font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{m.monitorId}</td>
                            <td className={`px-6 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{m.customer || '-'}</td>
                            <td className={`px-6 py-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {m.issuedDate ? new Date(m.issuedDate).toLocaleDateString('en-GB') : '-'}
                            </td>
                            <td className={`px-6 py-3 text-right font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              ฿{Number(m.totalSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                m.status === 'Printed' ? 'bg-green-500/20 text-green-600' : 'bg-yellow-500/20 text-yellow-600'
                              }`}>
                                {m.status}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-center">
                              <button
                                onClick={() => onNavigate('key-monitor', { ...m, __mode: 'view' })}
                                className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Invoice Documents Table */}
              <div className={`rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm overflow-hidden`}>
                <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🧾 Invoice Documents</h2>
                  <button onClick={() => onNavigate('invoice-home')} className="text-sm text-blue-500 hover:text-blue-600 font-medium">View All →</button>
                </div>
                {invoices.length === 0 ? (
                  <div className={`px-6 py-10 text-center text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No invoice documents yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'} text-xs uppercase`}>
                          <th className="px-6 py-3 text-left">Invoice ID</th>
                          <th className="px-6 py-3 text-left">Customer</th>
                          <th className="px-6 py-3 text-left">Issued Date</th>
                          <th className="px-6 py-3 text-right">Total Amount</th>
                          <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                        {invoices.slice(0, 10).map((inv: any, idx: number) => (
                          <tr key={inv.invoiceId || idx} className={`${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} transition-colors`}>
                            <td className={`px-6 py-3 font-mono font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{inv.invoiceId || inv.id || '-'}</td>
                            <td className={`px-6 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{inv.customer || inv.customerId || '-'}</td>
                            <td className={`px-6 py-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {inv.issuedDate || inv.issDate ? new Date(inv.issuedDate || inv.issDate).toLocaleDateString('en-GB') : '-'}
                            </td>
                            <td className={`px-6 py-3 text-right font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              ฿{Number(inv.totalAmount || inv.totalSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                inv.status === 'Completed' || inv.status === 'Paid'
                                  ? 'bg-green-500/20 text-green-600'
                                  : 'bg-blue-500/20 text-blue-600'
                              }`}>
                                {inv.status || 'Active'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
