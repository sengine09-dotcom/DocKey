import React, { useEffect, useMemo, useState } from 'react';
import ProductSelectionModal from '../ProductSelectionModal';
import documentService, { MainDocumentType } from '../../services/documentService';
import codeService from '../../services/codeService';
import { printDocumentContent } from '../../utils/printDocument';
import { showAppAlert, showAppConfirm } from '../../services/dialogService';

const getTodayDateInputValue = () => new Date().toISOString().slice(0, 10);

const normalizeText = (value: any) => String(value || '').trim().toLowerCase();

const DOCUMENT_TYPE_LABELS: Record<MainDocumentType, string> = {
  quotation: 'Quotation',
  invoice: 'Invoice',
  receipt: 'Receipt',
  deposit_receipt: 'Deposit Receipt',
  purchase_order: 'Purchase Order',
  work_order: 'Work Order',
};

const DOCUMENT_DEFAULT_STATUS: Record<MainDocumentType, string> = {
  quotation: 'Draft',
  invoice: 'Pending',
  receipt: 'Received',
  deposit_receipt: 'Received',
  purchase_order: 'Open',
  work_order: 'Open',
};

const DOCUMENT_NUMBER_PREFIX: Record<MainDocumentType, string> = {
  quotation: 'QT',
  invoice: 'INV',
  receipt: 'RC',
  deposit_receipt: 'DR',
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
  'Confirmed',
  'Approved',
  'Won',
  'Ordered',
  'Rejected',
  'Lost',
  'Expired',
  'Converted'
];
const PURCHASE_ORDER_STATUS_OPTIONS = [
  'Open',
  'Pending',
  'Approved',
  'Ordered',
  'Partially Received',
  'Completed',
  'Cancelled',
];
const DEPOSIT_RECEIPT_PAYMENT_TYPE_OPTIONS = [
  { value: 'partial', label: 'จ่ายบางส่วน' },
  { value: 'full', label: 'จ่ายเต็ม' },
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
    sourceQuotationId: '',
    sourceQuotationNumber: '',
  }
);

