import { useEffect, useState } from 'react';
import Layout from '../../components/Layout/Layout';
import useThemePreference from '../../hooks/useThemePreference';
import stockService, { StockSummaryItem, StockTransaction } from '../../services/stockService';

const DOC_TYPE_LABEL: Record<string, string> = {
  GR: 'รับสินค้า (GR)',
  DELIVERY_ORDER: 'ส่งสินค้า (DO)',
  CUSTOMER_RETURN: 'คืนสินค้า (CR)',
  INIT: 'ยอดยกมา',
};

const TYPE_BADGE: Record<string, string> = {
  IN: 'bg-green-100 text-green-700',
  OUT: 'bg-red-100 text-red-700',
  INIT: 'bg-blue-100 text-blue-700',
};

export default function StockInventory({ onNavigate = () => {}, currentPage = 'stock-inventory' }: any) {
  const [darkMode, setDarkMode] = useThemePreference();
  const [activeTab, setActiveTab] = useState<'summary' | 'history'>('summary');
  const [summary, setSummary] = useState<StockSummaryItem[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCode, setSearchCode] = useState('');

  const cardBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`;
  const thCls = `px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`;
  const tdCls = `px-4 py-3 text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`;

  useEffect(() => {
    if (activeTab === 'summary') loadSummary();
    else loadTransactions();
  }, [activeTab]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const res = await stockService.getSummary();
      setSummary(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await stockService.getTransactions({ limit: 300 });
      setTransactions(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  const filteredSummary = summary.filter((p) =>
    !searchCode ||
    p.productCode.toLowerCase().includes(searchCode.toLowerCase()) ||
    p.productName.toLowerCase().includes(searchCode.toLowerCase())
  );

  const filteredTx = transactions.filter((t) =>
    !searchCode ||
    t.productCode.toLowerCase().includes(searchCode.toLowerCase()) ||
    t.productName?.toLowerCase().includes(searchCode.toLowerCase())
  );

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yy} ${hh}:${min}`;
  };

  const stockColor = (item: StockSummaryItem) => {
    if (item.stockQty <= 0) return darkMode ? 'text-red-400' : 'text-red-600';
    if (item.minQty > 0 && item.stockQty <= item.minQty) return darkMode ? 'text-yellow-400' : 'text-yellow-600';
    return darkMode ? 'text-green-400' : 'text-green-600';
  };

  return (
    <Layout
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      onNavigate={onNavigate}
      currentPage={currentPage}
      topBarCaption="🏬 คลังสินค้า"
    >
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>คลังสินค้า</h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>ภาพรวมสต็อกและประวัติการเคลื่อนไหว</p>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 rounded-xl p-1 mb-6 w-fit ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          {(['summary', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSearchCode(''); }}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? darkMode ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow'
                  : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'summary' ? 'ภาพรวมสต็อก' : 'ประวัติเข้า-ออก'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4 max-w-sm">
          <input
            className={inputCls}
            placeholder="ค้นหารหัส / ชื่อสินค้า..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
          />
        </div>

        {loading ? (
          <div className={`text-center py-16 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>กำลังโหลด...</div>
        ) : activeTab === 'summary' ? (
          /* ─── Summary Tab ─── */
          <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className={thCls}>รหัสสินค้า / ชื่อสินค้า</th>
                    <th className={thCls}>หมวดหมู่</th>
                    <th className={thCls}>ยี่ห้อ</th>
                    <th className={`${thCls} text-right`}>สต็อก</th>
                    <th className={`${thCls} text-right`}>ขั้นต่ำ</th>
                    <th className={`${thCls} text-right`}>สูงสุด</th>
                    <th className={thCls}>สถานะ</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  {filteredSummary.length === 0 ? (
                    <tr><td colSpan={8} className={`${tdCls} text-center py-10`}>ไม่มีข้อมูล</td></tr>
                  ) : filteredSummary.map((p) => (
                    <tr key={p.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className={tdCls}>
                        <span className="font-mono">{p.productCode}</span>
                        {p.productName && <span className={`ml-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{p.productName}</span>}
                      </td>
                      <td className={tdCls}>{p.category}</td>
                      <td className={tdCls}>{p.brand}</td>
                      <td className={`${tdCls} text-right font-bold ${stockColor(p)}`}>{p.stockQty.toLocaleString()}</td>
                      <td className={`${tdCls} text-right`}>{p.minQty}</td>
                      <td className={`${tdCls} text-right`}>{p.maxQty}</td>
                      <td className={tdCls}>
                        {p.stockQty <= 0
                          ? <span className="inline-block rounded-full px-2 py-0.5 text-xs bg-red-100 text-red-700">หมด</span>
                          : p.minQty > 0 && p.stockQty <= p.minQty
                          ? <span className="inline-block rounded-full px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700">ใกล้หมด</span>
                          : <span className="inline-block rounded-full px-2 py-0.5 text-xs bg-green-100 text-green-700">ปกติ</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`px-4 py-3 text-xs border-t ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
              แสดง {filteredSummary.length} รายการ
            </div>
          </div>
        ) : (
          /* ─── History Tab ─── */
          <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className={thCls}>วันที่</th>
                    <th className={thCls}>รหัสสินค้า / ชื่อสินค้า</th>
                    <th className={thCls}>เอกสาร</th>
                    <th className={thCls}>ประเภทเอกสาร</th>
                    <th className={thCls}>ประเภท</th>
                    <th className={`${thCls} text-right`}>จำนวน</th>
                    <th className={thCls}>โดย</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  {filteredTx.length === 0 ? (
                    <tr><td colSpan={7} className={`${tdCls} text-center py-10`}>ไม่มีข้อมูล</td></tr>
                  ) : filteredTx.map((t) => (
                    <tr key={t.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className={`${tdCls} whitespace-nowrap`}>{formatDate(t.createdAt)}</td>
                      <td className={tdCls}>
                        <span className="font-mono">{t.productCode}</span>
                        {t.productName && <span className={`ml-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t.productName}</span>}
                      </td>
                      <td className={`${tdCls} font-mono`}>{t.docNumber}</td>
                      <td className={tdCls}>{DOC_TYPE_LABEL[t.docType] || t.docType}</td>
                      <td className={tdCls}>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_BADGE[t.type] || ''}`}>
                          {t.type === 'IN' ? 'รับเข้า' : t.type === 'OUT' ? 'ตัดออก' : 'ยอดยกมา'}
                        </span>
                      </td>
                      <td className={`${tdCls} text-right font-bold ${Number(t.qtyChange) >= 0 ? (darkMode ? 'text-green-400' : 'text-green-600') : (darkMode ? 'text-red-400' : 'text-red-600')}`}>
                        {Number(t.qtyChange) > 0 ? '+' : ''}{Number(t.qtyChange).toLocaleString()}
                      </td>
                      <td className={tdCls}>{t.createdBy || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`px-4 py-3 text-xs border-t ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
              แสดง {filteredTx.length} รายการ
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
