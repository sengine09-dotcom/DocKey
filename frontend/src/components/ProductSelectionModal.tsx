import React, { useEffect, useMemo, useState } from 'react';

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

const buildProductName = (product: Product) => {
  const fallback = String(product.productName || product.productCode || '').trim();
  return fallback;
};

const buildSearchableText = (product: Product) => {
  return [
    product.productCode,
    product.productName,
    product.sourceLabel,
    product.sourceDocumentNumber,
    product.sourceCustomer,
  ].map((value) => String(value || '').toLowerCase()).join(' ');
};

export default function ProductSelectionModal({
  isOpen,
  products,
  onSelect,
  onClose,
  darkMode,
  isLoading,
}: ProductSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuotationDocumentNumber, setSelectedQuotationDocumentNumber] = useState('');

  const quotationOptions = useMemo(() => {
    const seen = new Set<string>();
    return products
      .filter((product) => String(product.sourceType || '').trim().toLowerCase() === 'quotation')
      .map((product) => ({
        value: String(product.sourceDocumentNumber || '').trim(),
        label: String(product.sourceLabel || product.sourceDocumentNumber || 'Confirmed Quotation').trim(),
      }))
      .filter((option) => {
        if (!option.value || seen.has(option.value)) return false;
        seen.add(option.value);
        return true;
      });
  }, [products]);

  useEffect(() => {
    if (!isOpen) return;
    setSearchTerm('');
    if (quotationOptions.length === 0) {
      setSelectedQuotationDocumentNumber('');
      return;
    }
    setSelectedQuotationDocumentNumber((prev) => {
      if (prev && quotationOptions.some((option) => option.value === prev)) {
        return prev;
      }
      return quotationOptions[0].value;
    });
  }, [isOpen, quotationOptions]);

  const filteredProducts = useMemo(() => {
    const quotationFilteredProducts = quotationOptions.length > 0
      ? products.filter((product) => String(product.sourceType || '').trim().toLowerCase() === 'quotation'
        && String(product.sourceDocumentNumber || '').trim() === selectedQuotationDocumentNumber)
      : products;

    if (!searchTerm.trim()) return quotationFilteredProducts;
    const term = searchTerm.toLowerCase();
    return quotationFilteredProducts.filter((product) => {
      const searchableText = buildSearchableText(product);
      return searchableText.includes(term);
    });
  }, [products, quotationOptions, searchTerm, selectedQuotationDocumentNumber]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={`border rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex justify-between items-center ${
            darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'
          }`}
        >
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            Select Product
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none hover:opacity-70"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b">
          {quotationOptions.length > 0 ? (
            <div className="mb-3">
              <label className={`mb-1 block text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Confirmed Quotation
              </label>
              <select
                value={selectedQuotationDocumentNumber}
                onChange={(e) => setSelectedQuotationDocumentNumber(e.target.value)}
                className={`w-full border px-3 py-2 rounded text-sm ${
                  darkMode
                    ? 'bg-gray-900 border-gray-600 text-gray-100'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {quotationOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          ) : null}
          <input
            type="text"
            placeholder="Search by product code or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full border px-3 py-2 rounded text-sm ${
              darkMode
                ? 'bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
            autoFocus
          />
        </div>

        {/* Products list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className={`p-6 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className={`p-6 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {searchTerm ? 'No products found' : 'No products available'}
            </div>
          ) : (
            <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredProducts.map((product) => (
                <button
                  key={product.productCode}
                  onClick={() => {
                    onSelect(product);
                    onClose();
                  }}
                  className={`w-full px-6 py-3 text-left hover:bg-opacity-50 transition-colors flex justify-between items-center ${
                    darkMode
                      ? 'hover:bg-gray-700 text-gray-100'
                      : 'hover:bg-blue-50 text-gray-900'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm">{product.productCode}</div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {buildProductName(product)}
                    </div>
                    {product.sourceLabel ? (
                      <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${product.sourceType === 'quotation'
                        ? (darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                        : (darkMode ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-100 text-blue-700')}`}>
                        {product.sourceLabel}
                      </div>
                    ) : null}
                    {product.sourceType === 'quotation' && (product.sourceCustomer || product.quantity) ? (
                      <div className={`mt-1 text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {product.sourceCustomer ? `Customer: ${product.sourceCustomer}` : ''}
                        {product.sourceCustomer && product.quantity ? ' · ' : ''}
                        {product.quantity ? `Qty: ${Number(product.quantity || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}` : ''}
                      </div>
                    ) : null}
                    <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Cost : {Number(product.cost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <span className={`text-lg leading-none ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    →
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-100'}`}>
          <button
            onClick={onClose}
            className={`w-full px-4 py-2 rounded font-medium transition-colors ${
              darkMode
                ? 'bg-gray-600 hover:bg-gray-500 text-white'
                : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
