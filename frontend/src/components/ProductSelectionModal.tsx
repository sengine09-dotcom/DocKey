import React, { useState, useMemo } from 'react';

interface Product {
  productId: string;
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

export default function ProductSelectionModal({
  isOpen,
  products,
  onSelect,
  onClose,
  darkMode,
  isLoading,
}: ProductSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    
    const term = searchTerm.toLowerCase();
    return products.filter((product) => {
      const id = (product.productId || '').toLowerCase();
      const name = (product.productName || '').toLowerCase();
      return id.includes(term) || name.includes(term);
    });
  }, [products, searchTerm]);

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
                  key={product.productId}
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
                    <div className="font-semibold text-sm">{product.productId}</div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {product.productName}
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
