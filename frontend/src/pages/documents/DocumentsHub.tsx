import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import useThemePreference from '../../hooks/useThemePreference';
import { loadAllDocuments, DocumentsByType, createEmptyCollections, formatCurrency } from './documentShared';

const SYSTEMS = [
  {
    key: 'sales',
    route: '/documents/sales',
    icon: '💼',
    title: 'ระบบขาย',
    subtitle: 'Sales System',
    description: 'จัดการเอกสารฝั่งขาย ตั้งแต่ Sale Order จนถึงใบเสร็จรับเงิน',
    color: 'blue',
    types: [
      { key: 'so',              label: 'Sale Order',      icon: '🛒' },
      { key: 'quotation',       label: 'ใบเสนอราคา',     icon: '📝' },
      { key: 'deposit_receipt', label: 'ใบรับมัดจำ',     icon: '🏦' },
      { key: 'invoice',         label: 'ใบแจ้งหนี้',     icon: '🧾' },
      { key: 'receipt',         label: 'ใบเสร็จรับเงิน', icon: '💵' },
    ],
    flow: 'SO → ใบเสนอราคา → ใบรับมัดจำ → ใบแจ้งหนี้ → ใบเสร็จ',
  },
  {
    key: 'purchase',
    route: '/documents/purchase',
    icon: '📦',
    title: 'ระบบซื้อ',
    subtitle: 'Purchase System',
    description: 'จัดการใบขอซื้อ ใบสั่งซื้อ และใบรับสินค้าเข้าคลัง',
    color: 'violet',
    types: [
      { key: 'pr',             label: 'ใบขอซื้อ (PR)',    icon: '📋' },
      { key: 'purchase_order', label: 'ใบสั่งซื้อ (PO)',  icon: '📦' },
      { key: 'gr',             label: 'ใบรับสินค้า (GR)', icon: '📥' },
    ],
    flow: 'PR → อนุมัติ → PO → Supplier → GR → คลัง',
  },
  {
    key: 'operations',
    route: '/documents/operations',
    icon: '🛠️',
    title: 'ระบบหลังบ้าน',
    subtitle: 'Operations System',
    description: 'จัดการใบสั่งงาน ใบส่งสินค้า และการดำเนินงานภายใน',
    color: 'rose',
    types: [
      { key: 'work_order',     label: 'ใบสั่งงาน',   icon: '🛠️' },
      { key: 'delivery_order', label: 'ใบส่งสินค้า', icon: '🚚' },
    ],
    flow: 'สร้างงาน → มอบหมาย → ส่งสินค้า (ตัดสต๊อก) → ปิดงาน',
  },
];

const colorClasses: Record<string, { card: string; icon: string; badge: string; btn: string; flow: string }> = {
  blue:   { card: 'border-blue-200 hover:border-blue-400 hover:shadow-blue-100',   icon: 'bg-blue-100 text-blue-600',   badge: 'bg-blue-50 text-blue-700 border-blue-200',   btn: 'bg-blue-600 hover:bg-blue-700',   flow: 'text-blue-600' },
  violet: { card: 'border-violet-200 hover:border-violet-400 hover:shadow-violet-100', icon: 'bg-violet-100 text-violet-600', badge: 'bg-violet-50 text-violet-700 border-violet-200', btn: 'bg-violet-600 hover:bg-violet-700', flow: 'text-violet-600' },
  rose:   { card: 'border-rose-200 hover:border-rose-400 hover:shadow-rose-100',   icon: 'bg-rose-100 text-rose-600',   badge: 'bg-rose-50 text-rose-700 border-rose-200',   btn: 'bg-rose-600 hover:bg-rose-700',   flow: 'text-rose-600' },
};

const darkColorClasses: Record<string, { card: string; icon: string; badge: string; flow: string }> = {
  blue:   { card: 'border-blue-800 hover:border-blue-600',   icon: 'bg-blue-900/40 text-blue-400',   badge: 'bg-blue-900/30 text-blue-300 border-blue-700',   flow: 'text-blue-400' },
  violet: { card: 'border-violet-800 hover:border-violet-600', icon: 'bg-violet-900/40 text-violet-400', badge: 'bg-violet-900/30 text-violet-300 border-violet-700', flow: 'text-violet-400' },
  rose:   { card: 'border-rose-800 hover:border-rose-600',   icon: 'bg-rose-900/40 text-rose-400',   badge: 'bg-rose-900/30 text-rose-300 border-rose-700',   flow: 'text-rose-400' },
};

