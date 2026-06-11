import { useEffect, useMemo, useState } from 'react';

interface Product {
  productCode: string;
  productName: string;
  [key: string]: any;
}

interface ProductSelectionModalProps {
  isOpen: boolean;
  products: Product[];
  onSelect: (product: Product) => void;
  onClose: () => void;
  darkMode: boolean;
  isLoading: boolean;
}

const buildProductName = (product: Product) =>
  String(product.productName || product.productCode || '').trim();

const buildSearchableText = (product: Product) =>
  [product.productCode, product.productName, product.sourceLabel, product.sourceDocumentNumber, product.sourceCustomer]
    .map((v) => String(v || '').toLowerCase())
    .join(' ');

type SourceTab = 'pr' | 'quotation' | 'product';

export default function ProductSelectionModal({
  isOpen, products, onSelect, onClose, darkMode, isLoading,
}: ProductSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<SourceTab>('product');
  const [selectedDocNumber, setSelectedDocNumber] = useState('');

  const hasPR = useMemo(() => products.some((p) => String(p.sourceType || '') === 'pr'), [products]);
  const hasQuotation = useMemo(() => products.some((p) => String(p.sourceType || '') === 'quotation'), [products]);

  const prOptions = useMemo(() => {
    const seen = new Set<string>();
    return products
      .filter((p) => String(p.sourceType || '') === 'pr')
      .map((p) => ({ value: String(p.sourceDocumentNumber || ''), label: String(p.sourceLabel || p.sourceDocumentNumber || 'PR') }))
      .filter(({ value }) => { if (!value || seen.has(value)) return false; seen.add(value); return true; });
  }, [products]);

  const quotationOptions = useMemo(() => {
    const seen = new Set<string>();
    return products
      .filter((p) => String(p.sourceType || '') === 'quotation')
      .map((p) => ({ value: String(p.sourceDocumentNumber || ''), label: String(p.sourceLabel || p.sourceDocumentNumber || 'QT') }))
      .filter(({ value }) => { if (!value || seen.has(value)) return false; seen.add(value); return true; });
  }, [products]);

  useEffect(() => {
    if (!isOpen) return;
    setSearchTerm('');
    if (hasPR) {
      setActiveTab('pr');
      setSelectedDocNumber(prOptions[0]?.value || '');
    } else if (hasQuotation) {
      setActiveTab('quotation');
      setSelectedDocNumber(quotationOptions[0]?.value || '');
    } else {
      setActiveTab('product');
      setSelectedDocNumber('');
    }
  }, [isOpen, hasPR, hasQuotation, prOptions, quotationOptions]);

  const filteredProducts = useMemo(() => {
    let base: Product[];
    if (activeTab === 'pr') {
      base = products.filter((p) => String(p.sourceType || '') === 'pr' && String(p.sourceDocumentNumber || '') === selectedDocNumber);
    } else if (activeTab === 'quotation') {
      base = products.filter((p) => String(p.sourceType || '') === 'quotation' && String(p.sourceDocumentNumber || '') === selectedDocNumber);
    } else {
      base = products.filter((p) => !p.sourceType || p.sourceType === 'product');
    }
    if (!searchTerm.trim()) return base;
    const term = searchTerm.toLowerCase();
    return base.filter((p) => buildSearchableText(p).includes(term));
  }, [products, activeTab, selectedDocNumber, searchTerm]);

  if (!isOpen) return null;

  const tabs: { id: SourceTab; label: string }[] = [
    ...(hasPR ? [{ id: 'pr' as SourceTab, label: 'จาก PR ที่อนุมัติ' }] : []),
    ...(hasQuotation ? [{ id: 'quotation' as SourceTab, label: 'จาก QT' }] : []),
    { id: 'product' as SourceTab, label: 'สินค้าทั้งหมด' },
  ];

  const activeDocOptions = activeTab === 'pr' ? prOptions : activeTab === 'quotation' ? quotationOptions : [];

  const switchTab = (tab: SourceTab) => {
    setActiveTab(tab);
    setSearchTerm('');
    if (tab === 'pr') setSelectedDocNumber(prOptions[0]?.value || '');
    else if (tab === 'quotation') setSelectedDocNumber(quotationOptions[0]?.value || '');
    else setSelectedDocNumber('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`border rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[82vh] flex flex-col ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>

        {/* Header */}
        <div className={`px-6 py-4 border-b flex justify-between items-center rounded-t-2xl ${
          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
        }`}>
          <div>
            <h2 className={`text-base font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>เลือกสินค้า</h2>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{filteredProducts.length} รายการ</p>
          </div>
          <button onClick={onClose} className={`text-2xl leading-none hover:opacity-70 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>×</button>
        </div>

        {/* Tabs — only show when there are multiple source groups */}
        {tabs.length > 1 && (
          <div className={`flex border-b overflow-x-auto ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={`flex-shrink-0 px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? (darkMode ? 'border-orange-400 text-orange-300' : 'border-orange-500 text-orange-700')
                    : (darkMode ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700')
                }`}
              >
                {tab.label}
                {tab.id === 'pr' && (
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    darkMode ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {prOptions.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className={`px-5 py-3 border-b space-y-2 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          {activeDocOptions.length > 0 && (
            <div>
              <label className={`mb-1 block text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {activeTab === 'pr' ? 'เลือกใบขอซื้อ (PR)' : 'เลือก Quotation'}
              </label>
              <select
                value={selectedDocNumber}
                onChange={(e) => setSelectedDocNumber(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${
                  darkMode ? 'bg-gray-900 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {activeDocOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
          <input
            type="text"
            placeholder="ค้นหาสินค้า..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${
              darkMode
                ? 'bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
            autoFocus
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>กำลังโหลด...</div>
          ) : filteredProducts.length === 0 ? (
            <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {searchTerm ? 'ไม่พบสินค้าที่ค้นหา' : 'ไม่มีรายการ'}
            </div>
          ) : (
            <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredProducts.map((product, idx) => (
                <button
                  key={`${product.sourceType || ''}-${product.productCode || ''}-${product.sourceDocumentNumber || ''}-${idx}`}
                  onClick={() => { onSelect(product); onClose(); }}
                  className={`w-full px-5 py-3 text-left transition-colors flex justify-between items-center ${
                    darkMode ? 'hover:bg-gray-700 text-gray-100' : 'hover:bg-orange-50 text-gray-900'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {product.productCode || '—'}
                    </div>
                    <div className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {buildProductName(product)}
                    </div>

                    {/* PR source info */}
                    {activeTab === 'pr' && (
                      <div className={`mt-1 text-[11px] font-medium ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                        {product.quantity
                          ? `จำนวนที่ขอ: ${Number(product.quantity).toLocaleString('th-TH')} ${product.unit || ''}`
                          : ''}
                        {product.cost != null && product.cost !== ''
                          ? ` · ราคาประมาณ: ฿${Number(product.cost).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                          : ''}
                      </div>
                    )}

                    {/* QT source info */}
                    {activeTab === 'quotation' && (product.sourceCustomer || product.quantity) && (
                      <div className={`mt-0.5 text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {product.sourceCustomer ? `Customer: ${product.sourceCustomer}` : ''}
                        {product.sourceCustomer && product.quantity ? ' · ' : ''}
                        {product.quantity ? `Qty: ${Number(product.quantity).toLocaleString()}` : ''}
                      </div>
                    )}

                    {/* Product catalog cost */}
                    {activeTab === 'product' && product.cost != null && product.cost !== '' && (
                      <div className={`text-[11px] mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        Cost: ฿{Number(product.cost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                  <span className={`text-lg leading-none ml-3 flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>→</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t rounded-b-2xl flex items-center justify-between ${
          darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'
        }`}>
          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {filteredProducts.length} รายการ
          </span>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              darkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}
