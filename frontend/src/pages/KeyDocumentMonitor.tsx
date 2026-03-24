import React, { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout/Layout';
import ProductSelectionModal from '../components/ProductSelectionModal';
import codeService from '../services/codeService';
import monitorService from '../services/monitorService';
import useThemePreference from '../hooks/useThemePreference';
import { printDocumentContent } from '../utils/printDocument';
import { showAppAlert, showAppConfirm } from '../services/dialogService';

const toDateInputValue = (value: any) => {
  if (!value) return '';
  return String(value).slice(0, 10);
};

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

const buildProductName = (product: any) => {
  const marking = String(product?.marking || product?.Marking || '').trim();
  const type = String(product?.type || product?.Type || '').trim();
  const fallback = String(product?.productName || product?.ProductName || product?.productId || '').trim();
  const combined = [marking, type].filter(Boolean).join(' ').trim();
  return combined || fallback;
};

const buildProductPacking = (product: any) => {
  return String(product?.bagSize || product?.BagSize || '').trim();
};

export default function KeyDocumentMonitor({ onNavigate = () => {}, initialData = null, embedded = false, darkMode: embeddedDarkMode, setDarkMode: embeddedSetDarkMode, currentPage = 'key-monitor' }: any) {
  const [preferredDarkMode, setPreferredDarkMode] = useThemePreference();
  const darkMode = embedded ? embeddedDarkMode : preferredDarkMode;
  const setDarkMode = embedded ? embeddedSetDarkMode : setPreferredDarkMode;
  const [mode, setMode] = useState('create');
  const [customerCodes, setCustomerCodes] = useState<any[]>([]);
  const [destinationCodes, setDestinationCodes] = useState<any[]>([]);
  const [endUserCodes, setEndUserCodes] = useState<any[]>([]);
  const [productCodes, setProductCodes] = useState<any[]>([]);
  const [paymentTermCodes, setPaymentTermCodes] = useState<any[]>([]);
  const [isLoadingCodes, setIsLoadingCodes] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const printSheetRef = useRef<HTMLDivElement | null>(null);

  const [header, setHeader] = useState({
    monitorId: '',
    issuedDate: getTodayDateInputValue(),
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

        const [customerResponse, destinationResponse, endUserResponse, productResponse, paymentTermResponse] = await Promise.all([
          codeService.getAll('customer'),
          codeService.getAll('destination'),
          codeService.getAll('end-user'),
          codeService.getAll('product'),
          codeService.getAll('payment-term'),
        ]);

        setCustomerCodes(customerResponse.data.data || []);
        setDestinationCodes(destinationResponse.data.data || []);
        setEndUserCodes(endUserResponse.data.data || []);
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
        issuedDate: getTodayDateInputValue(),
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
  const tableItems = isViewMode ? printItems : items;

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

  const deliveredToDisplay = (() => {
    const endUserId = String(header.deliveredTo || '').trim();
    if (!endUserId) return '';

    const selectedEndUser = endUserCodes.find((endUser) => endUser.eUserId === endUserId);
    if (!selectedEndUser) return endUserId;

    return selectedEndUser.eUserName || selectedEndUser.shortName || selectedEndUser.eUserId || endUserId;
  })();

  const getResolvedItemDisplay = (item: any) => {
    const selectedProduct = productCodes.find((product) => product.productId === item.id);

    if (!selectedProduct) {
      return {
        productName: item.product || '-',
        packing: item.packing || '',
      };
    }

    return {
      productName: buildProductName(selectedProduct) || item.product || selectedProduct.productId || '-',
      packing: item.packing || buildProductPacking(selectedProduct),
    };
  };

  const sheetControlClass = 'min-h-[30px] w-full border border-black bg-white px-2 py-1 text-[12px] text-black';
  const sheetActionButtonClass = 'rounded border border-black px-2 py-1 text-[11px] font-medium text-black transition-colors hover:bg-gray-100';

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
        product: buildProductName(product),
        packing: buildProductPacking(product),
      };
      return next;
    });
  };

  const addItemRow = () => {
    if (isViewMode) return;

    const emptyRowIndex = items.findIndex((item) =>
      !item.id && !item.product && !item.packing && !item.quantity && !item.price && !item.total
    );

    if (emptyRowIndex !== -1) {
      setSelectedItemIndex(emptyRowIndex);
      setProductModalOpen(true);
      return;
    }

    const nextIndex = items.length;
    setItems((prev) => [
      ...prev,
      { id: '', product: '', packing: '', quantity: '', price: '', total: '' },
    ]);
    setSelectedItemIndex(nextIndex);
    setProductModalOpen(true);
  };

  const goBackToDocuments = () => {
    onNavigate('documents', { selectedType: 'monitor' });
  };

  const goBackToDocumentsWithSavedRecord = (savedRecord: any) => {
    onNavigate('documents', {
      selectedType: 'monitor',
      action: 'save',
      savedRecord,
    });
  };

  const removeItemRow = (index) => {
    if (isViewMode) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePrint = async () => {
    try {
      await monitorService.markPrinted(header.monitorId);
    } catch (_error) {
      // Ignore print status update failures and continue printing the document.
    }

    if (!printSheetRef.current) {
      await showAppAlert({ title: 'Print Error', message: 'Print form is not ready yet.', tone: 'danger' });
      return;
    }

    printDocumentContent(`Monitor ${header.monitorId || ''}`, printSheetRef.current.outerHTML, {
      bodyPadding: '0',
      extraCss: `
        @page {
          size: A4 portrait;
          margin: 4mm;
        }

        body {
          padding: 0 !important;
        }

        .monitor-print-sheet {
          width: 100%;
          min-height: 289mm;
          margin: 0;
          padding: 7mm 8mm;
          box-sizing: border-box;
          border: 1px solid #000;
        }

        .monitor-print-sheet table {
          width: 100%;
        }
      `,
    });
  };

  const content = (
      <div className={embedded ? '' : `min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className={`print-monitor-doc ${embedded ? 'px-0 py-0' : 'max-w-5xl mx-auto px-6 py-10'}`}>
          <div ref={printSheetRef} className="monitor-print-sheet flex min-h-full flex-col border border-black bg-white p-4 text-[12px] leading-tight text-black shadow-sm">
            <div>
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
                  <div className="flex items-center gap-2">
                    <span className="w-24 font-semibold">Monitor ID :</span>
                    {isViewMode ? (
                      <span className="min-w-[120px] border border-black px-3 py-1 text-center font-semibold">{header.monitorId || '-'}</span>
                    ) : (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          className={`${sheetControlClass} bg-yellow-200 font-semibold`}
                          value={header.monitorId}
                          onChange={(e) => handleHeaderChange('monitorId', e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => void loadNextMonitorId(true)}
                          className={`${sheetActionButtonClass} no-print whitespace-nowrap`}
                        >
                          Refresh ID
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-[96px,1fr] items-center gap-2">
                    <span className="font-semibold">Customer :</span>
                    {isViewMode ? (
                      <span>{customerDisplay || '-'}</span>
                    ) : (
                      <select
                        className={sheetControlClass}
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
                    )}
                  </div>
                  <div className="grid grid-cols-[96px,1fr] items-center gap-2">
                    <span className="font-semibold">Po No :</span>
                    {isViewMode ? (
                      <span>{header.poNo || '-'}</span>
                    ) : (
                      <input
                        className={sheetControlClass}
                        value={header.poNo}
                        onChange={(e) => handleHeaderChange('poNo', e.target.value)}
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-[96px,1fr] items-center gap-2">
                    <span className="font-semibold">Destination :</span>
                    {isViewMode ? (
                      <span>{destinationDisplay || '-'}</span>
                    ) : (
                      <select
                        className={sheetControlClass}
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
                    )}
                  </div>
                  <div className="grid grid-cols-[96px,1fr] items-center gap-2">
                    <span className="font-semibold">Delivered to :</span>
                    {isViewMode ? (
                      <span>{deliveredToDisplay || '-'}</span>
                    ) : (
                      <select
                        className={sheetControlClass}
                        value={header.deliveredTo}
                        onChange={(e) => handleHeaderChange('deliveredTo', e.target.value)}
                      >
                        <option value="">{isLoadingCodes ? 'Loading delivered to...' : 'Select delivered to code'}</option>
                        {endUserCodes.map((endUser) => (
                          <option key={endUser.eUserId} value={endUser.eUserId}>
                            {endUser.eUserId} - {endUser.eUserName || endUser.shortName || 'Unnamed End User'}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="grid grid-cols-[96px,1fr] items-center gap-2">
                    <span className="font-semibold">Payment Term :</span>
                    {isViewMode ? (
                      <span>{paymentTermDisplay || '-'}</span>
                    ) : (
                      <input className={sheetControlClass} value={paymentTermDisplay} readOnly />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-[96px,1fr] items-center gap-2">
                    <span className="font-semibold">Issued Date :</span>
                    {isViewMode ? (
                      <span>{formatPrintDate(header.issuedDate)}</span>
                    ) : (
                      <input
                        type="date"
                        className={sheetControlClass}
                        value={header.issuedDate}
                        onChange={(e) => handleHeaderChange('issuedDate', e.target.value)}
                      />
                    )}
                  </div>
                  <div className="h-6" />
                  <div className="grid grid-cols-[96px,1fr] items-center gap-2">
                    <span className="font-semibold">Po Date :</span>
                    {isViewMode ? (
                      <span>{formatPrintDate(header.poDate)}</span>
                    ) : (
                      <input
                        type="date"
                        className={sheetControlClass}
                        value={header.poDate}
                        onChange={(e) => handleHeaderChange('poDate', e.target.value)}
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-[96px,1fr] items-center gap-2">
                    <span className="font-semibold">Request Date :</span>
                    {isViewMode ? (
                      <span>{formatPrintDate(header.requestDate)}</span>
                    ) : (
                      <input
                        type="date"
                        className={sheetControlClass}
                        value={header.requestDate}
                        onChange={(e) => handleHeaderChange('requestDate', e.target.value)}
                      />
                    )}
                  </div>
                </div>
              </div>
              <hr className="my-4 border-t border-dashed border-black" />
              <table className="w-full mt-4 text-[12px]">
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
                  {tableItems.length === 0 ? (
                    <tr>
                      <td className=" px-2 py-2 text-center" colSpan={6}>-</td>
                    </tr>
                  ) : (
                    tableItems.map((item, idx) => {
                      const resolvedItem = getResolvedItemDisplay(item);

                      return (
                      <tr key={`print-${idx}`}>
                        <td className=" px-2 py-1 text-center align-top">{idx + 1}</td>
                        <td className=" px-2 py-1 text-center align-top">
                          {isViewMode ? (
                            item.id || '-'
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItemIndex(idx);
                                setProductModalOpen(true);
                              }}
                              className="no-print w-full rounded border border-black px-1 py-1 text-left text-[11px]"
                            >
                              {item.id || 'Select...'}
                            </button>
                          )}
                        </td>
                        <td className=" px-2 py-1 align-top">
                          {isViewMode ? (
                            <>
                              <div>{resolvedItem.productName || '-'}</div>
                              {resolvedItem.packing && <div><span className="font-semibold">Packing :</span> {resolvedItem.packing}</div>}
                            </>
                          ) : (
                            <div className="space-y-2">
                              <input className={sheetControlClass} value={resolvedItem.productName} readOnly />
                              <input
                                className={sheetControlClass}
                                placeholder="Packing"
                                value={resolvedItem.packing}
                                onChange={(e) => handleItemChange(idx, 'packing', e.target.value)}
                              />
                            </div>
                          )}
                        </td>
                        <td className=" px-2 py-1 text-right align-top">
                          {isViewMode ? (
                            Number(item.quantity || 0).toFixed(3)
                          ) : (
                            <input
                              type="number"
                              className={`${sheetControlClass} text-right`}
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            />
                          )}
                        </td>
                        <td className=" px-2 py-1 text-right align-top">
                          {isViewMode ? (
                            Number(item.price || 0).toFixed(2)
                          ) : (
                            <input
                              type="number"
                              step="0.01"
                              className={`${sheetControlClass} text-right`}
                              value={item.price}
                              onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                            />
                          )}
                        </td>
                        <td className=" px-2 py-1 text-right align-top">
                          {isViewMode ? (
                            Number(item.total || 0).toFixed(2)
                          ) : (
                            <div className="space-y-2">
                              <input
                                type="number"
                                step="0.01"
                                className={`${sheetControlClass} text-right`}
                                value={item.total}
                                onChange={(e) => handleItemChange(idx, 'total', e.target.value)}
                              />
                              {items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeItemRow(idx)}
                                  className="no-print w-full rounded border border-red-600 px-1 py-1 text-[11px] text-red-600"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        </tr>
                      )})
                  )}
                </tbody>
              </table>
              <hr className="my-4 border-t border-dashed border-black" />

              {!isViewMode && (
                <div className="no-print mt-3 flex justify-between">
                  <button
                    type="button"
                    onClick={addItemRow}
                    className={sheetActionButtonClass}
                  >
                    + Add Item
                  </button>
                </div>
              )}

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
            </div>

            <div className="mt-auto pt-6">
              <table className="w-full border border-black border-collapse text-[12px]">
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
          </div>
          {codeError && (
            <div className="no-print mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {codeError}
            </div>
          )}

          <div className="no-print mt-6 flex gap-3 justify-end">
            {!isViewMode && (
              <button
                type="button"
                onClick={async () => {
                  const monitorId = header.monitorId?.trim();

                  if (!monitorId) {
                    await showAppAlert({ title: 'Missing Monitor ID', message: 'Monitor ID is missing. Please wait for auto-generated ID from server.', tone: 'warning' });
                    return;
                  }

                  if (!header.customer?.trim()) {
                    await showAppAlert({ title: 'Validation', message: 'Please fill Customer before saving.', tone: 'warning' });
                    return;
                  }

                  const validItems = items.filter((it) => it.id || it.product);
                  if (validItems.length === 0) {
                    await showAppAlert({ title: 'Validation', message: 'Please add at least 1 item before saving.', tone: 'warning' });
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
                    const response = await monitorService.save(payload);
                    await showAppAlert({ title: 'Saved', message: 'Monitor document saved successfully.', tone: 'success' });
                    goBackToDocumentsWithSavedRecord(response?.data?.data || payload.header);
                  } catch (_error) {
                    await showAppAlert({ title: 'Save Failed', message: 'Failed to save monitor document.', tone: 'danger' });
                  }
                }}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 font-medium text-white transition-colors hover:bg-green-700"
              >
                <span>💾</span>
                Save
              </button>
            )}
            {isViewMode && (
              <button
                type="button"
                onClick={() => void handlePrint()}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
              >
                <span>🖨️</span>
                Print
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
              className="flex items-center gap-2 rounded-lg bg-gray-600 px-6 py-2 font-medium text-white transition-colors hover:bg-gray-700"
            >
              <span>❌</span>
              Cancel
            </button>
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


