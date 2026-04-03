import React, { useEffect, useMemo, useState } from 'react';
import ProductSelectionModal from '../ProductSelectionModal';
import documentService, { MainDocumentType } from '../../services/documentService';
import codeService from '../../services/codeService';
import { printDocumentContent } from '../../utils/printDocument';
import { showAppAlert, showAppConfirm } from '../../services/dialogService';

const getTodayDateInputValue = () => new Date().toISOString().slice(0, 10);

const DOCUMENT_TYPE_LABELS: Record<MainDocumentType, string> = {
  quotation: 'Quotation',
  invoice: 'Invoice',
  receipt: 'Receipt',
  purchase_order: 'Purchase Order',
  work_order: 'Work Order',
};

const DOCUMENT_DEFAULT_STATUS: Record<MainDocumentType, string> = {
  quotation: 'Draft',
  invoice: 'Pending',
  receipt: 'Received',
  purchase_order: 'Open',
  work_order: 'Open',
};

const DOCUMENT_NUMBER_PREFIX: Record<MainDocumentType, string> = {
  quotation: 'QT',
  invoice: 'INV',
  receipt: 'RC',
  purchase_order: 'PO',
  work_order: 'WO',
};

const QUOTATION_MARGIN_PRESETS = ['5%', '10%', '15%', '20%', '25%', '30%', '35%', '40%', '50%'];
const QUOTATION_STATUS_OPTIONS = [
  'Draft',
  'Sent',
  'Waiting Customer',
  'Follow Up',
  'Negotiating',
  'Approved',
  'Won',
  'Rejected',
  'Lost',
  'Expired',
  'Converted'
];

