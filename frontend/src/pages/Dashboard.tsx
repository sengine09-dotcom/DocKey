import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import dashboardService from '../services/dashboardService';
import useThemePreference from '../hooks/useThemePreference';

export default function Dashboard({ onNavigate = () => {} }: any) {
  const [metrics, setMetrics] = useState<any>(null);
  const [counts, setCounts] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useThemePreference();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result = await dashboardService.getMetrics();
        const data = result?.data?.data || {};
        setMetrics(data.businessMetrics || {});
        setCounts(data.documentCounts || {});
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const m = {
    totalRevenue: 0,
    totalCost: 0,
    netProfit: 0,
    completedSales: 0,
    unpaidInvoiceCount: 0,
    unpaidRevenue: 0,
    ...metrics,
  };

  const c = {
    total: 0,
    quotations: 0,
    invoices: 0,
    receipts: 0,
    purchaseOrders: 0,
    workOrders: 0,
    activeWorkOrders: 0,
    overdueInvoice: 0,
    ...counts,
  };

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
              {/* Document count cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard title="Total Documents" value={c.total} icon="📁"
                  bgClass={darkMode ? 'bg-blue-900/40' : 'bg-blue-100'}
                  textClass={darkMode ? 'text-blue-300' : 'text-blue-700'} />
                <StatCard title="Work Orders" value={c.workOrders} icon="🛠️"
                  bgClass={darkMode ? 'bg-indigo-900/40' : 'bg-indigo-100'}
                  textClass={darkMode ? 'text-indigo-300' : 'text-indigo-700'} />
                <StatCard title="Invoice Documents" value={c.invoices} icon="🧾"
                  bgClass={darkMode ? 'bg-purple-900/40' : 'bg-purple-100'}
                  textClass={darkMode ? 'text-purple-300' : 'text-purple-700'} />
                {c.overdueInvoice > 0 && (
                  <div
                    className={`rounded-2xl p-4 cursor-pointer transition ${darkMode ? 'bg-red-900/30 hover:bg-red-900/50 border border-red-700/40' : 'bg-red-50 hover:bg-red-100 border border-red-200'}`}
                    onClick={() => onNavigate('documents')}
                  >
                    <div className={`text-2xl font-bold ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                      {c.overdueInvoice}
                    </div>
                    <div className={`text-xs font-medium mt-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                      Invoice เกินกำหนด
                    </div>
                  </div>
                )}
                <StatCard title="Active Work Orders" value={c.activeWorkOrders} icon="📌"
                  bgClass={darkMode ? 'bg-yellow-900/40' : 'bg-yellow-100'}
                  textClass={darkMode ? 'text-yellow-300' : 'text-yellow-700'} />
              </div>

              {/* Business metrics */}
              <div>
                <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>💰 Business Metrics Summary</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <StatCard title="ต้นทุน" value={`฿${fmt(m.totalCost)}`} icon="💸"
                    bgClass={darkMode ? 'bg-red-900/40' : 'bg-red-100'}
                    textClass={darkMode ? 'text-red-300' : 'text-red-700'} />
                  <StatCard title="ยอดขาย" value={`฿${fmt(m.totalRevenue)}`} icon="💵"
                    bgClass={darkMode ? 'bg-green-900/40' : 'bg-green-100'}
                    textClass={darkMode ? 'text-green-300' : 'text-green-700'} />
                  <StatCard
                    title="กำไร / ขาดทุน"
                    value={`฿${fmt(m.netProfit)}`}
                    icon={m.netProfit >= 0 ? '📈' : '📉'}
                    bgClass={m.netProfit >= 0 ? (darkMode ? 'bg-emerald-900/40' : 'bg-emerald-100') : (darkMode ? 'bg-red-900/40' : 'bg-red-100')}
                    textClass={m.netProfit >= 0 ? (darkMode ? 'text-emerald-300' : 'text-emerald-700') : (darkMode ? 'text-red-300' : 'text-red-700')} />
                  <StatCard title="Completed Sales" value={`${m.completedSales} deals`} icon="🤝"
                    bgClass={darkMode ? 'bg-blue-900/40' : 'bg-blue-100'}
                    textClass={darkMode ? 'text-blue-300' : 'text-blue-700'} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                  <StatCard title="Invoice ลูกค้าสั่งซื้อแล้วค้างจ่าย" value={`${m.unpaidInvoiceCount} ใบ`} icon="⏰"
                    bgClass={darkMode ? 'bg-orange-900/40' : 'bg-orange-100'}
                    textClass={darkMode ? 'text-orange-300' : 'text-orange-700'} />
                  <StatCard title="ยอดค้างรับ (ยังไม่ออก REC)" value={`฿${fmt(m.unpaidRevenue)}`} icon="💳"
                    bgClass={darkMode ? 'bg-amber-900/40' : 'bg-amber-100'}
                    textClass={darkMode ? 'text-amber-300' : 'text-amber-700'} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
