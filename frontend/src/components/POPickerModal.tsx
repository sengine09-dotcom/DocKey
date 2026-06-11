import { useMemo, useState } from 'react';

interface POItem {
  id: string;
  documentId?: string;
  documentNumber: string;
  vendorCode?: string;
  vendorQuotationNo?: string;
  title?: string;
}

interface Vendor {
  vendorCode: string;
  name: string;
}

interface Props {
  isOpen: boolean;
  poList: POItem[];
  usedPoIds: Set<string>;
  vendors: Vendor[];
  selectedPoId: string;
  onSelect: (po: POItem) => void;
  onClose: () => void;
  darkMode: boolean;
}

export default function POPickerModal({ isOpen, poList, usedPoIds, vendors, selectedPoId, onSelect, onClose, darkMode }: Props) {
  const [search, setSearch] = useState('');

  const available = useMemo(
    () => poList.filter((po) => {
      const id = po.documentId || po.id;
      return !usedPoIds.has(id) || id === selectedPoId;
    }),
    [poList, usedPoIds, selectedPoId]
  );

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return available;
    return available.filter((po) =>
      [po.documentNumber, po.vendorCode, po.vendorQuotationNo, po.title]
        .some((f) => String(f ?? '').toLowerCase().includes(kw))
    );
  }, [available, search]);

  const vendorName = (code?: string) => {
    if (!code) return '-';
    return vendors.find((v) => v.vendorCode === code)?.name || code;
  };

  if (!isOpen) return null;

  const bg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const headerBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200';
  const rowHover = darkMode ? 'hover:bg-green-500/10' : 'hover:bg-green-50';
  const selectedRow = darkMode ? 'bg-green-500/15' : 'bg-green-50';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-green-400'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col max-h-[80vh] ${bg}`}>

        {/* Header */}
        <div className={`flex items-center justify-between gap-4 px-6 py-4 border-b rounded-t-2xl ${headerBg}`}>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted}`}>เลือกใบสั่งซื้อ</p>
            <h2 className={`mt-0.5 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              รายการ PO ที่ยังไม่ออกใบรับสินค้า
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full w-8 h-8 flex items-center justify-center text-base font-bold transition-colors ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div className={`px-6 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาเลขที่ PO, เลขที่ QU, Vendor..."
            className={inputCls}
          />
        </div>

        {/* Column headers */}
        <div
          className={`grid px-6 py-2.5 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-gray-700/60 text-gray-300' : 'bg-gray-50 text-gray-500'}`}
          style={{ gridTemplateColumns: '140px 130px 1fr' }}
        >
          <div>เลขที่ PO</div>
          <div>เลขที่ QU (Vendor)</div>
          <div>Vendor</div>
        </div>

        {/* Rows */}
        <div className="overflow-y-auto flex-1">
          {available.length === 0 ? (
            <div className={`px-6 py-12 text-center text-sm ${textMuted}`}>
              ไม่มี PO ที่พร้อมออกใบรับสินค้า
            </div>
          ) : filtered.length === 0 ? (
            <div className={`px-6 py-12 text-center text-sm ${textMuted}`}>
              ไม่พบ PO ที่ค้นหา
            </div>
          ) : (
            filtered.map((po) => {
              const id = po.documentId || po.id;
              const isSelected = id === selectedPoId;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => { onSelect(po); onClose(); setSearch(''); }}
                  className={`w-full grid items-center gap-2 px-6 py-3.5 text-left text-sm transition-colors border-b ${darkMode ? 'border-gray-700/60' : 'border-gray-100'} ${isSelected ? selectedRow : rowHover}`}
                  style={{ gridTemplateColumns: '140px 130px 1fr' }}
                >
                  <span className={`font-semibold ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                    {po.documentNumber}
                    {isSelected && <span className="ml-1 text-xs">✓</span>}
                  </span>
                  <span className={`${po.vendorQuotationNo ? (darkMode ? 'text-white' : 'text-gray-900') : textMuted}`}>
                    {po.vendorQuotationNo || '-'}
                  </span>
                  <span className={`truncate ${textMuted}`} title={vendorName(po.vendorCode)}>
                    {po.vendorCode
                      ? <><span className={`font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{po.vendorCode}</span>{' '}{vendorName(po.vendorCode)}</>
                      : '-'
                    }
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-6 py-3 border-t rounded-b-2xl ${headerBg}`}>
          <span className={`text-xs ${textMuted}`}>
            {filtered.length} PO{filtered.length !== available.length ? ` (จาก ${available.length} ที่ยังไม่มี GR)` : ' ที่ยังไม่มี GR'}
          </span>
          <button
            type="button"
            onClick={() => { onClose(); setSearch(''); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
