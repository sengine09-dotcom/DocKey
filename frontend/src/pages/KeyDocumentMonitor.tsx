import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout/Layout';
import ProductSelectionModal from '../components/ProductSelectionModal';
import codeService from '../services/codeService';
import monitorService from '../services/monitorService';
import useThemePreference from '../hooks/useThemePreference';

const toDateInputValue = (value: any) => {
  if (!value) return '';
  return String(value).slice(0, 10);
};

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

export default function KeyDocumentMonitor({ onNavigate = () => {}, initialData = null }: any) {
  const [darkMode, setDarkMode] = useThemePreference();
  const [mode, setMode] = useState('create');
  const [customerCodes, setCustomerCodes] = useState<any[]>([]);
  const [destinationCodes, setDestinationCodes] = useState<any[]>([]);
  const [productCodes, setProductCodes] = useState<any[]>([]);
  const [paymentTermCodes, setPaymentTermCodes] = useState<any[]>([]);
  const [isLoadingCodes, setIsLoadingCodes] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  const [header, setHeader] = useState({
    monitorId: '',
    issuedDate: '',
    customer: '',
    poNo: '',
    poDate: '',
    requestDate: '',
    destination: '',
    deliveredTo: '',
    paymentTerm: '',
  });

  const [items, setItems] = useState([
    { id: '', product: '', packing: '', quantity: '', price: '', total: '' },
  ]);

  const loadNextMonitorId = async (forceReplace = false) => {
    try {
      const response = await monitorService.getNextId();
      const nextId = response?.data?.data?.monitorId;
      if (!nextId) {
        return;
      }

      setHeader((prev) => ({
        ...prev,
        monitorId: forceReplace ? nextId : prev.monitorId || nextId,
      }));
    } catch (error: any) {
      setCodeError(error?.response?.data?.message || error.message || 'Failed to generate Monitor ID');
    }
  };

  useEffect(() => {
    const loadCodeOptions = async () => {
      try {
        setIsLoadingCodes(true);
        setCodeError('');

        const [customerResponse, destinationResponse, productResponse, paymentTermResponse] = await Promise.all([
          codeService.getAll('customer'),
          codeService.getAll('destination'),
          codeService.getAll('product'),
          codeService.getAll('payment-term'),
        ]);

        setCustomerCodes(customerResponse.data.data || []);
        setDestinationCodes(destinationResponse.data.data || []);
        setProductCodes(productResponse.data.data || []);
        setPaymentTermCodes(paymentTermResponse.data.data || []);
      } catch (error: any) {
        setCodeError(error?.response?.data?.message || error.message || 'Failed to load code lists');
      } finally {
        setIsLoadingCodes(false);
      }
    };

    loadCodeOptions();
  }, []);

  useEffect(() => {
    if (!initialData || !initialData.monitorId) {
      setMode('create');
      setHeader((prev) => ({
        ...prev,
        monitorId: '',
        issuedDate: '',
        customer: '',
        poNo: '',
        poDate: '',
        requestDate: '',
        destination: '',
        deliveredTo: '',
        paymentTerm: '',
      }));
      setItems([{ id: '', product: '', packing: '', quantity: '', price: '', total: '' }]);
      void loadNextMonitorId();
      return;
    }

    setMode(initialData.__mode || 'edit');

    setHeader((prev) => ({
      ...prev,
      monitorId: initialData.monitorId || '',
      issuedDate: toDateInputValue(initialData.issuedDate),
      customer: initialData.customer || '',
      poNo: initialData.poNo || '',
      poDate: toDateInputValue(initialData.poDate),
      requestDate: toDateInputValue(initialData.requestDate),
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

  const isViewMode = mode === 'view';
  const formControlClass = 'bg-white border-gray-300 text-black';

  const totalQuantity = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
  const totalSales = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  const printItems = items.filter((item) => item.id || item.product || item.quantity || item.price || item.total);

  const handleHeaderChange = (field, value) => {
    if (isViewMode) return;
    setHeader((prev) => ({ ...prev, [field]: value }));
  };

  const handleCustomerChange = (customerId: string) => {
    if (isViewMode) return;

    const selectedCustomer = customerCodes.find((customer) => customer.customerId === customerId);
    const customerTermId = selectedCustomer?.idTerm || '';
    const nextPaymentTerm = customerId
      ? customerTermId
      : '';

    setHeader((prev) => ({
      ...prev,
      customer: customerId,
      paymentTerm: nextPaymentTerm,
    }));
  };

  const resolvePaymentTermId = (value: string) => {
    const normalized = String(value || '').trim();
    if (!normalized) return '';

    const matched = paymentTermCodes.find(
      (term) => term.termId === normalized || term.termName === normalized || term.shortName === normalized
    );

    return matched?.termId || normalized;
  };

  const paymentTermDisplay = (() => {
    const termId = String(header.paymentTerm || '').trim();
    if (!termId) return '';

    const selectedTerm = paymentTermCodes.find((term) => term.termId === termId);
    if (!selectedTerm) return termId;

    return selectedTerm.termName || selectedTerm.shortName || selectedTerm.termId || '';
  })();

  const customerDisplay = (() => {
    const customerId = String(header.customer || '').trim();
    if (!customerId) return '';

    const selectedCustomer = customerCodes.find((customer) => customer.customerId === customerId);
    if (!selectedCustomer) return customerId;

    return selectedCustomer.customerName || selectedCustomer.shortName || selectedCustomer.customerId || customerId;
  })();

  const destinationDisplay = (() => {
    const destinationId = String(header.destination || '').trim();
    if (!destinationId) return '';

    const selectedDestination = destinationCodes.find((destination) => destination.destId === destinationId);
    if (!selectedDestination) return destinationId;

    return selectedDestination.destination || selectedDestination.location || selectedDestination.destId || destinationId;
  })();

  const handleItemChange = (index, field, value) => {
    if (isViewMode) return;
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

  const handleProductSelect = (product: any) => {
    if (isViewMode || selectedItemIndex === null) return;

    setItems((prev) => {
      const next = [...prev];
      next[selectedItemIndex] = {
        ...next[selectedItemIndex],
        id: product.productId,
        product: product.productName || '',
      };
      return next;
    });
  };

  const addItemRow = () => {
    if (isViewMode) return;
    setItems((prev) => [
      ...prev,
      { id: '', product: '', packing: '', quantity: '', price: '', total: '' },
    ]);
  };

  const removeItemRow = (index) => {
    if (isViewMode) return;
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
        <div className="print-monitor-doc max-w-5xl mx-auto px-6 py-10">
          <div className={`${isViewMode ? 'block' : 'hidden print:block'} monitor-print-sheet border border-black bg-white p-4 text-[12px] leading-tight text-black`}>
            <div className="flex items-start gap-4 border-b-2 border-red-700 pb-3">
              <div className="h-16 w-16 border border-black bg-gray-100 flex items-center justify-center text-lg font-bold">CT</div>
              <div className="flex-1 text-center">
                <div className="text-3xl font-bold tracking-wide">CHAYA TENANG SDN.BHD.</div>
                <div className="text-[11px] mt-1">(56951-U)</div>
                <div className="text-[11px] mt-1">No.33, Jalan Mutiara Emas 7/6 Taman Mount Austin 81100 Johor Bahru, Johor Malaysia</div>
                <div className="text-[11px]">Mobile : 012-7849148   Email : chayatenang@yahoo.com</div>
              </div>
            </div>

            <div className="mt-3 bg-gray-500 text-white text-center font-semibold text-[22px] py-1">
              Individual Customer Monitoring
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-[12px]">
              <div className="space-y-2">
                <div className="flex items-center gap-2"><span className="font-semibold w-24">Monitor ID :</span><span className="border border-black px-3 py-1 min-w-[120px] text-center font-semibold">{header.monitorId || '-'}</span></div>
                <div><span className="font-semibold">Customer :</span> {customerDisplay || '-'}</div>
                <div><span className="font-semibold">Po No :</span> {header.poNo || '-'}</div>
                <div><span className="font-semibold">Destination :</span> {destinationDisplay || '-'}</div>
                <div><span className="font-semibold">Delivered to :</span> {header.deliveredTo || '-'}</div>
                <div><span className="font-semibold">Payment Term :</span> {paymentTermDisplay || '-'}</div>
              </div>
              <div className="space-y-2">
                <div><span className="font-semibold">Issued Date :</span> {formatPrintDate(header.issuedDate)}</div>
                <div className="h-6" />
                <div><span className="font-semibold">Po Date :</span> {formatPrintDate(header.poDate)}</div>
                <div><span className="font-semibold">Request Date :</span> {formatPrintDate(header.requestDate)}</div>
              </div>
            </div>

            <table className="w-full mt-4 border border-black border-collapse text-[12px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black px-2 py-1 w-10">Item</th>
                  <th className="border border-black px-2 py-1 w-16">ID</th>
                  <th className="border border-black px-2 py-1">Product</th>
                  <th className="border border-black px-2 py-1 w-28">Quantity</th>
                  <th className="border border-black px-2 py-1 w-24">Price</th>
                  <th className="border border-black px-2 py-1 w-24">Total</th>
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
                      <td className="border border-black px-2 py-1">
                        <div>{item.product || '-'}</div>
                        {item.packing && <div><span className="font-semibold">Packing :</span> {item.packing}</div>}
                      </td>
                      <td className="border border-black px-2 py-1 text-right">{Number(item.quantity || 0).toFixed(3)}</td>
                      <td className="border border-black px-2 py-1 text-right">{Number(item.price || 0).toFixed(2)}</td>
                      <td className="border border-black px-2 py-1 text-right">{Number(item.total || 0).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="mt-4 grid grid-cols-2 gap-6">
              <div>
                <div className="font-semibold">Instruction : ARRANGE DELIVERY</div>
                <div className="font-semibold mt-2">Remark :</div>
              </div>
              <div className="space-y-1 text-[13px]">
                <div className="flex justify-between"><span className="font-semibold">Total Quantity (MT) :</span><span className="font-semibold">{totalQuantity.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="font-semibold">Total Sales :</span><span className="font-semibold">{totalSales.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="font-semibold">Add GST @ 0% :</span><span className="font-semibold">0.00</span></div>
                <div className="flex justify-between"><span className="font-semibold">Total Amount Due :</span><span className="font-semibold">{totalSales.toFixed(2)}</span></div>
                <div className="pt-8 text-center border-t border-black mt-8">Approval Sign by Authorized Person</div>
              </div>
            </div>

            <table className="w-full mt-6 border border-black border-collapse text-[12px]">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1 text-center" colSpan={6}>Balance Outstanding By Due</th>
                </tr>
                <tr className="bg-gray-100">
                  <th className="border border-black px-2 py-1">Current</th>
                  <th className="border border-black px-2 py-1">1-30 Days<br />Past Due</th>
                  <th className="border border-black px-2 py-1">31-60 Days<br />Past Due</th>
                  <th className="border border-black px-2 py-1">61-90 Days<br />Past Due</th>
                  <th className="border border-black px-2 py-1">Over 90 Days<br />Past Due</th>
                  <th className="border border-black px-2 py-1">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black px-2 py-1 text-right">0.00</td>
                  <td className="border border-black px-2 py-1 text-right">0.00</td>
                  <td className="border border-black px-2 py-1 text-right">0.00</td>
                  <td className="border border-black px-2 py-1 text-right">0.00</td>
                  <td className="border border-black px-2 py-1 text-right">0.00</td>
                  <td className="border border-black px-2 py-1 text-right">0.00</td>
                </tr>
              </tbody>
            </table>

            <table className="w-full mt-3 border border-black border-collapse text-[11px]">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1 text-center" colSpan={12}>Monthly Outstanding</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <td key={`month-${idx}`} className="border border-black px-1 py-1 text-right">0.00</td>
                  ))}
                </tr>
              </tbody>
            </table>
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
              Individual Customer Monitoring
            </div>

            <div className="px-6 py-6 space-y-4 text-xs">
              {codeError && (
                <div className={`rounded-lg border px-4 py-3 text-xs ${darkMode ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  {codeError}
                </div>
              )}

              <fieldset disabled={isViewMode} className={isViewMode ? 'hidden' : ''}>
              {/* Top row: Monitor ID / Issued Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Monitor ID :</span>
                  <input
                    className={`flex-1 border px-2 py-1 text-xs bg-yellow-300 ${formControlClass}`}
                    value={header.monitorId}
                    onChange={(e) => handleHeaderChange('monitorId', e.target.value)}
                  />
                  {!isViewMode && (
                    <button
                      type="button"
                      onClick={() => void loadNextMonitorId(true)}
                      className="px-3 py-1 text-[11px] rounded border border-blue-500 text-blue-600 hover:bg-blue-50 whitespace-nowrap"
                    >
                      Refresh ID
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Issued Date :</span>
                  <input
                    type="date"
                    className={`border px-2 py-1 text-xs ${formControlClass}`}
                    value={header.issuedDate}
                    onChange={(e) => handleHeaderChange('issuedDate', e.target.value)}
                  />
                </div>
              </div>

              {/* Customer */}
              <div className="flex items-center gap-2">
                <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Customer :</span>
                <select
                  className={`flex-1 border px-2 py-1 text-xs ${formControlClass}`}
                  value={header.customer}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                >
                  <option value="">{isLoadingCodes ? 'Loading customers...' : 'Select customer code'}</option>
                  {customerCodes.map((customer) => (
                    <option key={customer.customerId} value={customer.customerId}>
                      {customer.customerId} - {customer.customerName || customer.shortName || 'Unnamed Customer'}
                    </option>
                  ))}
                </select>
              </div>

              {/* PO row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Po No :</span>
                  <input
                    className={`flex-1 border px-2 py-1 text-xs ${formControlClass}`}
                    value={header.poNo}
                    onChange={(e) => handleHeaderChange('poNo', e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Po Date :</span>
                  <input
                    type="date"
                    className={`flex-1 border px-2 py-1 text-xs ${formControlClass}`}
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
                    className={`flex-1 border px-2 py-1 text-xs ${formControlClass}`}
                    value={header.requestDate}
                    onChange={(e) => handleHeaderChange('requestDate', e.target.value)}
                  />
                </div>
              </div>

              {/* Destination */}
              <div className="flex items-center gap-2">
                <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Destination :</span>
                <select
                  className={`flex-1 border px-2 py-1 text-xs ${formControlClass}`}
                  value={header.destination}
                  onChange={(e) => handleHeaderChange('destination', e.target.value)}
                >
                  <option value="">{isLoadingCodes ? 'Loading destinations...' : 'Select destination code'}</option>
                  {destinationCodes.map((destination) => (
                    <option key={destination.destId} value={destination.destId}>
                      {destination.destId} - {destination.destination || destination.location || 'Unnamed Destination'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Delivered to */}
              <div className="flex items-center gap-2">
                <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>Delivered to :</span>
                <input
                  className={`flex-1 border px-2 py-1 text-xs ${formControlClass}`}
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
                  className={`flex-1 border px-2 py-1 text-xs ${formControlClass}`}
                  value={paymentTermDisplay}
                  readOnly
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
                    <div className="space-y-1">
                      <input
                        className={`w-full border px-1 py-0.5 ${formControlClass}`}
                        placeholder="Product"
                        value={item.product}
                        readOnly
                      />
                      <input
                        className={`w-full border px-1 py-0.5 text-[10px] italic ${formControlClass}`}
                        placeholder="Packing"
                        value={item.packing}
                        onChange={(e) => handleItemChange(idx, 'packing', e.target.value)}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        className={`w-full border px-1 py-0.5 text-right ${formControlClass}`}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        className={`w-full border px-1 py-0.5 text-right ${formControlClass}`}
                        value={item.price}
                        onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        className={`w-full border px-1 py-0.5 text-right ${formControlClass}`}
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

              <div className="hidden print:grid grid-cols-3 gap-8 mt-10 text-xs">
                <div className="text-center">
                  <div className="border-t border-black pt-1">Prepared By</div>
                </div>
                <div className="text-center">
                  <div className="border-t border-black pt-1">Checked By</div>
                </div>
                <div className="text-center">
                  <div className="border-t border-black pt-1">Approved By</div>
                </div>
              </div>

              </fieldset>

              {/* Action Buttons */}
              <div className="no-print mt-6 border-t pt-4 flex gap-3 justify-center">
                {!isViewMode && (
                  <button
                    type="button"
                    onClick={async () => {
                      const monitorId = header.monitorId?.trim();

                      if (!monitorId) {
                        alert('Monitor ID is missing. Please wait for auto-generated ID from server.');
                        return;
                      }

                      if (!header.customer?.trim()) {
                        alert('Please fill Customer before saving.');
                        return;
                      }

                      const validItems = items.filter((it) => it.id || it.product);
                      if (validItems.length === 0) {
                        alert('Please add at least 1 item before saving.');
                        return;
                      }

                      const payload = {
                        header: {
                          ...header,
                          paymentTerm: resolvePaymentTermId(header.paymentTerm),
                          monitorId,
                          totalQuantity,
                          totalSales,
                          vat: 0,
                        },
                        items: validItems,
                      };

                      try {
                        await monitorService.save(payload);
                        alert('💾 Monitor document saved successfully!');
                        onNavigate('monitor-home');
                      } catch (error) {
                        alert('Failed to save monitor document');
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
                    onClick={async () => {
                      try {
                        await monitorService.markPrinted(header.monitorId);
                      } catch (_e) { /* silent */ }
                      window.print();
                    }}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    <span>🖨️</span>
                    Print
                  </button>
                )}
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
    </Layout>
  );
}