export default function DocumentsHub({ onNavigate = () => { }, currentPage = 'documents' }: any) {
  const [darkMode, setDarkMode] = useThemePreference();
  const [docs, setDocs] = useState<DocumentsByType>(createEmptyCollections());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadAllDocuments().then((d) => { setDocs(d); setLoading(false); });
  }, []);

  const totalAll = Object.values(docs).reduce((sum, arr) => sum + arr.length, 0);
  const totalAmount = Object.values(docs).flat().reduce((sum, r) => sum + Number(r?.total || 0), 0);

  return (
    <Layout darkMode={darkMode} setDarkMode={setDarkMode} onNavigate={onNavigate} currentPage={currentPage} topBarCaption="📂 เอกสาร">
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-6xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="mb-10">
            <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Document Management</p>
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>ระบบจัดการเอกสาร</h1>
            <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>เลือกระบบที่ต้องการจัดการเอกสาร</p>
          </div>

          {/* Summary bar */}
          {!loading && (
            <div className={`rounded-2xl border p-5 mb-8 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className={`text-xs uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>เอกสารทั้งหมด</p>
                  <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{totalAll}</p>
                </div>
                <div>
                  <p className={`text-xs uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>มูลค่ารวม</p>
                  <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>฿{formatCurrency(totalAmount)}</p>
                </div>
                <div>
                  <p className={`text-xs uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>ฝั่งขาย</p>
                  <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {['quotation','deposit_receipt','invoice','receipt'].reduce((s, t) => s + (docs[t as keyof DocumentsByType]?.length || 0), 0)}
                  </p>
                </div>
                <div>
                  <p className={`text-xs uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>ฝั่งซื้อ / งาน</p>
                  <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-violet-400' : 'text-violet-600'}`}>
                    {(docs.purchase_order?.length || 0) + (docs.work_order?.length || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* System cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {SYSTEMS.map((system) => {
              const cls = darkMode ? darkColorClasses[system.color] : colorClasses[system.color];
              const typeCount = system.types.reduce((s, t) => s + (docs[t.key as keyof DocumentsByType]?.length || 0), 0);

              return (
                <button
                  key={system.key}
                  type="button"
                  onClick={() => navigate(system.route)}
                  className={`rounded-2xl border-2 p-6 text-left transition-all duration-200 shadow-sm hover:shadow-md ${darkMode ? `bg-gray-800 ${cls.card}` : `bg-white ${cls.card}`}`}
                >
                  {/* Icon + count */}
                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${cls.icon}`}>
                      {system.icon}
                    </div>
                    {loading ? (
                      <div className={`w-8 h-8 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} animate-pulse`} />
                    ) : (
                      <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{typeCount}</span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{system.title}</h2>
                  <p className={`text-xs font-medium mt-0.5 mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{system.subtitle}</p>
                  <p className={`text-sm mb-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{system.description}</p>

                  {/* Document type badges */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    {system.types.map((t) => (
                      <span key={t.key} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${cls.badge}`}>
                        {t.icon} {t.label}
                        {!loading && (
                          <span className="font-bold ml-1">{docs[t.key as keyof DocumentsByType]?.length || 0}</span>
                        )}
                      </span>
                    ))}
                  </div>

                  {/* Flow hint */}
                  <p className={`text-xs ${darkMode ? cls.flow : cls.flow} font-medium`}>→ {system.flow}</p>

                  {/* Enter button */}
                  <div className={`mt-5 w-full rounded-xl py-2.5 text-sm font-semibold text-white text-center transition ${colorClasses[system.color].btn}`}>
                    เข้าสู่ระบบ
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick tip */}
          <div className={`mt-8 rounded-2xl border p-5 ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-blue-50 border-blue-100'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-blue-700'}`}>
              <span className="font-semibold">💡 workflow: </span>
              ระบบขาย — สร้างใบเสนอราคา → ลูกค้ายืนยัน → ออกใบแจ้งหนี้ → รับชำระ → ออกใบเสร็จ
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