const parseNumberInput = (value: any) => {
  if (value === '' || value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDisplayAmount = (value: any) =>
  parseNumberInput(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
  paymentReference: '',
  paymentAmount: '0',
  paymentType: 'full',
  vendorCode: '',
  supplierName: '',
  deliveryDate: '',
  productCode: '',
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

  if (documentType === 'deposit_receipt') {
    return [
      { key: 'receivedDate', label: 'Received Date', type: 'date' },
      { key: 'paymentReference', label: 'Payment Reference', type: 'text' },
      { key: 'paymentAmount', label: 'Payment Amount', type: 'number' },
      { key: 'paymentType', label: 'Payment Type', type: 'text' },
    ];
  }

  if (documentType === 'purchase_order') {
    return [
      { key: 'vendorCode', label: 'Vendor Code', type: 'text' },
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
  const [poSplitItems, setPoSplitItems] = useState<ReturnType<typeof createEmptyItem>[]>([]);
  const [customerCodes, setCustomerCodes] = useState<any[]>([]);
  const [destinationCodes, setDestinationCodes] = useState<any[]>([]);
  const [paymentTermCodes, setPaymentTermCodes] = useState<any[]>([]);
  const [vendorCodes, setVendorCodes] = useState<any[]>([]);
  const [productCodes, setProductCodes] = useState<any[]>([]);
  const [confirmedQuotationItems, setConfirmedQuotationItems] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any | null>(null);
  const [isLoadingCodes, setIsLoadingCodes] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadCodeOptions = async () => {
      setIsLoadingCodes(true);
      try {
        const [customerResponse, destinationResponse, paymentTermResponse, vendorResponse, productResponse, companyResponse, quotationResponse] = await Promise.all([
          codeService.getAll('customer'),
          codeService.getAll('destination'),
          codeService.getAll('payment-term'),
          codeService.getAll('vendor'),
          codeService.getAll('product'),
          codeService.getAll('company'),
          documentService.getAll('quotation'),
        ]);
        setCustomerCodes(customerResponse.data.data || []);
        setDestinationCodes(destinationResponse.data.data || []);
        setPaymentTermCodes(paymentTermResponse.data.data || []);
        setVendorCodes(vendorResponse.data.data || []);
        setProductCodes(productResponse.data.data || []);
        setCompanyInfo((companyResponse.data.data || []).find((company: any) => company?.isActive !== false) || companyResponse.data.data?.[0] || null);
        setConfirmedQuotationItems(
          (quotationResponse.data.data || [])
            .filter((quotation: any) => normalizeText(quotation?.status) === 'confirmed' && Array.isArray(quotation?.items) && quotation.items.length > 0)
            .flatMap((quotation: any, quotationIndex: number) => quotation.items.map((item: any, itemIndex: number) => ({
              id: item?.id || `${quotation?.documentId || quotation?.id || quotationIndex}-${itemIndex}`,
              productCode: item?.productCode || '',
              productName: item?.productName || '',
              cost: item?.cost ?? '',
              sellingPrice: item?.sellingPrice ?? '',
              quantity: item?.quantity ?? '',
              totalCost: item?.totalCost ?? '',
              totalSellingPrice: item?.totalSellingPrice ?? '',
              sourceType: 'quotation',
              sourceLabel: quotation?.documentNumber ? `Quotation ${quotation.documentNumber}` : 'Confirmed Quotation',
              sourceDocumentNumber: quotation?.documentNumber || '',
              sourceDocumentId: quotation?.documentId || quotation?.id || '',
              sourceCustomer: quotation?.customerName || quotation?.customer || '',
            }))),
        );
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
    if (productCodes.length === 0) return;
    setItems((prev) => prev.map((item) => {
      if (!item.productCode || item.productName) return item;
      const matchedProduct = productCodes.find((product) => {
        const productCode = String(product.productCode || product.productId || product.id || '').trim();
        return productCode === String(item.productCode || '').trim();
      });
      if (!matchedProduct) return item;
      return {
        ...item,
        productName: matchedProduct.productName || item.productName || '',
      };
    }));
  }, [productCodes]);

  const productSelectionOptions = useMemo(() => {
    if (documentType !== 'purchase_order') {
      return productCodes;
    }

    return [
      ...confirmedQuotationItems,
      ...productCodes.map((product) => ({
        ...product,
        sourceType: 'product',
        sourceLabel: 'Product Master',
      })),
    ];
  }, [confirmedQuotationItems, documentType, productCodes]);

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
      id: initialData.id || initialData.documentId || '',
      //documentId: initialData.documentId || initialData.id || '',
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
      paymentReference: initialData.paymentReference || '',
      paymentAmount: String(initialData.paymentAmount ?? getEmptyHeader(documentType).paymentAmount),
      paymentType: initialData.paymentType || getEmptyHeader(documentType).paymentType,
      vendorCode: initialData.vendorCode || '',
      supplierName: initialData.supplierName || '',
      deliveryDate: initialData.deliveryDate ? String(initialData.deliveryDate).slice(0, 10) : '',
      productCode: initialData.productCode || '',
    });

    const mapItem = (item: any) => ({
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
      sourceQuotationId: item.sourceQuotationId || '',
      sourceQuotationNumber: item.sourceQuotationNumber || '',
    });

    if (documentType === 'purchase_order') {
      // splitItems = PurchaseOrderDocument split lines (for edit mode)
      const splitLines = Array.isArray(initialData.splitItems) && initialData.splitItems.length > 0
        ? initialData.splitItems.map(mapItem)
        : [];
      setPoSplitItems(splitLines);

      // View mode shows aggregated DocumentItem; edit/create shows split lines
      const editLines = splitLines.length > 0 ? splitLines : [createEmptyItem()];
      const viewLines = Array.isArray(initialData.items) && initialData.items.length > 0
        ? initialData.items.map(mapItem)
        : editLines;
      setItems((initialData.__mode || 'edit') === 'view' ? viewLines : editLines);
    } else if (Array.isArray(initialData.items) && initialData.items.length > 0) {
      setItems(initialData.items.map(mapItem));
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
  const totalProfit = totalSellingPrice - totalCost;
  const tax = totalSellingPrice * (taxRate / 100);
  const total = totalSellingPrice + tax;
  const totalQuantity = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
  const printItems = items.filter((item) => item.productCode || item.productName || item.quantity || item.cost || item.totalCost);

  const customerDisplay = (() => {
    const customerCode = String(header.customer || '').trim();
    if (!customerCode) return '';
    const selectedCustomer = customerCodes.find((customer) => customer.customerCode === customerCode);
    if (!selectedCustomer) return customerCode;
    return selectedCustomer.customerName || selectedCustomer.shortName || selectedCustomer.customerCode || customerCode;
  })();

  const vendorDisplay = (() => {
    const vendorCode = String(header.vendorCode || '').trim();
    if (!vendorCode) return '';
    const selectedVendor = vendorCodes.find((vendor) => vendor.vendorCode === vendorCode);
    if (!selectedVendor) return vendorCode;
    return selectedVendor.name || selectedVendor.vendorCode || vendorCode;
  })();

  const partyLabel = documentType === 'purchase_order' ? 'Vendor' : 'Customer';
  const partyDisplay = documentType === 'purchase_order'
    ? (vendorDisplay || header.supplierName || header.vendorCode || '')
    : (customerDisplay || header.customer || '');

  const shipToDisplay = (() => {
    const destinationId = String(header.shipTo || '').trim();
    if (!destinationId) return '';
    const selectedDestination = destinationCodes.find((destination) => destination.destId === destinationId);
    if (!selectedDestination) return destinationId;
    return selectedDestination.destinationCode || selectedDestination.destination || selectedDestination.location || destinationId;
  })();

  const paymentTermDisplay = (() => {
    const paymentTermId = String(header.paymentTerm || '').trim();
    if (!paymentTermId) return '';
    const selectedPaymentTerm = paymentTermCodes.find((paymentTerm) => paymentTerm.termId === paymentTermId);
    if (!selectedPaymentTerm) return paymentTermId;
    return selectedPaymentTerm.termCode || selectedPaymentTerm.termName || selectedPaymentTerm.shortName || paymentTermId;
  })();

  const getProductDisplayName = (productCodeValue: string, fallbackName = '') => {
    const normalizedProductCode = String(productCodeValue || '').trim();
    if (!normalizedProductCode) return fallbackName || '';
    const selectedProduct = productCodes.find((product) => {
      const candidateCode = String(product.productCode || product.productId || product.id || '').trim();
      return candidateCode === normalizedProductCode;
    });
    return selectedProduct?.productName || fallbackName || normalizedProductCode;
  };

  const handleHeaderChange = (field: string, value: string) => {
    if (isViewMode) return;
    setHeader((prev) => {
      if (documentType === 'purchase_order' && field === 'vendorCode') {
        const selectedVendor = vendorCodes.find((vendor) => vendor.vendorCode === value);
        return {
          ...prev,
          vendorCode: value,
          supplierName: selectedVendor?.name || prev.supplierName,
        };
      }

      if (documentType === 'deposit_receipt' && field === 'paymentType') {
        if (value === 'full') {
          return {
            ...prev,
            paymentType: value,
            paymentAmount: total.toFixed(2),
          };
        }

        return {
          ...prev,
          paymentType: value,
        };
      }

      return { ...prev, [field]: value };
    });
  };

  useEffect(() => {
    if (documentType !== 'deposit_receipt') return;
    if (isViewMode) return;
    if (String(header.paymentType || '').trim().toLowerCase() !== 'full') return;

    const nextPaymentAmount = total.toFixed(2);
    if (String(header.paymentAmount || '') === nextPaymentAmount) return;

    setHeader((prev) => ({
      ...prev,
      paymentAmount: nextPaymentAmount,
    }));
  }, [documentType, header.paymentAmount, header.paymentType, isViewMode, total]);

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

    const isQuotationSource = documentType === 'purchase_order' && normalizeText(product?.sourceType) === 'quotation';

    setItems((prev) => {
      const next = [...prev];
      const nextQuantity = isQuotationSource ? String(product.quantity ?? next[selectedItemIndex].quantity ?? '') : next[selectedItemIndex].quantity;
      const nextCost = product.cost == null || product.cost === '' ? '' : Number(product.cost).toFixed(2);
      const nextUnitPrice = isQuotationSource
        ? (product.cost == null || product.cost === '' ? '' : Number(product.cost).toFixed(2))
        : next[selectedItemIndex].sellingPrice;
      next[selectedItemIndex] = {
        ...next[selectedItemIndex],
        id: product.id,
        productCode: product.productCode || '',
        productName: product.productName || '',
        quantity: nextQuantity,
        margin: header.margin,
        cost: nextCost,
        sellingPrice: documentType === 'quotation'
          ? calculateQuotationSalePrice(nextCost, header.margin)
          : nextUnitPrice,
        sourceQuotationId: isQuotationSource ? (product.sourceDocumentId || '') : '',
        sourceQuotationNumber: isQuotationSource ? (product.sourceDocumentNumber || '') : '',
      };
      if (documentType === 'quotation') {
        next[selectedItemIndex].totalSellingPrice = calculateLineTotal(next[selectedItemIndex].quantity, next[selectedItemIndex].sellingPrice);
      } else if (documentType === 'purchase_order' && isQuotationSource) {
        next[selectedItemIndex].totalCost = calculateLineTotal(next[selectedItemIndex].quantity, next[selectedItemIndex].cost);
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

  const buildPrintDocumentHtml = () => {
    const subtotal = printItems.reduce(
      (sum, item) => sum + Number(item.totalSellingPrice || item.totalCost || 0),
      0,
    );
    const companyName = String(companyInfo?.name || companyInfo?.nameEn || 'Doc Key').trim();
    const companyAddress = String(companyInfo?.address || '').trim();
    const companyPhone = String(companyInfo?.phone || '').trim();
    const companyBranch = String(companyInfo?.branch || '').trim();
    const companyTaxId = String(companyInfo?.taxId || '').trim();

    if (documentType === 'quotation') {
      return `
        <style>
          .quotation-print-root {
            color: #0f172a;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            line-height: 1.5;
          }

          .quotation-print-sheet {
            min-height: calc(297mm - 28mm);
            background: #ffffff;
            padding: 12mm 14mm 16mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
          }

          .quotation-print-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
            padding-bottom: 14px;
            border-bottom: 2px solid #1d4ed8;
          }

          .quotation-brand {
            display: flex;
            gap: 12px;
            align-items: flex-start;
          }

          .quotation-brand-mark {
            width: 56px;
            height: 56px;
            border-radius: 16px;
            background: linear-gradient(135deg, #1d4ed8, #0f172a);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 0.08em;
          }

          .quotation-brand-title {
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 0.08em;
            margin: 0;
            color: #0f172a;
          }

          .quotation-brand-subtitle,
          .quotation-brand-text {
            margin: 3px 0 0;
            color: #475569;
            font-size: 11px;
          }

          .quotation-company-meta {
            margin-top: 8px;
            color: #334155;
            font-size: 11px;
            line-height: 1.6;
            max-width: 430px;
            white-space: pre-wrap;
          }

          .quotation-docbox {
            min-width: 250px;
            border: 1px solid #bfdbfe;
            border-radius: 16px;
            overflow: hidden;
          }

          .quotation-docbox-head {
            background: #eff6ff;
            color: #1d4ed8;
            padding: 8px 12px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.12em;
          }

          .quotation-docbox-body {
            padding: 10px 12px;
          }

          .quotation-docbox-title {
            margin: 0;
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
          }

          .quotation-docbox-meta {
            margin-top: 8px;
            display: grid;
            grid-template-columns: 96px 1fr;
            row-gap: 6px;
            column-gap: 8px;
            font-size: 11px;
          }

          .quotation-docbox-label {
            color: #64748b;
            font-weight: 700;
          }

          .quotation-docbox-value {
            color: #0f172a;
          }

          .quotation-intro {
            margin-top: 14px;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 12px 14px;
            background: #f8fafc;
          }

          .quotation-section-grid {
            margin-top: 16px;
            display: grid;
            grid-template-columns: 1.15fr 0.85fr;
            gap: 16px;
          }

          .quotation-card {
            border: 1px solid #cbd5e1;
            border-radius: 16px;
            overflow: hidden;
            background: #ffffff;
          }

          .quotation-card-head {
            padding: 9px 12px;
            background: #eff6ff;
            color: #1e3a8a;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }

          .quotation-card-body {
            padding: 12px;
          }

          .quotation-info-grid {
            display: grid;
            grid-template-columns: 110px 1fr;
            row-gap: 8px;
            column-gap: 10px;
            font-size: 11px;
          }

          .quotation-info-label {
            color: #64748b;
            font-weight: 700;
          }

          .quotation-info-value {
            color: #0f172a;
            white-space: pre-wrap;
          }

          .quotation-items {
            width: 100%;
            margin-top: 16px;
            border-collapse: collapse;
          }

          .quotation-items th,
          .quotation-items td {
            border: 1px solid #cbd5e1;
            padding: 8px 9px;
            vertical-align: top;
          }

          .quotation-items th {
            background: #1e3a8a;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }

          .quotation-items tbody tr:nth-child(even) {
            background: #f8fafc;
          }

          .text-center {
            text-align: center;
          }

          .text-right {
            text-align: right;
          }

          .quotation-bottom {
            margin-top: 16px;
            display: grid;
            grid-template-columns: 1.1fr 0.9fr;
            gap: 16px;
          }

          .quotation-remark {
            border: 1px solid #cbd5e1;
            border-radius: 16px;
            padding: 12px 14px;
            background: #f8fafc;
          }

          .quotation-remark-title {
            margin: 0 0 8px;
            color: #475569;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-weight: 700;
          }

          .quotation-remark-body {
            margin: 0;
            color: #0f172a;
            white-space: pre-wrap;
          }

          .quotation-summary {
            width: 100%;
            border-collapse: collapse;
          }

          .quotation-summary td {
            border: 1px solid #cbd5e1;
            padding: 9px 10px;
          }

          .quotation-summary-label {
            background: #f8fafc;
            font-weight: 700;
            color: #334155;
          }

          .quotation-summary-total td {
            background: #dbeafe;
            color: #1e3a8a;
            font-weight: 700;
            font-size: 14px;
          }

          .quotation-approval {
            margin-top: auto;
            padding-top: 28px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }

          .quotation-sign-box {
            border-top: 1px solid #94a3b8;
            padding-top: 10px;
            min-height: 52px;
          }

          .quotation-sign-title {
            font-size: 11px;
            font-weight: 700;
            color: #334155;
          }

          .quotation-sign-note {
            margin-top: 6px;
            font-size: 10px;
            color: #64748b;
          }
        </style>
        <div class="quotation-print-root">
          <div class="quotation-print-sheet">
            <div class="quotation-print-header">
              <div class="quotation-brand">
                <div class="quotation-brand-mark">DK</div>
                <div>
                  <h1 class="quotation-brand-title">${escapeHtml(companyName)}</h1>
                  <p class="quotation-brand-subtitle">Professional sales quotation document</p>
                  <p class="quotation-brand-text">Prepared for customer review and approval</p>
                  <div class="quotation-company-meta">${escapeHtml([
                    companyAddress,
                    companyPhone ? `Tel: ${companyPhone}` : '',
                    companyBranch ? `Branch: ${companyBranch}` : '',
                    companyTaxId ? `Tax ID: ${companyTaxId}` : '',
                  ].filter(Boolean).join(' | ') || 'Company profile is not configured.')}</div>
                </div>
              </div>
              <div class="quotation-docbox">
                <div class="quotation-docbox-head">Quotation Document</div>
                <div class="quotation-docbox-body">
                  <p class="quotation-docbox-title">QUOTATION</p>
                  <div class="quotation-docbox-meta">
                    <div class="quotation-docbox-label">Document No</div>
                    <div class="quotation-docbox-value">${escapeHtml(header.documentNumber || '-')}</div>
                    <div class="quotation-docbox-label">Date</div>
                    <div class="quotation-docbox-value">${escapeHtml(formatPrintDate(header.documentDate))}</div>
                    <div class="quotation-docbox-label">Status</div>
                    <div class="quotation-docbox-value">${escapeHtml(header.status || '-')}</div>
                    <div class="quotation-docbox-label">Reference</div>
                    <div class="quotation-docbox-value">${escapeHtml(header.referenceNo || '-')}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="quotation-intro">
              We are pleased to submit our quotation for your consideration. Please review the pricing, quantities, and commercial terms below.
            </div>

            <div class="quotation-section-grid">
              <div class="quotation-card">
                <div class="quotation-card-head">Customer Information</div>
                <div class="quotation-card-body">
                  <div class="quotation-info-grid">
                    <div class="quotation-info-label">Customer</div>
                    <div class="quotation-info-value">${escapeHtml(partyDisplay || '-')}</div>
                    <div class="quotation-info-label">Bill To</div>
                    <div class="quotation-info-value">${escapeHtml(header.billTo || partyDisplay || '-')}</div>
                    <div class="quotation-info-label">Ship To</div>
                    <div class="quotation-info-value">${escapeHtml(shipToDisplay || '-')}</div>
                    <div class="quotation-info-label">Title</div>
                    <div class="quotation-info-value">${escapeHtml(header.title || 'Quotation')}</div>
                  </div>
                </div>
              </div>
              <div class="quotation-card">
                <div class="quotation-card-head">Commercial Terms</div>
                <div class="quotation-card-body">
                  <div class="quotation-info-grid">
                    <div class="quotation-info-label">Payment</div>
                    <div class="quotation-info-value">${escapeHtml(paymentTermDisplay || header.paymentMethod || '-')}</div>
                    <div class="quotation-info-label">Tax Rate</div>
                    <div class="quotation-info-value">${escapeHtml(`${Number(taxRate || 0).toFixed(2)}%`)}</div>
                    <div class="quotation-info-label">Total Qty</div>
                    <div class="quotation-info-value">${escapeHtml(Number(totalQuantity || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 }))}</div>
                  </div>
                </div>
              </div>
            </div>

            <table class="quotation-items">
              <thead>
                <tr>
                  <th style="width:52px;">No</th>
                  <th style="width:96px;">Code</th>
                  <th>Description</th>
                  <th style="width:76px;">Qty</th>
                  <th style="width:94px;">Unit Price</th>
                  <th style="width:108px;">Line Total</th>
                </tr>
              </thead>
              <tbody>
                ${printItems.length === 0 ? '<tr><td colspan="6" class="text-center">-</td></tr>' : printItems.map((item, index) => `
                  <tr>
                    <td class="text-center">${index + 1}</td>
                    <td class="text-center">${escapeHtml(item.productCode || '-')}</td>
                    <td>${escapeHtml(item.productName || '-')}</td>
                    <td class="text-right">${Number(item.quantity || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}</td>
                    <td class="text-right">${Number(item.sellingPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td class="text-right">${Number(item.totalSellingPrice || item.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="quotation-bottom">
              <div class="quotation-remark">
                <p class="quotation-remark-title">Remark / Terms</p>
                <p class="quotation-remark-body">${escapeHtml(header.remark || 'Please contact us if you require any clarification or revision to this quotation.')}</p>
              </div>
              <table class="quotation-summary">
                <tbody>
                  <tr>
                    <td class="quotation-summary-label">Subtotal</td>
                    <td class="text-right">${Number(subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td class="quotation-summary-label">VAT</td>
                    <td class="text-right">${Number(tax || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td class="quotation-summary-label">Total Quantity</td>
                    <td class="text-right">${Number(totalQuantity || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}</td>
                  </tr>
                  <tr class="quotation-summary-total">
                    <td>Grand Total</td>
                    <td class="text-right">${Number(total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="quotation-approval">
              <div class="quotation-sign-box">
                <div class="quotation-sign-title">Prepared By</div>
                <div class="quotation-sign-note">Sales Representative / Authorized Signatory</div>
              </div>
              <div class="quotation-sign-box">
                <div class="quotation-sign-title">Customer Approval</div>
                <div class="quotation-sign-note">Signature / Name / Date</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return `
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
            <tr><td class="label-cell">${escapeHtml(partyLabel)} :</td><td class="value-cell">${escapeHtml(partyDisplay || '-')}</td><td class="label-cell">Status :</td><td class="value-cell">${escapeHtml(header.status || '-')}</td></tr>
            <tr><td class="label-cell">Bill To :</td><td class="value-cell">${escapeHtml(header.billTo || partyDisplay || '-')}</td><td class="label-cell">Ship To :</td><td class="value-cell">${escapeHtml(shipToDisplay || '-')}</td></tr>
            <tr><td class="label-cell">Reference No :</td><td class="value-cell">${escapeHtml(header.referenceNo || '-')}</td><td class="label-cell">Payment :</td><td class="value-cell">${escapeHtml(paymentTermDisplay || header.paymentMethod || '-')}</td></tr>
          </tbody>
        </table>
        <table class="line-table">
          <thead>
            <tr>
              <th class="col-item">Item</th>
              <th class="col-id">Code</th>
              <th>Product Name</th>
              <th class="col-qty">Quantity</th>
              <th class="col-margin">Margin</th>
              <th class="col-price">Cost</th>
              <th class="col-total">Total cost</th>
            </tr>
          </thead>
          <tbody>
            ${printItems.length === 0 ? '<tr><td colspan="6" class="col-center">-</td></tr>' : printItems.map((item, index) => `
              <tr>
                <td class="col-center">${index + 1}</td>
                <td class="col-center">${escapeHtml(item.productCode || '-')}</td>
                <td>${escapeHtml(item.productName || '-')}</td>
                <td class="col-right">${Number(item.quantity || 0).toFixed(3)}</td>
                <td class="col-right">${Number(item.margin || 0).toFixed(2)}</td>
                <td class="col-right">${Number(item.cost || 0).toFixed(2)}</td>
                <td class="col-right">${Number(item.totalSellingPrice || item.totalCost || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  const handlePrint = async () => {
    await printDocumentContent(
      `${typeLabel}-${header.documentNumber || 'document'}`,
      buildPrintDocumentHtml(),
    );
  };

  const handleSave = async () => {
    if (isViewMode) return;

    const validItems = items.filter((item) => item.productCode || item.productName);

    if (validItems.length === 0) {
      await showAppAlert({ title: 'Validation', message: 'Please add at least 1 item before saving.', tone: 'warning' });
      return;
    }

    const payload = {
      header: {
        ...header,
        id: header.id || '',
        documentId: header.id || '',
        documentNumber: header.documentNumber || '',
        title: header.title || typeLabel,
        totalCost,
        totalSellingPrice,
        totalProfit,
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
        id: savedRecord.documentId || savedRecord.id || prev.id,
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
              <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${documentType === 'quotation' ? (darkMode ? 'text-blue-300' : 'text-blue-700') : (darkMode ? 'text-gray-400' : 'text-gray-500')}`}>
                {documentType === 'quotation' ? 'Sales Quotation' : 'All Document Form'}
              </p>
              <h3 className={`mt-1 text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {documentType === 'quotation' ? 'Quotation Details' : `${typeLabel} Details`}
              </h3>
              <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {documentType === 'quotation'
                  ? 'เอกสารเสนอราคาแบบมืออาชีพสำหรับตรวจสอบรายละเอียดลูกค้า ราคา และเงื่อนไขการขาย'
                  : 'จัดการข้อมูลเอกสารรวมโดยแยกประเภทด้วย DocumentType'}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isViewMode ? (darkMode ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-100 text-blue-700') : (darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-700')}`}>
              {isViewMode ? 'View Mode' : mode === 'edit' ? 'Edit Mode' : 'Create Mode'}
            </span>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          {codeError ? <div className={`rounded-xl border px-4 py-3 text-sm ${darkMode ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>{codeError}</div> : null}

          <fieldset disabled={isViewMode} className={isViewMode ? 'opacity-95' : ''}>
            {documentType === 'quotation' && isViewMode ? (() => {
              const linkedPOs: { documentId: string; documentNumber: string }[] = initialData?.linkedPurchaseOrders || [];
              const isOrdered = linkedPOs.length > 0 || normalizeText(header.status) === 'ordered';
              const isConfirmed = ['confirmed','approved','won','ordered','converted','link invoice'].includes(normalizeText(header.status));
              const isInvoiced = !!header.linkedInvoiceNumber;
              const steps = [
                {
                  label: 'ใบเสนอราคา',
                  sublabel: header.documentNumber,
                  done: true,
                },
                {
                  label: 'ลูกค้ายืนยัน',
                  sublabel: isConfirmed ? header.status : null,
                  done: isConfirmed,
                },
                {
                  label: 'สั่งของแล้ว',
                  sublabel: linkedPOs.length > 0 ? linkedPOs.map((po) => po.documentNumber).join(', ') : null,
                  done: isOrdered,
                },
                {
                  label: 'ออกใบแจ้งหนี้',
                  sublabel: header.linkedInvoiceNumber || null,
                  done: isInvoiced,
                },
              ];
              return (
                <div className={`overflow-hidden rounded-2xl border ${darkMode ? 'border-emerald-500/20 bg-gray-900' : 'border-emerald-200 bg-white'} shadow-sm`}>
                  <div className={`border-b px-5 py-3 ${darkMode ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-100 bg-emerald-50'}`}>
                    <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Sales Progress</p>
                  </div>
                  <div className="flex items-start px-6 py-5">
                    {steps.map((step, index) => (
                      <React.Fragment key={step.label}>
                        <div className="flex min-w-[96px] flex-col items-center text-center">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${
                            step.done
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : darkMode ? 'border-gray-600 bg-gray-800 text-gray-500' : 'border-gray-300 bg-white text-gray-400'
                          }`}>
                            {step.done ? '✓' : index + 1}
                          </div>
                          <p className={`mt-2 text-xs font-semibold ${step.done ? (darkMode ? 'text-emerald-400' : 'text-emerald-700') : (darkMode ? 'text-gray-500' : 'text-gray-400')}`}>
                            {step.label}
                          </p>
                          {step.sublabel ? (
                            <p className={`mt-1 max-w-[88px] truncate text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} title={step.sublabel}>
                              {step.sublabel}
                            </p>
                          ) : null}
                        </div>
                        {index < steps.length - 1 ? (
                          <div className={`mt-5 h-0.5 flex-1 transition-colors ${step.done ? 'bg-emerald-500' : darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
                        ) : null}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              );
            })() : null}

            {documentType === 'quotation' ? (
              <div className={`overflow-hidden rounded-2xl border ${darkMode ? 'border-blue-500/30 bg-gradient-to-r from-slate-900 via-blue-950/70 to-slate-900' : 'border-blue-200 bg-gradient-to-r from-blue-50 via-white to-indigo-50'}`}>
                <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Quotation Overview</p>
                    <div>
                      <h4 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>QUOTATION</h4>
                      <p className={`mt-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>เลือกสถานะและตรวจสอบรายละเอียดก่อนส่งเสนอราคาให้ลูกค้า</p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-white/10 text-white' : 'bg-white text-blue-700 border border-blue-200'}`}>
                        Document No: {header.documentNumber || suggestedDocumentNumber || buildDefaultDocumentNumber(documentType)}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                        Current Status: {header.status || 'Draft'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:min-w-[320px]">
                    <div className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-white/10 bg-white/5' : 'border-blue-100 bg-white/80'}`}>
                      <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>Customer</p>
                      <p className={`mt-2 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{customerDisplay || '-'}</p>
                    </div>
                    <div className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-white/10 bg-white/5' : 'border-blue-100 bg-white/80'}`}>
                      <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>Payment Term</p>
                      <p className={`mt-2 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{paymentTermDisplay || '-'}</p>
                    </div>
                    <div className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-white/10 bg-white/5' : 'border-blue-100 bg-white/80'}`}>
                      <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>Total Items</p>
                      <p className={`mt-2 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{printItems.length || items.length}</p>
                    </div>
                    <div className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-white/10 bg-white/5' : 'border-blue-100 bg-white/80'}`}>
                      <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>Grand Total</p>
                      <p className={`mt-2 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>฿{formatDisplayAmount(total)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className={`rounded-2xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-900/80' : 'border-gray-200 bg-white'} shadow-sm`}>
                <div className="mb-4">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Document Information</p>
                  <h4 className={`mt-1 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Quotation Header</h4>
                </div>
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
                    {partyLabel}
                  </span>
                  {documentType === 'purchase_order' ? (
                    isViewMode ? (
                      <input
                        readOnly
                        className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                        value={partyDisplay}
                      />
                    ) : (
                      <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                        value={header.vendorCode} onChange={(e) => handleHeaderChange('vendorCode', e.target.value)}>
                        <option value="">{isLoadingCodes ? 'Loading vendors...' : 'Select vendor code'}</option>
                        {vendorCodes.map((vendor) =>
                          <option key={vendor.vendorCode}
                            value={vendor.vendorCode}>{vendor.vendorCode} - {vendor.name || vendor.vendorCode || 'Unnamed'}
                          </option>)}
                      </select>
                    )
                  ) : isViewMode ? (
                    <input
                      readOnly
                      className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                      value={customerDisplay || header.customer || ''}
                    />
                  ) : (
                    <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                      value={header.customer} onChange={(e) => handleHeaderChange('customer', e.target.value)}>
                      <option value="">{isLoadingCodes ? 'Loading customers...' : 'Select customer code'}</option>
                      {customerCodes.map((customer) =>
                        <option key={customer.customerCode}
                          value={customer.customerCode}>{customer.customerName || customer.shortName || customer.customerCode || 'Unnamed'}
                        </option>)}
                    </select>
                  )}
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
                  ) : documentType === 'purchase_order' ? (
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                      value={header.status}
                      onChange={(e) => handleHeaderChange('status', e.target.value)}
                    >
                      {PURCHASE_ORDER_STATUS_OPTIONS.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>{statusOption}</option>
                      ))}
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
              </div>

              <div className={`rounded-2xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-900/80' : 'border-gray-200 bg-white'} shadow-sm`}>
                <div className="mb-4">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Commercial Terms</p>
                  <h4 className={`mt-1 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Pricing & Delivery Context</h4>
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
                      value={paymentTerm.termId}>{paymentTerm.termCode} - {paymentTerm.termName || paymentTerm.shortName || 'Unnamed'}
                    </option>)}
                  </select>
                </label>
                {documentType === 'quotation' ? (
                  <div className={`rounded-xl border px-4 py-3 md:col-span-2 ${darkMode ? 'border-blue-500/20 bg-blue-500/5' : 'border-blue-100 bg-blue-50/70'}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Quotation Guidance</p>
                    <p className={`mt-2 text-sm leading-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      ตรวจสอบสถานะ, เงื่อนไขการชำระ, อัตราภาษี และส่วนลดเชิงพาณิชย์ให้ครบก่อนบันทึกหรือพิมพ์เอกสารเสนอราคา
                    </p>
                  </div>
                ) : null}
              </div>
              </div>
            </div>

            <div className={`mt-6 rounded-2xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-900/80' : 'border-gray-200 bg-white'} shadow-sm`}>
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Additional Fields</p>
                  <h4 className={`mt-1 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Supplementary Details</h4>
                </div>
                {documentType === 'quotation' ? (
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                    Quotation margin and commercial details
                  </span>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                  ) : field.key === 'paymentType' && documentType === 'deposit_receipt' ? (
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                      value={(header as any)[field.key]}
                      onChange={(e) => handleHeaderChange(field.key, e.target.value)}
                    >
                      {DEPOSIT_RECEIPT_PAYMENT_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : field.key === 'vendorCode' && documentType === 'purchase_order' ? (
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                      value={(header as any)[field.key]}
                      onChange={(e) => handleHeaderChange(field.key, e.target.value)}
                    >
                      <option value="">{isLoadingCodes ? 'Loading vendors...' : 'Select vendor code'}</option>
                      {vendorCodes.map((vendor) => (
                        <option key={vendor.vendorCode} value={vendor.vendorCode}>{vendor.vendorCode} - {vendor.name || 'Unnamed Vendor'}</option>
                      ))}
                    </select>
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
            </div>

            <div className={`mt-6 rounded-2xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-900/80' : 'border-gray-200 bg-white'} shadow-sm`}>
              <div className="mb-4">
                <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Notes</p>
                <h4 className={`mt-1 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Remark / Internal Notes</h4>
              </div>
              <label className="space-y-2 block">
                <span className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Remark
                </span>
                <textarea className="min-h-[96px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                  value={header.remark} onChange={(e) => handleHeaderChange('remark', e.target.value)} />
              </label>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className={`rounded-2xl border px-4 py-4 ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'} shadow-sm`}>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{documentType === 'purchase_order' ? 'Vendor Name' : 'Customer Name'}</p>
                <p className={`mt-1 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{documentType === 'purchase_order' ? (vendorDisplay || header.supplierName || '-') : (customerDisplay || '-')}</p>
              </div>
             
              <div className={`rounded-2xl border px-4 py-4 ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'} shadow-sm`}>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {documentType === 'quotation' ? 'Margin (%)' : documentType === 'purchase_order' ? 'Total Cost Price' : 'Subtotal'}</p>
                <p className={`mt-1 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {documentType === 'quotation' ? `${parseNumberInput(header.margin).toFixed(2)}%` : formatDisplayAmount(totalSellingPrice)}
                </p>
              </div>
              <div className={`rounded-2xl border px-4 py-4 ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'} shadow-sm`}>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Vat</p>
                <p className={`mt-1 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  ฿{formatDisplayAmount(tax)}
                </p>
              </div>
              <div className={`rounded-2xl border px-4 py-4 ${darkMode ? 'border-blue-500/30 bg-blue-950/40' : 'border-blue-200 bg-blue-50'} shadow-sm`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Grand Total</p>
                <p className={`mt-2 text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  ฿{formatDisplayAmount(total)}
                </p>
                <p className={`mt-1 text-xs ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>รวมภาษีมูลค่าเพิ่มแล้ว</p>
              </div>
            </div>

            <div className={`mt-6 overflow-hidden rounded-2xl border ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'} shadow-sm`}>
              <div className={`flex items-center justify-between border-b px-4 py-4 ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Line Items</p>
                  <h4 className={`mt-1 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Product & Pricing Details</h4>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-white/5 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                  {printItems.length || items.length} item(s)
                </div>
              </div>
              <div
                className={`grid px-4 py-3 text-xs font-semibold uppercase tracking-wide
                  ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-50 text-gray-600'}`
                }
                style={{
                  gridTemplateColumns: documentType === 'quotation'
                    ? '44px 100px minmax(240px,1.8fr) 90px 120px 120px 130px 100px'
                    : documentType === 'purchase_order'
                      ? '44px 100px minmax(200px,1.5fr) 90px 120px 120px 120px 130px'
                      : '44px 100px minmax(260px,1.8fr) 90px 120px 120px 130px'
                }}
              >
                <div>Item</div>
                <div>Code</div>
                <div>Description</div>
                <div>Qty</div>
                {documentType === 'quotation' ?
                  <>
                    <div>Margin (%)</div>
                    <div>Unit Cost</div>
                  </>
                  : null
                }
                <div>{documentType === 'purchase_order' ? 'Cost Price' : 'Unit Price'}</div>
                <div>{documentType === 'purchase_order' ? 'Total Cost Price' : 'Line Total'}</div>
                {documentType === 'purchase_order' ? <div>Source QU</div> : null}
                <div></div>
              </div>
              {items.map((item, index) => (
                <div key={`document-item-${index}`}
                  className={`grid items-start gap-1 px-4 py-3
                  ${darkMode ? 'border-t border-gray-700 bg-gray-900' : 'border-t border-gray-200 bg-white'}`}
                  style={{
                    gridTemplateColumns: documentType === 'quotation'
                      ? '44px 100px minmax(240px,1.8fr) 90px 120px 120px 130px 100px'
                      : documentType === 'purchase_order'
                        ? '44px 100px minmax(200px,1.5fr) 90px 120px 120px 120px 130px'
                        : '44px 100px minmax(260px,1.8fr) 90px 120px 120px 130px'
                  }}
                >
                  <div className={`pt-2 text-sm font-semibold
                    ${darkMode ? 'text-white' : 'text-gray-900'}`}>{index + 1}
                  </div>
                  {isViewMode ? (
                    <input
                      readOnly
                      className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                      value={item.productCode || ''}
                    />
                  ) : (
                    <button type="button"
                      onClick={() => { setSelectedItemIndex(index); setProductModalOpen(true); }}
                      className={`rounded-lg border px-3 py-2 text-left text-xs font-medium 
                  ${darkMode ? 'border-blue-500/40 bg-blue-500/10 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                      {item.productCode || 'Select...'}
                    </button>
                  )}
                  <input className={`rounded-lg border border-gray-300 px-3 py-2 text-sm ${isViewMode ? 'bg-gray-100 text-gray-600' : 'bg-white text-black'}`}
                    readOnly={isViewMode}
                    value={isViewMode ? getProductDisplayName(item.productCode, item.productName) : item.productName}
                    placeholder="Description"
                    onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
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
                  {documentType === 'purchase_order' ? (
                    <div className={`rounded-lg border px-2 py-2 text-xs truncate
                      ${(item as any).sourceQuotationNumber
                        ? (darkMode ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700')
                        : (darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400')}`}
                      title={(item as any).sourceQuotationNumber || '-'}
                    >
                      {(item as any).sourceQuotationNumber || '-'}
                    </div>
                  ) : null}
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
                type="button"
                onClick={() => {
                  if (documentType === 'purchase_order' && poSplitItems.length > 0) {
                    setItems(poSplitItems);
                  }
                  setMode('edit');
                }}
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
        products={productSelectionOptions}
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