const escapeHtml = (value: any) => String(value ?? '')
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;')
.replace(/'/g, '&#39;');

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

const buildDefaultDocumentNumber = (documentType: MainDocumentType) =>
  `${DOCUMENT_NUMBER_PREFIX[documentType]}-${String(new Date().getFullYear()).slice(-2)}-000001`;

const createEmptyItem = () => (
  {
    id: '',
    productCode: '',
    productName: '',
    category: '',
    brand: '',
    model: '',
    price: '',
    cost: '',
    quantity: '',    
    margin: '',
    sellingPrice: '',
    totalCost: '',
    totalSellingPrice: '',
    unitID: '',
  }
);

const parseNumberInput = (value: any) => {
  if (value === '' || value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sanitizeDecimalInput = (value: string) => value.replace(/[^0-9.]/g, '');

const calculateQuotationSalePrice = (costPrce: any, marginPercent: any) => {
  const cost = parseNumberInput(costPrce);
  const margin = parseNumberInput(marginPercent);
  let salePrice = 0;
  if (margin === 0 || margin === 100) {
    salePrice = cost;
  } else {
    salePrice = cost / (1 - (margin / 100));
  }
  if (!cost || salePrice <= 0) {
    return '';
  }
  return (salePrice).toFixed(2);
};

const calculateLineTotal = (quantity: any, unitPrice: any) => {
  const qty = parseNumberInput(quantity);
  const price = parseNumberInput(unitPrice);
  return qty && price ? (qty * price).toFixed(2) : '';
};

const getEmptyHeader = (documentType: MainDocumentType) => ({
  id: '',
  documentNumber: '',
  title: DOCUMENT_TYPE_LABELS[documentType],
  documentDate: getTodayDateInputValue(),
  customer: '',
  billTo: '',
  shipTo: '',
  destination: '',
  paymentTerm: '',
  paymentMethod: documentType === 'invoice' ? 'Bank Transfer' : '',
  referenceNo: '',
  status: DOCUMENT_DEFAULT_STATUS[documentType],
  remark: '',
  totalCost: '0',
  totalSellingPrice: '0',
  totalProfit: '0',
  margin: '0',
  taxRate: '7',
  taxAmount: '0',
  totalAmount: '0',
  totalQuantity: '0',
  dueDate: '',
  linkedQuotationId: '',
  linkedQuotationNumber: '',
  linkedInvoiceId: '',
  linkedInvoiceNumber: '',
  receivedDate: '',
  supplierId: '',
  deliveryDate: '',
});

const getSubtypeFields = (documentType: MainDocumentType) => {
  if (documentType === 'quotation') {
    return [
      { key: 'margin', label: 'Margin (%)', type: 'number' },
    ];
  }

  if (documentType === 'invoice') {
    return [
      { key: 'dueDate', label: 'Due Date', type: 'date' },
      { key: 'doNo', label: 'DO No', type: 'text' },
    ];
  }

  if (documentType === 'receipt') {
    return [
      { key: 'receivedDate', label: 'Received Date', type: 'date' },
      { key: 'paymentReference', label: 'Payment Reference', type: 'text' },
    ];
  }

  if (documentType === 'purchase_order') {
    return [
      { key: 'supplierName', label: 'Supplier Name', type: 'text' },
      { key: 'deliveryDate', label: 'Delivery Date', type: 'date' },
    ];
  }

  return [
    { key: 'scheduledDate', label: 'Scheduled Date', type: 'date' },
    { key: 'assignedTo', label: 'Assigned To', type: 'text' },
  ];
};

export default function AllDocumentForm({
  darkMode,
  onNavigate = () => { },
  initialData = null,
  documentType,
  suggestedDocumentNumber,
}: {
  darkMode: boolean;
  onNavigate?: (page: string, state?: unknown) => void;
  initialData?: any;
  documentType: MainDocumentType;
  suggestedDocumentNumber?: string;
}) {
  const [mode, setMode] = useState('create');
  const [header, setHeader] = useState(getEmptyHeader(documentType));
  const [items, setItems] = useState([createEmptyItem()]);
  const [customerCodes, setCustomerCodes] = useState<any[]>([]);
  const [destinationCodes, setDestinationCodes] = useState<any[]>([]);
  const [paymentTermCodes, setPaymentTermCodes] = useState<any[]>([]);
  const [productCodes, setProductCodes] = useState<any[]>([]);
  const [isLoadingCodes, setIsLoadingCodes] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadCodeOptions = async () => {
      setIsLoadingCodes(true);
      try {
        const [customerResponse, destinationResponse, paymentTermResponse, productResponse] = await Promise.all([
          codeService.getAll('customer'),
          codeService.getAll('destination'),
          codeService.getAll('payment-term'),
          codeService.getAll('product'),
        ]);
        setCustomerCodes(customerResponse.data.data || []);
        setDestinationCodes(destinationResponse.data.data || []);
        setPaymentTermCodes(paymentTermResponse.data.data || []);
        setProductCodes(productResponse.data.data || []);
        setCodeError(null);

        console.log('Product codes xxx:', productResponse.data.data);

      } catch (_error) {
        setCodeError('Failed to load code lists');
      } finally {
        setIsLoadingCodes(false);
      }
    };

    void loadCodeOptions();
  }, []);

  useEffect(() => {
    if (!initialData) {
      setMode('create');
      setHeader({
        ...getEmptyHeader(documentType),
        documentNumber: suggestedDocumentNumber || buildDefaultDocumentNumber(documentType),
      });
      setItems([createEmptyItem()]);
      return;
    }

    setMode(initialData.__mode || 'edit');
    setHeader({
      ...getEmptyHeader(documentType),
      id: initialData.id || '',
      documentNumber: initialData.documentNumber || '',
      title: initialData.title || DOCUMENT_TYPE_LABELS[documentType],
      documentDate: initialData.documentDate ? String(initialData.documentDate).slice(0, 10) : getTodayDateInputValue(),
      customer: initialData.customer || '',
      billTo: initialData.billTo || '',
      shipTo: initialData.shipTo || '',
      destination: initialData.destination || '',
      paymentTerm: initialData.paymentTerm || '',
      paymentMethod: initialData.paymentMethod || '',
      referenceNo: initialData.referenceNo || '',
      status: initialData.status || DOCUMENT_DEFAULT_STATUS[documentType],
      remark: initialData.remark || '',
      margin: String(getEmptyHeader(documentType).margin) || '',
      taxRate: String(initialData.taxRate ?? getEmptyHeader(documentType).taxRate),
      dueDate: initialData.dueDate ? String(initialData.dueDate).slice(0, 10) : '',
      linkedQuotationId: initialData.linkedQuotationId || '',
      linkedQuotationNumber: initialData.linkedQuotationNumber || '',
      linkedInvoiceId: initialData.linkedInvoiceId || '',
      linkedInvoiceNumber: initialData.linkedInvoiceNumber || '',
      receivedDate: initialData.receivedDate ? String(initialData.receivedDate).slice(0, 10) : '',
      supplierId: initialData.supplierName || '',
      deliveryDate: initialData.deliveryDate ? String(initialData.deliveryDate).slice(0, 10) : '',
    });

    if (Array.isArray(initialData.items) && initialData.items.length > 0) {
      setItems(initialData.items.map((item: any) => ({
        id: item.id || '',
        productCode: item.productCode || '',
        productName: item.productName || '',
        quantity: item.quantity || '',
        margin: item.margin || '',
        cost: item.cost || '',
        sellingPrice: item.sellingPrice || '',
        totalCost: item.totalCost || '',
        totalSellingPrice: item.totalSellingPrice || '',
        unitID: item.unitID || '',
      })));
    } else {
      setItems([createEmptyItem()]);
    }
  }, [documentType, initialData, suggestedDocumentNumber]);

  const isViewMode = mode === 'view';
  const typeLabel = DOCUMENT_TYPE_LABELS[documentType];
  const subtypeFields = useMemo(() => getSubtypeFields(documentType), [documentType]);
  const taxRate = Number(header.taxRate || 0);
  const totalCost = items.reduce((sum, item) => sum + (parseFloat(item.totalCost) || 0), 0);
  const totalSellingPrice = items.reduce((sum, item) => sum + (parseFloat(item.totalSellingPrice) || 0), 0);
  const tax = totalSellingPrice * (taxRate / 100);
  const total = totalSellingPrice + tax;
  const totalQuantity = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
  const printItems = items.filter((item) => item.id || item.productName || item.quantity || item.cost || item.totalCost);

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

  const paymentTermDisplay = (() => {
    const paymentTermId = String(header.paymentTerm || '').trim();
    if (!paymentTermId) return '';
    const selectedPaymentTerm = paymentTermCodes.find((paymentTerm) => paymentTerm.termId === paymentTermId);
    if (!selectedPaymentTerm) return paymentTermId;
    return selectedPaymentTerm.termName || selectedPaymentTerm.shortName || selectedPaymentTerm.termId || paymentTermId;
  })();

  const handleHeaderChange = (field: string, value: string) => {
    if (isViewMode) return;
    setHeader((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    if (isViewMode) return;
    setItems((prev) => {
      const next = [...prev];
      const updated = { ...next[index], [field]: value };
      if (documentType === 'quotation') {
        if (field === 'cost' || field === 'quantity' || field === 'margin') {
          updated.sellingPrice = calculateQuotationSalePrice(updated.cost, updated.margin);
          updated.totalCost = calculateLineTotal(updated.quantity, updated.cost);
          updated.totalSellingPrice = calculateLineTotal(updated.quantity, updated.sellingPrice);
        }
      } else if (field === 'quantity' || field === 'sellingPrice') {
        updated.totalCost = calculateLineTotal(updated.quantity, updated.cost);
        updated.totalSellingPrice = calculateLineTotal(updated.quantity, updated.sellingPrice);
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
        id: product.id,
        productCode: product.productCode || '',
        productName: product.productName || '',
        margin: header.margin,
        cost: product.cost == null ? '' : Number(product.cost).toFixed(2),
        sellingPrice: documentType === 'quotation'
          ? calculateQuotationSalePrice(product.cost == null ? '' : Number(product.cost).toFixed(2), header.margin)
          : next[selectedItemIndex].sellingPrice,
      };
      if (documentType === 'quotation') {
        next[selectedItemIndex].totalSellingPrice = calculateLineTotal(next[selectedItemIndex].quantity, next[selectedItemIndex].sellingPrice);
      }
      return next;
    });
  };

  const addItemRow = () => {
    if (isViewMode) return;
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  const removeItemRow = (index: number) => {
    if (isViewMode) return;
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const goBackToDocuments = () => {
    onNavigate('documents', { selectedType: documentType });
  };

  const buildPrintDocumentHtml = () => `
    <div class="document-print-page">
      <div class="document-print-header">
        <div class="logo-box">DK</div>
        <div class="company-block">
          <div class="company-title">Doc Key</div>
          <div class="company-text">${escapeHtml(typeLabel)} Document</div>
          <div class="company-text">Generated from the unified Document model</div>
        </div>
      </div>
      <div class="document-title">${escapeHtml(typeLabel)}</div>
      <table class="meta-table">
        <tbody>
          <tr><td class="label-cell">Document No :</td><td class="value-cell emphasis">${escapeHtml(header.documentNumber || '-')}</td><td class="label-cell">Document Date :</td><td class="value-cell">${escapeHtml(formatPrintDate(header.documentDate))}</td></tr>
          <tr><td class="label-cell">Customer :</td><td class="value-cell">${escapeHtml(customerDisplay || '-')}</td><td class="label-cell">Status :</td><td class="value-cell">${escapeHtml(header.status || '-')}</td></tr>
          <tr><td class="label-cell">Bill To :</td><td class="value-cell">${escapeHtml(header.billTo || customerDisplay || '-')}</td><td class="label-cell">Ship To :</td><td class="value-cell">${escapeHtml(shipToDisplay || '-')}</td></tr>
          <tr><td class="label-cell">Reference No :</td><td class="value-cell">${escapeHtml(header.referenceNo || '-')}</td><td class="label-cell">Payment :</td><td class="value-cell">${escapeHtml(paymentTermDisplay || header.paymentMethod || '-')}</td></tr>
        </tbody>
      </table>
      <table class="line-table">
        <thead>
          <tr>
            <th class="col-item">Item</th>
            <th class="col-id">Code</th>
            <th>Description</th>
            <th class="col-qty">Quantity</th>
            <th class="col-margin">Margin</th>
            <th class="col-price">Cost</th>
            <th class="col-total">Total cost</th>
            <th class="col-price">Selling price</th>
            <th class="col-total">Total selling price</th>
            <th class="col-unit">Unit</th>
          </tr>
        </thead>
        <tbody>
          ${printItems.length === 0 ? '<tr><td colspan="6" class="col-center">-</td></tr>' : printItems.map((item, index) => `
            <tr>
              <td class="col-center">${index + 1}</td>
              <td class="col-center">${escapeHtml(item.id || '-')}</td>
              <td>${escapeHtml(item.productName || '-')}</td>
              <td class="col-right">${Number(item.quantity || 0).toFixed(3)}</td>
              <td class="col-right">${Number(item.margin || 0).toFixed(2)}</td>
              <td class="col-right">${Number(item.cost || 0).toFixed(2)}</td>
              <td class="col-right">${Number(item.sellingPrice || 0).toFixed(2)}</td>
              <td class="col-right">${Number(item.totalCost || 0).toFixed(2)}</td>
              <td class="col-right">${Number(item.totalSellingPrice || 0).toFixed(2)}</td>
              <td class="col-center">${item.unitID || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="summary-grid">
        <div><div class="summary-label">Remark :</div><div class="remark-box">${escapeHtml(header.remark || '-')}</div></div>
        <div class="totals-block">
          <div class="summary-row"><span>Total Quantity :</span><span>${totalQuantity.toFixed(2)}</span></div>
          <div class="summary-row"><span>Subtotal :</span><span>${totalCost.toFixed(2)}</span></div>
          <div class="summary-row"><span>Tax (${taxRate.toFixed(2)}%) :</span><span>${tax.toFixed(2)}</span></div>
          <div class="summary-row"><span>Total Amount :</span><span>${total.toFixed(2)}</span></div>
        </div>
      </div>
    </div>
  `;

  const handlePrint = async () => {
    await printDocumentContent('', buildPrintDocumentHtml(), {
      fileName: `${typeLabel}-${header.documentNumber || 'document'}`,
      bodyPadding: '0',
      extraCss: `
        @page { size: A4 portrait; margin: 4mm; }
        body { padding: 0 !important; }
        .document-print-page { width: 100%; min-height: 289mm; margin: 0; padding: 7mm 8mm; box-sizing: border-box; border: 1px solid #000; color: #000; font-family: Arial, sans-serif; font-size: 12px; }
        .document-print-header { display: table; width: 100%; border-bottom: 2px solid #1f2937; padding-bottom: 10px; }
        .logo-box, .company-block { display: table-cell; vertical-align: top; }
        .logo-box { width: 64px; height: 64px; border: 1px solid #000; text-align: center; font-size: 20px; font-weight: 700; line-height: 62px; background: #f3f4f6; }
        .company-block { padding-left: 16px; }
        .company-title { font-size: 28px; font-weight: 700; letter-spacing: 0.02em; }
        .company-text { margin-top: 4px; font-size: 11px; }
        .document-title { margin-top: 12px; padding: 6px 0; background: #6b7280; color: #fff; text-align: center; font-size: 22px; font-weight: 700; }
        .meta-table, .line-table { width: 100%; border-collapse: collapse; }
        .meta-table { margin-top: 14px; }
        .meta-table td { padding: 4px 6px; vertical-align: top; }
        .label-cell { width: 110px; font-weight: 700; white-space: nowrap; }
        .value-cell { border-bottom: 1px solid #000; }
        .value-cell.emphasis { text-align: center; font-weight: 700; }
        .line-table { margin-top: 14px; }
        .line-table th, .line-table td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
        .line-table thead th { background: #f3f4f6; text-align: center; font-weight: 700; }
        .col-item { width: 42px; } .col-id { width: 72px; } .col-qty { width: 90px; } .col-price, .col-total { width: 92px; }
        .col-center { text-align: center; } .col-right { text-align: right; }
        .summary-grid { display: table; width: 100%; margin-top: 18px; }
        .summary-grid > div { display: table-cell; width: 50%; vertical-align: top; }
        .summary-label { margin-bottom: 8px; font-weight: 700; }
        .remark-box { min-height: 70px; border: 1px solid #000; padding: 8px; }
        .totals-block { padding-left: 20px; font-size: 13px; }
        .summary-row { display: table; width: 100%; margin-bottom: 4px; font-weight: 700; }
        .summary-row span { display: table-cell; } .summary-row span:last-child { text-align: right; }
      `,
    });
  };

  const handleSave = async () => {
    if (!header.title?.trim()) {
      await showAppAlert({ title: 'Validation', message: 'Please fill document title before saving.', tone: 'warning' });
      return;
    }

    const validItems = items.filter((item) => item.id || item.productCode || item.productName);

    console.log('validItems', validItems);
    
    if (validItems.length === 0) {
      await showAppAlert({ title: 'Validation', message: 'Please add at least 1 item before saving.', tone: 'warning' });
      return;
    }

    const payload = {
      header: {
        ...header,
        id: header.id || '',
        documentNumber: header.documentNumber || '',
        title: header.title || typeLabel,
        total,
        tax,
        totalQuantity,
        margin: documentType === 'quotation' ? parseNumberInput(header.margin).toFixed(2) : header.margin,
        taxRate,
      },
      items: validItems,
    };

    try {
      const response = await documentService.save(documentType, payload);
      const savedRecord = response?.data?.data || payload.header;
      await showAppAlert({ title: 'Saved', message: `${typeLabel} saved successfully.`, tone: 'success' });
      setHeader((prev) => ({
        ...prev,
        documentId: savedRecord.documentId || savedRecord.id,
        documentNumber: savedRecord.documentNumber || prev.documentNumber,
        title: savedRecord.title || prev.title,
      }));
      onNavigate('documents', { selectedType: documentType, action: 'save', savedRecord });
    } catch (error: any) {
      await showAppAlert({ title: 'Save Failed', message: error?.response?.data?.message || `Failed to save ${typeLabel.toLowerCase()}.`, tone: 'danger' });
    }
  };

  return (
    <>
      <div className={`rounded-2xl border shadow-sm ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className={`rounded-t-2xl border-b px-6 py-4 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>All Document Form</p>
              <h3 className={`mt-1 text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{typeLabel} Details</h3>
              <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>จัดการข้อมูลเอกสารรวมโดยแยกประเภทด้วย DocumentType</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isViewMode ? (darkMode ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-100 text-blue-700') : (darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-700')}`}>
              {isViewMode ? 'View Mode' : mode === 'edit' ? 'Edit Mode' : 'Create Mode'}
            </span>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          {codeError ? <div className={`rounded-xl border px-4 py-3 text-sm ${darkMode ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>{codeError}</div> : null}

          <fieldset disabled={isViewMode} className={isViewMode ? 'opacity-95' : ''}>
            {documentType === 'quotation' ? (
              <div className={`rounded-2xl border px-4 py-4 ${darkMode ? 'border-blue-500/30 bg-blue-500/10' : 'border-blue-200 bg-blue-50'}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Quotation Workflow</p>
                    <p className={`mt-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>เลือกสถานะเพื่อระบุว่าใบเสนอราคาอยู่ในขั้นตอนไหนของงานขาย</p>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-white/10 text-white' : 'bg-white text-blue-700 border border-blue-200'}`}>
                    Current Status: {header.status || 'Draft'}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Document No
                  </span>
                  <input readOnly
                    className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                    value={header.documentNumber || suggestedDocumentNumber || buildDefaultDocumentNumber(documentType)} />
                </label>
                <label className="space-y-2">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Document Date
                  </span>
                  <input type="date"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                    value={header.documentDate} onChange={(e) => handleHeaderChange('documentDate', e.target.value)} />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Title
                  </span>
                  <input className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                    value={header.title} onChange={(e) => handleHeaderChange('title', e.target.value)} />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Customer
                  </span>
                  <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                    value={header.customer} onChange={(e) => handleHeaderChange('customer', e.target.value)}>
                    <option value="">{isLoadingCodes ? 'Loading customers...' : 'Select customer code'}</option>
                    {customerCodes.map((customer) =>
                      <option key={customer.customerId}
                        value={customer.customerId}>{customer.customerId} - {customer.customerName || customer.shortName || 'Unnamed'}
                      </option>)}
                  </select>
                </label>
                <label className="space-y-2">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {documentType === 'quotation' ? 'Quotation Status' : 'Status'}
                  </span>
                  {documentType === 'quotation' ? (
                    <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                      value={header.status} onChange={(e) => handleHeaderChange('status', e.target.value)}>
                      {QUOTATION_STATUS_OPTIONS.map((statusOption) =>
                        <option key={statusOption} value={statusOption}>{statusOption}</option>)}
                    </select>
                  ) : (
                    <input
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                      value={header.status} onChange={(e) => handleHeaderChange('status', e.target.value)} />
                  )}
                </label>
                <label className="space-y-2">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Tax Rate (%)
                  </span>
                  <input type="number" step="0.01"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                    value={header.taxRate} onChange={(e) => handleHeaderChange('taxRate', e.target.value)} />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Payment Term
                  </span>
                  <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                    value={header.paymentTerm}
                    onChange={(e) => handleHeaderChange('paymentTerm', e.target.value)}>
                    <option value="">{isLoadingCodes ? 'Loading payment terms...' : 'Select payment term'}</option>
                    {paymentTermCodes.map((paymentTerm) => <option key={paymentTerm.termId}
                      value={paymentTerm.termId}>{paymentTerm.termId} - {paymentTerm.termName || paymentTerm.shortName || 'Unnamed'}
                    </option>)}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {subtypeFields.map((field) => (
                <label key={field.key} className="space-y-2">
                  <span className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {field.label}
                  </span>
                  {field.key === 'margin' ? (
                    <>
                      <input
                        type="text"
                        inputMode="decimal"
                        list="quotation-margin-options"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                        value={(header as any)[field.key]}
                        onChange={(e) => handleHeaderChange(field.key, sanitizeDecimalInput(e.target.value))}
                        placeholder="Select or type margin"
                      />
                      <datalist id="quotation-margin-options">
                        {
                          QUOTATION_MARGIN_PRESETS.map((margin) => (
                            <option key={margin} value={margin} />
                          ))
                        }
                      </datalist>
                    </>
                  ) : (
                    <input
                      type={field.type}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                      value={(header as any)[field.key]}
                      onChange={(e) => handleHeaderChange(field.key, e.target.value)}
                    />
                  )}
                </label>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
              <label className="space-y-2 block">
                <span className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Remark
                </span>
                <textarea className="min-h-[96px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                  value={header.remark} onChange={(e) => handleHeaderChange('remark', e.target.value)} />
              </label>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className={`rounded-xl border px-4 py-3 ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Customer Name</p>
                <p className={`mt-1 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{customerDisplay || '-'}</p>
              </div>
              <div className={`rounded-xl border px-4 py-3 ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ship To</p>
                <p className={`mt-1 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{shipToDisplay || '-'}</p>
              </div>
              <div className={`rounded-xl border px-4 py-3 ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {documentType === 'quotation' ? 'Margin (%)' : 'Subtotal'}</p>
                <p className={`mt-1 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {documentType === 'quotation' ? `${parseNumberInput(header.margin).toFixed(2)}%` : totalCost.toFixed(2)}
                </p>
              </div>
              <div className={`rounded-xl border px-4 py-3 ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Amount</p>
                <p className={`mt-1 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {total.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div
                className={`grid px-4 py-3 text-xs font-semibold uppercase tracking-wide 
                  ${darkMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-600'}`
                }
                style={{
                  gridTemplateColumns: documentType === 'quotation' ?
                    '44px 100px minmax(240px,1.8fr) 90px 120px 120px 130px 100px' :
                    '44px 100px minmax(260px,1.8fr) 90px 120px 120px 130px'
                }}
              >
                <div>Item</div>
                <div>Code</div>
                <div>Description</div>
                <div>Qty</div>
                {documentType === 'quotation' ?
                  <>
                    <div>Margin(%)</div>
                    <div>Cost</div>
                  </>
                  : null
                }
                <div>Selling Price</div>
                <div>Total</div>
                <div></div>
              </div>
              {items.map((item, index) => (
                <div key={`document-item-${index}`}
                  className={`grid items-start gap-1 px-4 py-3 
                  ${darkMode ? 'border-t border-gray-700 bg-gray-800' : 'border-t border-gray-200 bg-white'}`}
                  style={{
                    gridTemplateColumns: documentType === 'quotation' ?
                      '44px 100px minmax(240px,1.8fr) 90px 120px 120px 130px 100px' :
                      '44px 100px minmax(260px,1.8fr) 90px 120px 120px 130px'
                  }}
                >
                  <div className={`pt-2 text-sm font-semibold
                    ${darkMode ? 'text-white' : 'text-gray-900'}`}>{index + 1}
                  </div>
                  <button type="button"
                    onClick={() => { setSelectedItemIndex(index); setProductModalOpen(true); }}
                    className={`rounded-lg border px-3 py-2 text-left text-xs font-medium 
                  ${darkMode ? 'border-blue-500/40 bg-blue-500/10 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                    {item.productCode || 'Select...'}
                  </button>
                  <input className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                    value={item.productName}
                    placeholder="Description"
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  />
                  <input type="number"
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-right text-sm text-black"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  />
                  {documentType === 'quotation' ?
                    <>
                      <input type="number" step="0.01"
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-right text-sm text-black"
                        value={item.margin}
                        onChange={(e) => handleItemChange(index, 'margin', e.target.value)}
                      />
                      <input type="number" step="0.01"
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-right text-sm text-black"
                        value={item.cost}
                        onChange={(e) => handleItemChange(index, 'cost', e.target.value)}
                      />
                    </>
                    : null}
                  <input type="number" step="0.01"
                    readOnly={documentType === 'quotation'}
                    className={`rounded-lg border border-gray-300 px-3 py-2 text-right text-sm 
                    ${documentType === 'quotation' ? 'bg-gray-100 text-gray-700' : 'bg-white text-black'}`}
                    value={item.sellingPrice}
                    onChange={(e) => handleItemChange(index, 'sellingPrice', e.target.value)}
                  />
                  <input type="number" step="0.01"
                    readOnly={documentType === 'quotation'}
                    className={`rounded-lg border border-gray-300 px-3 py-2 text-right text-sm w-full 
                    ${documentType === 'quotation' ? 'bg-gray-100 text-gray-700' : 'bg-white text-black'}`}
                    value={item.totalSellingPrice}
                    onChange={(e) => handleItemChange(index, 'total', e.target.value)}
                  />
                  <div className="flex justify-center pt-2">
                    {items.length > 1 ?
                      <button type="button"
                        onClick={() => removeItemRow(index)}
                        className="rounded-md px-2 py-1 text-lg leading-none text-red-500 hover:bg-red-50">×
                      </button> : null}
                  </div>
                </div>
              ))}
              <div className={`flex items-center justify-between border-t px-4 py-3 
                ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                <button type="button"
                  onClick={addItemRow}
                  className="rounded-lg border border-dashed border-purple-500 px-3 py-2 text-xs font-semibold text-purple-600 hover:bg-purple-50">
                  + Add Item
                </button>
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Items: {printItems.length || items.length}
                </div>
              </div>
            </div>
          </fieldset>

          <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-4">
            {!isViewMode ?
              <button
                type="button"
                onClick={() => void handleSave()}
                className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700">
                Save {typeLabel}
              </button> :
              null
            }
            {isViewMode ?
              <button
                type="button" onClick={() => setMode('edit')}
                className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600">
                Enable Edit
              </button> :
              null
            }
            {isViewMode ?
              <button
                type="button"
                onClick={() => void handlePrint()}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                Print
              </button> :
              null
            }
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
              className="rounded-lg bg-gray-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700">
              Cancel
            </button>
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
    </>
  );
}