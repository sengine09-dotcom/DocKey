import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout/Layout';

export default function KeyInvoice({ onNavigate = () => {}, initialData = null }) {
  const [darkMode, setDarkMode] = useState(true);

  const [header, setHeader] = useState({
    invoiceId: '',
    invoiceDate: '',
    customer: '',
    invoiceNo: '',
    dueDate: '',
    billTo: '',
    shipTo: '',
    paymentMethod: 'Bank Transfer',
  });

  const [items, setItems] = useState([
    { id: '', description: '', quantity: '', unitPrice: '', total: '' },
  ]);

  useEffect(() => {
    if (!initialData) {
      return;
    }

    setHeader((prev) => ({
      ...prev,
      invoiceId: initialData.invoiceId || '',
      invoiceDate: initialData.invoiceDate || '',
      customer: initialData.customer || '',
      invoiceNo: initialData.invoiceNo || '',
      dueDate: initialData.dueDate || '',
      billTo: initialData.billTo || '',
      shipTo: initialData.shipTo || '',
      paymentMethod: initialData.paymentMethod || prev.paymentMethod,
    }));

    if (Array.isArray(initialData.items) && initialData.items.length > 0) {
      setItems(
        initialData.items.map((item) => ({
          id: item.id || '',
          description: item.description || '',
          quantity: item.quantity || '',
          unitPrice: item.unitPrice || '',
          total: item.total || '',
        }))
      );
    }
  }, [initialData]);

  const totalQuantity = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const handleHeaderChange = (field, value) => {
    setHeader((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      const updated = { ...next[index], [field]: value };

      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? value : updated.quantity;
        const price = field === 'unitPrice' ? value : updated.unitPrice;
        const qtyNum = parseFloat(qty) || 0;
        const priceNum = parseFloat(price) || 0;
        updated.total = qtyNum && priceNum ? (qtyNum * priceNum).toFixed(2) : '';
      }

      next[index] = updated;
      return next;
    });
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      { id: '', description: '', quantity: '', unitPrice: '', total: '' },
    ]);
  };

  const removeItemRow = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Layout
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      onNavigate={onNavigate}
      currentPage="key-invoice"
    >
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div
            className={`border rounded-2xl shadow ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            {/* Title bar */}
            <div
              className={`px-6 py-3 text-center font-semibold text-sm tracking-wide ${
                darkMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-200 text-gray-900'
              }`}
            >
              Invoice Management
            </div>

            <div className="px-6 py-6 space-y-4 text-xs">
              {/* Top row: Invoice ID / Invoice Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Invoice ID :</span>
                  <input
                    className={`flex-1 border px-2 py-1 text-xs ${
                      darkMode
                        ? 'bg-gray-900 border-gray-600 text-gray-100'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={header.invoiceId}
                    onChange={(e) => handleHeaderChange('invoiceId', e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Invoice Date :</span>
                  <input
                    type="date"
                    className={`border px-2 py-1 text-xs ${
                      darkMode
                        ? 'bg-gray-900 border-gray-600 text-gray-100'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={header.invoiceDate}
                    onChange={(e) => handleHeaderChange('invoiceDate', e.target.value)}
                  />
                </div>
              </div>

              {/* Customer */}
              <div className="flex items-center gap-2">
                <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Customer :</span>
                <input
                  className={`flex-1 border px-2 py-1 text-xs ${
                    darkMode
                      ? 'bg-gray-900 border-gray-600 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  value={header.customer}
                  onChange={(e) => handleHeaderChange('customer', e.target.value)}
                />
              </div>

              {/* Invoice row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Invoice No :</span>
                  <input
                    className={`flex-1 border px-2 py-1 text-xs ${
                      darkMode
                        ? 'bg-gray-900 border-gray-600 text-gray-100'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={header.invoiceNo}
                    onChange={(e) => handleHeaderChange('invoiceNo', e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Due Date :</span>
                  <input
                    type="date"
                    className={`flex-1 border px-2 py-1 text-xs ${
                      darkMode
                        ? 'bg-gray-900 border-gray-600 text-gray-100'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={header.dueDate}
                    onChange={(e) => handleHeaderChange('dueDate', e.target.value)}
                  />
                </div>
              </div>

              {/* Bill To */}
              <div className="flex items-center gap-2">
                <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Bill To :</span>
                <input
                  className={`flex-1 border px-2 py-1 text-xs ${
                    darkMode
                      ? 'bg-gray-900 border-gray-600 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  value={header.billTo}
                  onChange={(e) => handleHeaderChange('billTo', e.target.value)}
                />
              </div>

              {/* Ship To */}
              <div className="flex items-center gap-2">
                <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Ship To :</span>
                <input
                  className={`flex-1 border px-2 py-1 text-xs ${
                    darkMode
                      ? 'bg-gray-900 border-gray-600 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  value={header.shipTo}
                  onChange={(e) => handleHeaderChange('shipTo', e.target.value)}
                />
              </div>

              {/* Payment Method */}
              <div className="flex items-center gap-2">
                <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>
                  Payment Method :
                </span>
                <input
                  className={`flex-1 border px-2 py-1 text-xs ${
                    darkMode
                      ? 'bg-gray-900 border-gray-600 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  value={header.paymentMethod}
                  onChange={(e) => handleHeaderChange('paymentMethod', e.target.value)}
                />
              </div>

              {/* Items table */}
              <div
                className={`mt-4 border-t ${
                  darkMode ? 'border-gray-600' : 'border-gray-300'
                } pt-3`}
              >
                <div
                  className={`grid grid-cols-[60px,2fr,100px,100px,110px,40px] text-[11px] font-semibold px-2 py-1 ${
                    darkMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <div>Item</div>
                  <div>Description</div>
                  <div>Quantity</div>
                  <div>Unit Price</div>
                  <div>Total</div>
                  <div></div>
                </div>

                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className={`grid grid-cols-[60px,2fr,100px,100px,110px,40px] text-[11px] px-2 py-1 border-b ${
                      darkMode ? 'border-gray-700' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center">{idx + 1}</div>
                    <div>
                      <input
                        className={`w-full border px-1 py-0.5 ${
                          darkMode
                            ? 'bg-gray-900 border-gray-600 text-gray-100'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        className={`w-full border px-1 py-0.5 text-right ${
                          darkMode
                            ? 'bg-gray-900 border-gray-600 text-gray-100'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        className={`w-full border px-1 py-0.5 text-right ${
                          darkMode
                            ? 'bg-gray-900 border-gray-600 text-gray-100'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        className={`w-full border px-1 py-0.5 text-right ${
                          darkMode
                            ? 'bg-gray-900 border-gray-600 text-gray-100'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        value={item.total}
                        onChange={(e) => handleItemChange(idx, 'total', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-center">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="text-red-500 text-lg leading-none"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center px-2 py-2">
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-[11px] px-3 py-1 rounded border border-dashed border-blue-500 text-blue-500 hover:bg-blue-50"
                  >
                    + Add Item
                  </button>
                </div>
              </div>

              {/* Totals */}
              <div className="mt-4 border-t pt-3 text-[11px] space-y-1">
                <div className="flex justify-end gap-16">
                  <div className="flex gap-2">
                    <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>
                      Subtotal :
                    </span>
                    <span className={darkMode ? 'text-gray-100' : 'text-gray-900'}>
                      {subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end gap-16">
                  <div className="flex gap-2">
                    <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>
                      Tax (10%) :
                    </span>
                    <span className={darkMode ? 'text-gray-100' : 'text-gray-900'}>
                      {tax.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end gap-16 font-semibold">
                  <div className="flex gap-2">
                    <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>
                      Total Amount Due :
                    </span>
                    <span className={darkMode ? 'text-gray-100' : 'text-gray-900'}>
                      {total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="no-print mt-6 border-t pt-4 flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    alert('💾 Invoice saved successfully!');
                  }}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                >
                  <span>💾</span>
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('❌ Cancel? Any unsaved changes will be lost.')) {
                      onNavigate('invoice-home');
                    }
                  }}
                  className="flex items-center gap-2 px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                >
                  <span>❌</span>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert('🖨️ Print Invoice\n\nOpening print dialog...');
                    window.print();
                  }}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  <span>🖨️</span>
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
