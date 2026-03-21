import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout/Layout';

export default function KeyDocumentMonitor({ onNavigate = () => {}, initialData = null }: any) {
  const [darkMode, setDarkMode] = useState(true);

  const [header, setHeader] = useState({
    monitorId: '',
    issuedDate: '',
    customer: '',
    poNo: '',
    poDate: '',
    requestDate: '',
    destination: '',
    deliveredTo: '',
    paymentTerm: '30 Days from Delivery Date',
  });

  const [items, setItems] = useState([
    { id: '', product: '', packing: '', quantity: '', price: '', total: '' },
  ]);

  useEffect(() => {
    if (!initialData) {
      return;
    }

    setHeader((prev) => ({
      ...prev,
      monitorId: initialData.monitorId || '',
      issuedDate: initialData.issuedDate || '',
      customer: initialData.customer || '',
      poNo: initialData.poNo || '',
      poDate: initialData.poDate || '',
      requestDate: initialData.requestDate || '',
      destination: initialData.destination || '',
      deliveredTo: initialData.deliveredTo || '',
      paymentTerm: initialData.paymentTerm || prev.paymentTerm,
    }));

    if (Array.isArray(initialData.items) && initialData.items.length > 0) {
      setItems(
        initialData.items.map((item) => ({
          id: item.id || '',
          product: item.product || '',
          packing: item.packing || '',
          quantity: item.quantity || '',
          price: item.price || '',
          total: item.total || '',
        }))
      );
    }
  }, [initialData]);

  const totalQuantity = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
  const totalSales = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);

  const handleHeaderChange = (field, value) => {
    setHeader((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      const updated = { ...next[index], [field]: value };

      if (field === 'quantity' || field === 'price') {
        const qty = field === 'quantity' ? value : updated.quantity;
        const price = field === 'price' ? value : updated.price;
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
      { id: '', product: '', packing: '', quantity: '', price: '', total: '' },
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
      currentPage="key-monitor"
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
              Individual Customer Monitoring
            </div>

            <div className="px-6 py-6 space-y-4 text-xs">
              {/* Top row: Monitor ID / Issued Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Monitor ID :</span>
                  <input
                    className={`flex-1 border px-2 py-1 text-xs ${
                      darkMode
                        ? 'bg-gray-900 border-gray-600 text-gray-100'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={header.monitorId}
                    onChange={(e) => handleHeaderChange('monitorId', e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Issued Date :</span>
                  <input
                    type="date"
                    className={`border px-2 py-1 text-xs ${
                      darkMode
                        ? 'bg-gray-900 border-gray-600 text-gray-100'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={header.issuedDate}
                    onChange={(e) => handleHeaderChange('issuedDate', e.target.value)}
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

              {/* PO row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Po No :</span>
                  <input
                    className={`flex-1 border px-2 py-1 text-xs ${
                      darkMode
                        ? 'bg-gray-900 border-gray-600 text-gray-100'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={header.poNo}
                    onChange={(e) => handleHeaderChange('poNo', e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Po Date :</span>
                  <input
                    type="date"
                    className={`flex-1 border px-2 py-1 text-xs ${
                      darkMode
                        ? 'bg-gray-900 border-gray-600 text-gray-100'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={header.poDate}
                    onChange={(e) => handleHeaderChange('poDate', e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>
                    Request Date :
                  </span>
                  <input
                    type="date"
                    className={`flex-1 border px-2 py-1 text-xs ${
                      darkMode
                        ? 'bg-gray-900 border-gray-600 text-gray-100'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={header.requestDate}
                    onChange={(e) => handleHeaderChange('requestDate', e.target.value)}
                  />
                </div>
              </div>

              {/* Destination */}
              <div className="flex items-center gap-2">
                <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Destination :</span>
                <input
                  className={`flex-1 border px-2 py-1 text-xs ${
                    darkMode
                      ? 'bg-gray-900 border-gray-600 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  value={header.destination}
                  onChange={(e) => handleHeaderChange('destination', e.target.value)}
                />
              </div>

              {/* Delivered to */}
              <div className="flex items-center gap-2">
                <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Delivered to :</span>
                <input
                  className={`flex-1 border px-2 py-1 text-xs ${
                    darkMode
                      ? 'bg-gray-900 border-gray-600 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  value={header.deliveredTo}
                  onChange={(e) => handleHeaderChange('deliveredTo', e.target.value)}
                />
              </div>

              {/* Payment Term */}
              <div className="flex items-center gap-2">
                <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>
                  Payment Term :
                </span>
                <input
                  className={`flex-1 border px-2 py-1 text-xs ${
                    darkMode
                      ? 'bg-gray-900 border-gray-600 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  value={header.paymentTerm}
                  onChange={(e) => handleHeaderChange('paymentTerm', e.target.value)}
                />
              </div>

              {/* Items table */}
              <div
                className={`mt-4 border-t ${
                  darkMode ? 'border-gray-600' : 'border-gray-300'
                } pt-3`}
              >
                <div
                  className={`grid grid-cols-[40px,80px,1.5fr,100px,90px,110px,40px] text-[11px] font-semibold px-2 py-1 ${
                    darkMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <div>Item</div>
                  <div>ID</div>
                  <div>Product</div>
                  <div>Quantity</div>
                  <div>Price</div>
                  <div>Total</div>
                  <div></div>
                </div>

                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className={`grid grid-cols-[40px,80px,1.5fr,100px,90px,110px,40px] text-[11px] px-2 py-1 border-b ${
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
                        value={item.id}
                        onChange={(e) => handleItemChange(idx, 'id', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <input
                        className={`w-full border px-1 py-0.5 ${
                          darkMode
                            ? 'bg-gray-900 border-gray-600 text-gray-100'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="Product"
                        value={item.product}
                        onChange={(e) => handleItemChange(idx, 'product', e.target.value)}
                      />
                      <input
                        className={`w-full border px-1 py-0.5 text-[10px] italic ${
                          darkMode
                            ? 'bg-gray-900 border-gray-600 text-gray-300'
                            : 'bg-white border-gray-300 text-gray-700'
                        }`}
                        placeholder="Packing"
                        value={item.packing}
                        onChange={(e) => handleItemChange(idx, 'packing', e.target.value)}
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
                        value={item.price}
                        onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
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
                      Total Quantity (MT) :
                    </span>
                    <span className={darkMode ? 'text-gray-100' : 'text-gray-900'}>
                      {totalQuantity.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end gap-16">
                  <div className="flex gap-2">
                    <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>
                      Total Sales :
                    </span>
                    <span className={darkMode ? 'text-gray-100' : 'text-gray-900'}>
                      {totalSales.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end gap-16">
                  <div className="flex gap-2">
                    <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>
                      Add GST @ 0% :
                    </span>
                    <span className={darkMode ? 'text-gray-100' : 'text-gray-900'}>0.00</span>
                  </div>
                </div>
                <div className="flex justify-end gap-16 font-semibold">
                  <div className="flex gap-2">
                    <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>
                      Total Amount Due :
                    </span>
                    <span className={darkMode ? 'text-gray-100' : 'text-gray-900'}>
                      {totalSales.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="no-print mt-6 border-t pt-4 flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    alert('💾 Monitor document saved successfully!');
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
                      onNavigate('monitor-home');
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
                    alert('🖨️ Print Monitor Document\n\nOpening print dialog...');
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


