import React, { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout/Layout';
import ProductSelectionModal from '../components/ProductSelectionModal';
import invoiceService from '../services/invoiceService';
import codeService from '../services/codeService';
import useThemePreference from '../hooks/useThemePreference';
import { printDocumentContent } from '../utils/printDocument';
import { showAppAlert, showAppConfirm } from '../services/dialogService';

const getTodayDateInputValue = () => new Date().toISOString().slice(0, 10);

const formatPrintDate = (value: any) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
};

export default function KeyInvoice({ onNavigate = () => {}, initialData = null, embedded = false, darkMode: embeddedDarkMode, setDarkMode: embeddedSetDarkMode, currentPage = 'key-invoice' }: any) {
  const [preferredDarkMode, setPreferredDarkMode] = useThemePreference();
  const darkMode = embedded ? embeddedDarkMode : preferredDarkMode;
  const setDarkMode = embedded ? embeddedSetDarkMode : setPreferredDarkMode;
  const [mode, setMode] = useState('create');

  const [header, setHeader] = useState({
    documentId: '',
    documentNumber: '',
    invoiceId: '',
    invoiceDate: getTodayDateInputValue(),
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

  const [customerCodes, setCustomerCodes] = useState<any[]>([]);
  const [destinationCodes, setDestinationCodes] = useState<any[]>([]);
  const [productCodes, setProductCodes] = useState<any[]>([]);
  const [isLoadingCodes, setIsLoadingCodes] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const printSheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadCodeOptions = async () => {
      setIsLoadingCodes(true);
      try {
        const [customerResponse, destinationResponse, productResponse] = await Promise.all([
          codeService.getAll('customer'),
          codeService.getAll('destination'),
          codeService.getAll('product'),
        ]);
        setCustomerCodes(customerResponse.data.data || []);
        setDestinationCodes(destinationResponse.data.data || []);
        setProductCodes(productResponse.data.data || []);
        setCodeError(null);
      } catch (err) {
        setCodeError('Failed to load code lists');
      } finally {
        setIsLoadingCodes(false);
      }
    };

    loadCodeOptions();
  }, []);

  useEffect(() => {
    if (!initialData) {
      setMode('create');
      setHeader({
        documentId: '',
        documentNumber: '',
        invoiceId: '',
        invoiceDate: getTodayDateInputValue(),
        customer: '',
        invoiceNo: '',
        dueDate: '',
        billTo: '',
        shipTo: '',
        paymentMethod: 'Bank Transfer',
      });
      setItems([
        { id: '', description: '', quantity: '', unitPrice: '', total: '' },
      ]);
      return;
    }

    setMode(initialData.__mode || 'edit');

    setHeader((prev) => ({
      ...prev,
      documentId: initialData.documentId || initialData.id || '',
      documentNumber: initialData.documentNumber || initialData.invoiceNo || initialData.invoiceId || '',
      invoiceId: initialData.invoiceId || '',
      invoiceDate: initialData.invoiceDate || initialData.documentDate || '',
      customer: initialData.customer || '',
      invoiceNo: initialData.invoiceNo || initialData.documentNumber || '',
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

  const isViewMode = mode === 'view';
  const formControlClass = 'bg-white border-gray-300 text-black';

  const totalQuantity = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;
  const printItems = items.filter((item) => item.id || item.description || item.quantity || item.unitPrice || item.total);

  const customerDisplay = (() => {
    const customerId = String(header.customer || '').trim();
    if (!customerId) return '';

    const selectedCustomer = customerCodes.find((customer) => customer.customerId === customerId);
    if (!selectedCustomer) return customerId;

    return selectedCustomer.customerName || selectedCustomer.shortName || selectedCustomer.customerId || customerId;
  })();

  const shipToDisplay = (() => {
    const destinationId = String(header.shipTo || '').trim();
    if (!destinationId) return '';

    const selectedDestination = destinationCodes.find((destination) => destination.destId === destinationId);
    if (!selectedDestination) return destinationId;

    return selectedDestination.destination || selectedDestination.location || selectedDestination.destId || destinationId;
  })();

  const handleHeaderChange = (field, value) => {
    if (isViewMode) return;
    setHeader((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index, field, value) => {
    if (isViewMode) return;
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

  const handleProductSelect = (product: any) => {
    if (isViewMode || selectedItemIndex === null) return;

    setItems((prev) => {
      const next = [...prev];
      next[selectedItemIndex] = {
        ...next[selectedItemIndex],
        id: product.productId,
        description: product.productName || '',
      };
      return next;
    });
  };

  const addItemRow = () => {
    if (isViewMode) return;
    setItems((prev) => [
      ...prev,
      { id: '', description: '', quantity: '', unitPrice: '', total: '' },
    ]);
  };

  const removeItemRow = (index) => {
    if (isViewMode) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const goBackToDocuments = () => {
    onNavigate('documents', { selectedType: 'invoice' });
  };

  const goBackToDocumentsWithSavedRecord = (savedRecord: any) => {
    onNavigate('documents', {
      selectedType: 'invoice',
      action: 'save',
      savedRecord,
    });
  };

  const handlePrint = () => {
    if (!printSheetRef.current) {
      void showAppAlert({ title: 'Print Error', message: 'Print form is not ready yet.', tone: 'danger' });
      return;
    }

    printDocumentContent('', printSheetRef.current.outerHTML);
  };

  const content = (
      <div className={embedded ? '' : `min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className={`print-invoice-doc ${embedded ? 'px-0 py-0' : 'max-w-5xl mx-auto px-6 py-10'}`}>
          <div ref={printSheetRef} className={`${isViewMode ? 'block' : 'hidden print:block'} invoice-print-sheet border border-black bg-white p-4 text-[12px] leading-tight text-black`}>
            <div className="flex items-start gap-4 border-b-2 border-red-700 pb-3">
              <div className="flex h-16 w-16 items-center justify-center border border-black bg-gray-100 text-lg font-bold">CT</div>
              <div className="flex-1 text-center">
                <div className="text-3xl font-bold tracking-wide">CHAYA TENANG SDN.BHD.</div>
                <div className="mt-1 text-[11px]">(56951-U)</div>
                <div className="mt-1 text-[11px]">No.33, Jalan Mutiara Emas 7/6 Taman Mount Austin 81100 Johor Bahru, Johor Malaysia</div>
                <div className="text-[11px]">Mobile : 012-7849148   Email : chayatenang@yahoo.com</div>
              </div>
            </div>

            <div className="mt-3 bg-gray-500 py-1 text-center text-[22px] font-semibold text-white">
              Invoice
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-[12px]">
              <div className="space-y-2">
                <div className="flex items-center gap-2"><span className="w-24 font-semibold">Invoice No :</span><span className="min-w-[120px] border border-black px-3 py-1 text-center font-semibold">{header.invoiceNo || header.invoiceId || '-'}</span></div>
                <div><span className="font-semibold">Customer :</span> {customerDisplay || '-'}</div>
                <div><span className="font-semibold">Bill To :</span> {header.billTo || customerDisplay || '-'}</div>
                <div><span className="font-semibold">Ship To :</span> {shipToDisplay || '-'}</div>
                <div><span className="font-semibold">Payment Method :</span> {header.paymentMethod || '-'}</div>
              </div>
              <div className="space-y-2">
                <div><span className="font-semibold">Invoice Date :</span> {formatPrintDate(header.invoiceDate)}</div>
                <div><span className="font-semibold">Due Date :</span> {formatPrintDate(header.dueDate)}</div>
                <div><span className="font-semibold">Customer Code :</span> {header.customer || '-'}</div>
                <div><span className="font-semibold">Ship To Code :</span> {header.shipTo || '-'}</div>
              </div>
            </div>

            <table className="mt-4 w-full border-collapse border border-black text-[12px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="w-10 border border-black px-2 py-1">Item</th>
                  <th className="w-16 border border-black px-2 py-1">ID</th>
                  <th className="border border-black px-2 py-1">Description</th>
                  <th className="w-28 border border-black px-2 py-1">Quantity</th>
                  <th className="w-24 border border-black px-2 py-1">Unit Price</th>
                  <th className="w-24 border border-black px-2 py-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {printItems.length === 0 ? (
                  <tr>
                    <td className="border border-black px-2 py-2 text-center" colSpan={6}>-</td>
                  </tr>
                ) : (
                  printItems.map((item, idx) => (
                    <tr key={`print-${idx}`}>
                      <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                      <td className="border border-black px-2 py-1 text-center">{item.id || '-'}</td>
                      <td className="border border-black px-2 py-1">{item.description || '-'}</td>
                      <td className="border border-black px-2 py-1 text-right">{Number(item.quantity || 0).toFixed(3)}</td>
                      <td className="border border-black px-2 py-1 text-right">{Number(item.unitPrice || 0).toFixed(2)}</td>
                      <td className="border border-black px-2 py-1 text-right">{Number(item.total || 0).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="mt-4 grid grid-cols-2 gap-6">
              <div>
                <div className="font-semibold">Remark :</div>
                <div className="mt-2 min-h-[70px] border border-black px-3 py-2">-</div>
              </div>
              <div className="space-y-1 text-[13px]">
                <div className="flex justify-between"><span className="font-semibold">Total Quantity :</span><span className="font-semibold">{totalQuantity.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="font-semibold">Subtotal :</span><span className="font-semibold">{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="font-semibold">Tax (10%) :</span><span className="font-semibold">{tax.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="font-semibold">Total Amount Due :</span><span className="font-semibold">{total.toFixed(2)}</span></div>
                <div className="mt-8 border-t border-black pt-8 text-center">Approval Sign by Authorized Person</div>
              </div>
            </div>
          </div>

          <div
            className={`print:hidden border rounded-2xl shadow ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            {/* Title bar */}
            <div
              className={`px-6 py-3 text-center font-semibold text-sm tracking-wide rounded-t-2xl ${
                darkMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-200 text-gray-900'
              }`}
            >
              Invoice Management
            </div>

            <div className="px-6 py-6 space-y-4 text-xs">
              <fieldset disabled={isViewMode} className={isViewMode ? 'opacity-95 space-y-4' : 'space-y-4'}>
              {/* Error display */}
              {codeError && (
                <div className={`px-3 py-2 rounded text-xs ${darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-900'}`}>
                  {codeError}
                </div>
              )}

              {/* Top row: Invoice No / Invoice Date */}
              <div className="grid grid-cols-2 gap-5">
                <div className="flex items-center gap-3">
                  <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Invoice No :</span>
                  <input
                    className={`flex-1 rounded-md border px-3 py-2 text-xs ${formControlClass}`}
                    value={header.invoiceNo || header.documentNumber || header.invoiceId}
                    onChange={(e) => {
                      handleHeaderChange('invoiceNo', e.target.value);
                      handleHeaderChange('invoiceId', e.target.value);
                      handleHeaderChange('documentNumber', e.target.value);
                    }}
                  />
                </div>
                <div className="flex items-center gap-3 justify-end">
                  <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Invoice Date :</span>
                  <input
                    type="date"
                    className={`rounded-md border px-3 py-2 text-xs ${formControlClass}`}
                    value={header.invoiceDate}
                    onChange={(e) => handleHeaderChange('invoiceDate', e.target.value)}
                  />
                </div>
              </div>

              {/* Error display */}
              {codeError && (
                <div className={`px-3 py-2 rounded text-xs ${darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-900'}`}>
                  {codeError}
                </div>
              )}

              {/* Customer */}
              <div className="flex items-center gap-3">
                <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Customer :</span>
                <select
                  className={`flex-1 rounded-md border px-3 py-2 text-xs ${formControlClass}`}
                  value={header.customer}
                  onChange={(e) => handleHeaderChange('customer', e.target.value)}
                >
                  <option value="">{isLoadingCodes ? 'Loading customers...' : 'Select customer code'}</option>
                  {customerCodes.map((customer) => (
                    <option key={customer.customerId} value={customer.customerId}>
                      {customer.customerId} - {customer.customerName || customer.shortName || 'Unnamed'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Invoice row */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Due Date :</span>
                  <input
                    type="date"
                    className={`flex-1 rounded-md border px-3 py-2 text-xs ${formControlClass}`}
                    value={header.dueDate}
                    onChange={(e) => handleHeaderChange('dueDate', e.target.value)}
                  />
                </div>
              </div>

              {/* Bill To */}
              <div className="flex items-center gap-3">
                <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Bill To :</span>
                <input
                  className={`flex-1 rounded-md border px-3 py-2 text-xs ${formControlClass}`}
                  value={header.billTo}
                  onChange={(e) => handleHeaderChange('billTo', e.target.value)}
                />
              </div>

              {/* Ship To */}
              <div className="flex items-center gap-3">
                <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Ship To :</span>
                <select
                  className={`flex-1 rounded-md border px-3 py-2 text-xs ${formControlClass}`}
                  value={header.shipTo}
                  onChange={(e) => handleHeaderChange('shipTo', e.target.value)}
                >
                  <option value="">{isLoadingCodes ? 'Loading destinations...' : 'Select destination code'}</option>
                  {destinationCodes.map((destination) => (
                    <option key={destination.destId} value={destination.destId}>
                      {destination.destId} - {destination.destination || destination.location || 'Unnamed'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div className="flex items-center gap-3">
                <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>
                  Payment Method :
                </span>
                <input
                  className={`flex-1 rounded-md border px-3 py-2 text-xs ${formControlClass}`}
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
                  className={`grid grid-cols-[40px,80px,1.5fr,100px,90px,110px,40px] text-[11px] font-semibold px-2 py-1 ${
                    darkMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <div>Item</div>
                  <div>ID</div>
                  <div>Product</div>
                  <div>Quantity</div>
                  <div>Unit Price</div>
                  <div>Total</div>
                  <div></div>
                </div>

                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className={`grid grid-cols-[40px,80px,1.5fr,100px,90px,110px,40px] text-[11px] px-2 py-2 border-b ${
                      darkMode ? 'border-gray-700' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center">{idx + 1}</div>
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItemIndex(idx);
                          setProductModalOpen(true);
                        }}
                        className={`w-full px-1 py-0.5 text-left border rounded text-xs font-medium transition-colors ${
                          darkMode
                            ? 'bg-blue-900 border-blue-600 text-blue-200 hover:bg-blue-800'
                            : 'bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100'
                        }`}
                      >
                        {item.id || 'Select...'}
                      </button>
                    </div>
                    <div>
                      <input
                        readOnly
                        className={`w-full rounded-md border px-2 py-1.5 ${formControlClass}`}
                        placeholder="Product name"
                        value={item.description}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        className={`w-full rounded-md border px-2 py-1.5 text-right ${formControlClass}`}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        className={`w-full rounded-md border px-2 py-1.5 text-right ${formControlClass}`}
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        className={`w-full rounded-md border px-2 py-1.5 text-right ${formControlClass}`}
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

              </fieldset>

              {/* Action Buttons */}
              <div className="no-print mt-6 border-t pt-4 flex gap-3 justify-end">
                {!isViewMode && (
                  <button
                    type="button"
                    onClick={async () => {
                      const invoiceNo =
                        header.invoiceNo?.trim() ||
                        header.documentNumber?.trim() ||
                        header.invoiceId?.trim() ||
                        `I${Date.now().toString().slice(-7)}`;

                      if (!header.customer?.trim()) {
                        await showAppAlert({ title: 'Validation', message: 'Please fill Customer before saving.', tone: 'warning' });
                        return;
                      }

                      const validItems = items.filter((it) => it.id || it.description);
                      if (validItems.length === 0) {
                        await showAppAlert({ title: 'Validation', message: 'Please add at least 1 item before saving.', tone: 'warning' });
                        return;
                      }

                      const payload = {
                        header: {
                          ...header,
                          documentId: header.documentId || initialData?.documentId || initialData?.id || '',
                          documentNumber: invoiceNo,
                          invoiceNo,
                          invoiceId: invoiceNo,
                          total,
                          totalQuantity,
                          vat: 0,
                          statusOnline: 1,
                        },
                        items: validItems,
                      };

                      try {
                        const response = await invoiceService.save(payload);
                        const savedRecord = response?.data?.data || payload.header;
                        await showAppAlert({ title: 'Saved', message: 'Invoice saved successfully.', tone: 'success' });
                        setHeader((prev) => ({
                          ...prev,
                          documentId: savedRecord.documentId || savedRecord.id || prev.documentId,
                          documentNumber: savedRecord.documentNumber || invoiceNo,
                          invoiceNo,
                          invoiceId: invoiceNo,
                        }));
                        goBackToDocumentsWithSavedRecord(savedRecord);
                      } catch (error) {
                        await showAppAlert({ title: 'Save Failed', message: 'Failed to save invoice.', tone: 'danger' });
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                  >
                    <span>💾</span>
                    Save
                  </button>
                )}
                {isViewMode && (
                  <button
                    type="button"
                    onClick={() => setMode('edit')}
                    className="flex items-center gap-2 px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors"
                  >
                    <span>✏️</span>
                    Enable Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    const confirmed = await showAppConfirm({
                      title: 'Cancel Changes',
                      message: 'Any unsaved changes will be lost. Do you want to continue?',
                      confirmText: 'Yes, Cancel',
                      cancelText: 'No',
                      tone: 'warning',
                    });

                    if (confirmed) {
                      goBackToDocuments();
                    }
                  }}
                  className="flex items-center gap-2 px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                >
                  <span>❌</span>
                  Cancel
                </button>
                {isViewMode && (
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    <span>🖨️</span>
                    Print
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <ProductSelectionModal
          isOpen={productModalOpen}
          products={productCodes}
          onSelect={handleProductSelect}
          onClose={() => {
            setProductModalOpen(false);
            setSelectedItemIndex(null);
          }}
          darkMode={darkMode}
          isLoading={isLoadingCodes}
        />
      </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <Layout
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      onNavigate={onNavigate}
      currentPage={currentPage}
    >
      {content}
    </Layout>
  );
}
