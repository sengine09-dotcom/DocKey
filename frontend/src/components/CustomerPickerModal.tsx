import { useMemo, useState } from 'react';

interface Customer {
  customerCode: string;
  customerName: string;
  contactName?: string;
  phone?: string;
  idTerm?: string;
}

interface Props {
  isOpen: boolean;
  customers: Customer[];
  selectedCode: string;
  onSelect: (customer: Customer) => void;
  onClear: () => void;
  onClose: () => void;
  darkMode: boolean;
}

export default function CustomerPickerModal({ isOpen, customers, selectedCode, onSelect, onClear, onClose, darkMode }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return customers;
    return customers.filter((c) =>
      [c.customerCode, c.customerName, c.contactName, c.phone]
        .some((f) => String(f ?? '').toLowerCase().includes(kw))
    );
  }, [customers, search]);

  if (!isOpen) return null;

  const bg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const headerBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200';
  const rowHover = darkMode ? 'hover:bg-blue-500/10' : 'hover:bg-blue-50';
  const selectedRow = darkMode ? 'bg-blue-500/15' : 'bg-blue-50';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-400'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col max-h-[80vh] ${bg}`}>

        {/* Header */}
        <div className={`flex items-center justify-between gap-4 px-6 py-4 border-b rounded-t-2xl ${headerBg}`}>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted}`}>เลือกลูกค้า</p>
            <h2 className={`mt-0.5 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>รายการลูกค้า</h2>
          </div>
          <button type="button" onClick={onClose}
            className={`rounded-full w-8 h-8 flex items-center justify-center text-base font-bold transition-colors ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>
            ×
          </button>
        </div>

        {/* Search */}
        <div className={`px-6 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหารหัส, ชื่อ, ผู้ติดต่อ..." className={inputCls} />
        </div>

        {/* Column headers */}
        <div className={`grid px-6 py-2.5 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-gray-700/60 text-gray-300' : 'bg-gray-50 text-gray-500'}`}
          style={{ gridTemplateColumns: '100px 1fr 140px' }}>
          <div>Code</div>
          <div>ชื่อลูกค้า</div>
          <div>ผู้ติดต่อ</div>
        </div>

        {/* Rows */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className={`px-6 py-12 text-center text-sm ${textMuted}`}>ไม่พบลูกค้าที่ค้นหา</div>
          ) : filtered.map((c) => {
            const isSelected = c.customerCode === selectedCode;
            return (
              <button key={c.customerCode} type="button"
                onClick={() => { onSelect(c); onClose(); setSearch(''); }}
                className={`w-full grid items-center gap-2 px-6 py-3 text-left text-sm transition-colors border-b ${darkMode ? 'border-gray-700/60' : 'border-gray-100'} ${isSelected ? selectedRow : rowHover}`}
                style={{ gridTemplateColumns: '100px 1fr 140px' }}>
                <span className={`font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  {c.customerCode}{isSelected && <span className="ml-1 text-xs">✓</span>}
                </span>
                <span className={`truncate font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{c.customerName}</span>
                <span className={`truncate ${textMuted}`}>{c.contactName || '-'}</span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-6 py-3 border-t rounded-b-2xl ${headerBg}`}>
          <span className={`text-xs ${textMuted}`}>
            {filtered.length} รายการ{filtered.length !== customers.length ? ` (จาก ${customers.length})` : ''}
          </span>
          <div className="flex gap-2">
            {selectedCode && (
              <button type="button" onClick={() => { onClear(); onClose(); setSearch(''); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                ล้างค่า
              </button>
            )}
            <button type="button" onClick={() => { onClose(); setSearch(''); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
