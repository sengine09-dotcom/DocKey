import React, { useEffect, useMemo, useState } from 'react';
import ProductSelectionModal from '../ProductSelectionModal';
import VendorPickerModal from '../VendorPickerModal';
import CustomerPickerModal from '../CustomerPickerModal';
import documentService, { MainDocumentType } from '../../services/documentService';
import codeService from '../../services/codeService';
import purchaseService from '../../services/purchaseService';
import { printDocumentContent } from '../../utils/printDocument';
import { showAppAlert, showAppConfirm } from '../../services/dialogService';
import { getQuotationStatusStyle } from '../../pages/documents/documentShared';
import DepositDeductionSummary from './DepositDeductionSummary';
import InvoiceSummary from './InvoiceSummary';
import { buildInvoicePrintHtml } from './InvoicePrintLayout';
import { bahttext } from 'bahttext';

const getTodayDateInputValue = () => new Date().toISOString().slice(0, 10);

const normalizeText = (value: any) => String(value || '').trim().toLowerCase();

const DOCUMENT_TYPE_LABELS: Record<MainDocumentType, string> = {
  quotation: 'Quotation',
  invoice: 'Invoice',
  receipt: 'Receipt',
  deposit_receipt: 'Deposit Receipt',
  deposit_invoice: 'Deposit Invoice',
  purchase_order: 'Purchase Order',
  work_order: 'Work Order',
  delivery_order: 'Delivery Order',
  customer_return: 'Customer Return',
};

const DOCUMENT_DEFAULT_STATUS: Record<MainDocumentType, string> = {
  quotation: 'Draft',
  invoice: 'Pending',
  receipt: 'Received',
  deposit_receipt: 'Received',
  deposit_invoice: 'Draft',
  purchase_order: 'Open',
  work_order: 'Open',
  delivery_order: 'Draft',
  customer_return: 'Draft',
};

const DOCUMENT_NUMBER_PREFIX: Record<MainDocumentType, string> = {
  quotation: 'QT',
  invoice: 'INV',
  receipt: 'RC',
  deposit_receipt: 'DR',
  deposit_invoice: 'DI',
  purchase_order: 'PO',
  work_order: 'WO',
  delivery_order: 'DO',
  customer_return: 'CR',
};

const QUOTATION_MARGIN_PRESETS = ['5%', '10%', '15%', '20%', '25%', '30%', '35%', '40%', '50%'];
const QUOTATION_STATUS_OPTIONS = [
  'Draft',
  'Pending Approval',
  'Approved',
  'Sent',
  'Confirmed',
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
const DELIVERY_ORDER_STATUS_OPTIONS = [
  'Draft',
  'Dispatched',
  'Delivered',
  'Cancelled',
];
const CUSTOMER_RETURN_STATUS_OPTIONS = [
  'Draft',
  'Received',
  'Processed',
  'Rejected',
];
const DEPOSIT_INVOICE_STATUS_OPTIONS = [
  'Draft',
  'Sent',
  'Awaiting_Verify',
  'Paid',
];
const DEPOSIT_RECEIPT_PAYMENT_TYPE_OPTIONS = [
  { value: 'partial', label: 'ชำระบางส่วน' },
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
    quantity: '1',
    margin: '',
    sellingPrice: '',
    totalCost: '',
    totalSellingPrice: '',
    unitCode: '',
    vendorCode: '',
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
  vendorQuotationNo: '',
  quotationNumber: '',
  quotationId: '',
  refDocNumber: '',
  scheduledDate: '',
  assignedTo: '',
  // deposit_invoice specific
  depositPercentage: '30',
  depositAmount: '0',
  balanceAmount: '0',
  linkedSOId: '',
  linkedSONumber: '',
  linkedDepositReceiptId: '',
  // receipt with deposit deduction
  linkedDepositReceiptNumber: '',
  depositAmountDeducted: '0',
  qtTotal: '0',
  dpNumber: '',
  balanceBase: '0',
  balanceVat: '0',
  // invoice tax fields
  customerTaxId: '',
  customerBranch: '',
  paymentStatus: 'PENDING',
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
      { key: 'vendorQuotationNo', label: 'เลขที่ Quotation (Vendor)', type: 'text' },
    ];
  }

  if (documentType === 'delivery_order') {
    return [
      { key: 'quotationNumber', label: 'Quotation Number', type: 'text' },
    ];
  }

  if (documentType === 'customer_return') {
    return [
      { key: 'refDocNumber', label: 'Reference Doc Number', type: 'text' },
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
  preloadedCustomers,
  preloadedVendors,
  preloadedPaymentTerms,
  preloadedQuotations,
  preloadedUnitCodes,
}: {
  darkMode: boolean;
  onNavigate?: (page: string, state?: unknown) => void;
  initialData?: any;
  documentType: MainDocumentType;
  suggestedDocumentNumber?: string;
  preloadedCustomers?: any[];
  preloadedVendors?: any[];
  preloadedPaymentTerms?: any[];
  preloadedQuotations?: any[];
  preloadedUnitCodes?: any[];
}) {
  const [mode, setMode] = useState('create');
  const [header, setHeader] = useState(getEmptyHeader(documentType));
  const [items, setItems] = useState([createEmptyItem()]);
  const [customerCodes, setCustomerCodes] = useState<any[]>([]);
  const [destinationCodes, setDestinationCodes] = useState<any[]>([]);
  const [paymentTermCodes, setPaymentTermCodes] = useState<any[]>([]);
  const [vendorCodes, setVendorCodes] = useState<any[]>([]);
  const [unitCodes, setUnitCodes] = useState<any[]>([]);
  const [productCodes, setProductCodes] = useState<any[]>([]);
  const [confirmedQuotationItems, setConfirmedQuotationItems] = useState<any[]>([]);
  const [approvedPRItems, setApprovedPRItems] = useState<any[]>([]);
  const [pendingPrConversions, setPendingPrConversions] = useState<Map<string, string[]>>(new Map());
  const [companyInfo, setCompanyInfo] = useState<any | null>(null);
  const [isLoadingCodes, setIsLoadingCodes] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  const buildConfirmedQuotationItems = (quotations: any[]) =>
    quotations
      .filter((q: any) => normalizeText(q?.status) === 'confirmed' && Array.isArray(q?.items) && q.items.length > 0)
      .flatMap((q: any, qi: number) => q.items.map((item: any, ii: number) => ({
        id: item?.id || `${q?.documentId || q?.id || qi}-${ii}`,
        productCode: item?.productCode || '',
        productName: item?.productName || '',
        cost: item?.cost ?? '',
        sellingPrice: item?.sellingPrice ?? '',
        quantity: item?.quantity ?? '',
        totalCost: item?.totalCost ?? '',
        totalSellingPrice: item?.totalSellingPrice ?? '',
        sourceType: 'quotation',
        sourceLabel: q?.documentNumber ? `Quotation ${q.documentNumber}` : 'Confirmed Quotation',
        sourceDocumentNumber: q?.documentNumber || '',
        sourceDocumentId: q?.documentId || q?.id || '',
        sourceCustomer: q?.customerName || q?.customer || '',
      })));

  useEffect(() => {
    if (preloadedCustomers?.length) setCustomerCodes(preloadedCustomers);
    if (preloadedVendors?.length) setVendorCodes(preloadedVendors);
    if (preloadedPaymentTerms?.length) setPaymentTermCodes(preloadedPaymentTerms);
    if (preloadedQuotations?.length) setConfirmedQuotationItems(buildConfirmedQuotationItems(preloadedQuotations));
    if (preloadedUnitCodes?.length) setUnitCodes(preloadedUnitCodes);

    const loadCodeOptions = async () => {
      setIsLoadingCodes(true);
      try {
        const needsQuotation = documentType === 'purchase_order' && !preloadedQuotations;
        const [
          customerResponse,
          destinationResponse,
          paymentTermResponse,
          vendorResponse,
          unitCodeResponse,
          productResponse,
          companyResponse,
          quotationResponse,
          prResponse,
        ] = await Promise.all([
          preloadedCustomers?.length ? Promise.resolve(null) : codeService.getAll('customer'),
          codeService.getAll('destination'),
          preloadedPaymentTerms?.length ? Promise.resolve(null) : codeService.getAll('payment-term'),
          preloadedVendors?.length ? Promise.resolve(null) : codeService.getAll('vendor'),
          preloadedUnitCodes?.length ? Promise.resolve(null) : codeService.getAll('unit-code'),
          codeService.getAll('product'),
          codeService.getAll('company'),
          needsQuotation ? documentService.getAll('quotation') : Promise.resolve(null),
          documentType === 'purchase_order' ? purchaseService.pr.getAll() : Promise.resolve(null),
        ]);

        if (customerResponse) setCustomerCodes(customerResponse.data.data || []);
        setDestinationCodes(destinationResponse.data.data || []);
        if (paymentTermResponse) setPaymentTermCodes(paymentTermResponse.data.data || []);
        if (vendorResponse) setVendorCodes(vendorResponse.data.data || []);
        if (unitCodeResponse) setUnitCodes(unitCodeResponse.data.data || []);
        setProductCodes(productResponse.data.data || []);
        setCompanyInfo((companyResponse.data.data || []).find((c: any) => c?.isActive !== false) || companyResponse.data.data?.[0] || null);
        if (quotationResponse) setConfirmedQuotationItems(buildConfirmedQuotationItems(quotationResponse.data.data || []));
        setApprovedPRItems(
          (prResponse?.data?.data || [])
            .filter((pr: any) => pr?.status === 'APPROVED' && Array.isArray(pr?.items) && pr.items.length > 0)
            .flatMap((pr: any) => pr.items
              .filter((item: any) => !item?.convertedToPo)
              .map((item: any) => ({
                prItemId: item?.id || '',
                productCode: item?.productCode || '',
                productName: item?.description || item?.productCode || '',
                cost: item?.estimatedPrice != null ? String(item.estimatedPrice) : '',
                sellingPrice: item?.estimatedPrice != null ? String(item.estimatedPrice) : '',
                quantity: item?.qty != null ? String(item.qty) : '',
                unit: item?.unit || '',
                sourceType: 'pr',
                sourceLabel: `PR: ${pr.prNumber}`,
                sourceDocumentNumber: pr.prNumber || '',
                sourceDocumentId: pr.id || '',
              })),
            ),
        );
        setCodeError(null);
      } catch (_error) {
        setCodeError('Failed to load code lists');
      } finally {
        setIsLoadingCodes(false);
      }
    };

    void loadCodeOptions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (productCodes.length === 0) return;
    setItems((prev) => prev.map((item) => {
      if (!item.productCode) return item;
      if (item.productName && item.unitCode) return item;
      const matchedProduct = productCodes.find((product) => {
        const productCode = String(product.productCode || product.productId || product.id || '').trim();
        return productCode === String(item.productCode || '').trim();
      });
      if (!matchedProduct) return item;
      return {
        ...item,
        productName: item.productName || matchedProduct.productName || '',
        unitCode: item.unitCode || matchedProduct.unitCode || '',
      };
    }));
  }, [productCodes]);

  const productSelectionOptions = useMemo(() => {
    if (documentType !== 'purchase_order') {
      return productCodes;
    }

    return [
      ...approvedPRItems,
      ...confirmedQuotationItems,
      ...productCodes.map((product) => ({
        ...product,
        sourceType: 'product',
        sourceLabel: 'Product Master',
      })),
    ];
  }, [approvedPRItems, confirmedQuotationItems, documentType, productCodes]);

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
      margin: String(initialData.margin ?? getEmptyHeader(documentType).margin),
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
      vendorQuotationNo: initialData.vendorQuotationNo || '',
      quotationNumber: initialData.quotationNumber || '',
      quotationId: initialData.quotationId || '',
      refDocNumber: initialData.refDocNumber || '',
      scheduledDate: initialData.scheduledDate ? String(initialData.scheduledDate).slice(0, 10) : '',
      assignedTo: initialData.assignedTo || '',
      // deposit_invoice specific
      depositPercentage: String(initialData.depositPercentage ?? '30'),
      depositAmount: String(initialData.depositAmount ?? '0'),
      balanceAmount: String(initialData.balanceAmount ?? '0'),
      linkedSOId: initialData.linkedSOId || '',
      linkedSONumber: initialData.linkedSONumber || '',
      linkedDepositReceiptId: initialData.linkedDepositReceiptId || '',
      // receipt with deposit deduction
      linkedDepositReceiptNumber: initialData.linkedDepositReceiptNumber || '',
      depositAmountDeducted: String(initialData.depositAmountDeducted ?? '0'),
      qtTotal: String(initialData.qtTotal ?? '0'),
      dpNumber: initialData.dpNumber || '',
      balanceBase: String(initialData.balanceBase ?? '0'),
      balanceVat: String(initialData.balanceVat ?? '0'),
      customerTaxId: initialData.customerTaxId || '',
      customerBranch: initialData.customerBranch || '',
      paymentStatus: initialData.paymentStatus || 'PENDING',
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
        unitCode: item.unitCode || item.unitID || '',
        vendorCode: item.vendorCode || '',
      })));
    } else {
      setItems([createEmptyItem()]);
    }
  }, [documentType, initialData, suggestedDocumentNumber]);

  const isViewMode = mode === 'view';
  const isReceiptLocked   = documentType === 'receipt';
  const isPendingApproval = documentType === 'quotation' && header.status === 'Pending Approval';
  const isApprovedStatus  = documentType === 'quotation' && header.status === 'Approved';
  const isSentStatus      = documentType === 'quotation' && header.status === 'Sent';
  const isConfirmedStatus = documentType === 'quotation' && header.status === 'Confirmed';
  const isItemLocked      = isApprovedStatus || isSentStatus || isConfirmedStatus || documentType === 'deposit_invoice' || documentType === 'deposit_receipt' || isReceiptLocked;
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

  const getVendorsForItem = (productCode: string) => {
    const product = productCodes.find((p) =>
      String(p.productCode || p.productId || p.id || '').trim() === String(productCode || '').trim()
    );
    if (!product) return vendorCodes;
    const cat = String(product.category || product.type || '').trim();
    const brand = String(product.brand || product.marking || '').trim();
    if (!cat && !brand) return vendorCodes;
    const filtered = vendorCodes.filter((v) => {
      const vCats: string[] = Array.isArray(v.categories) ? v.categories : [];
      const vBrands: string[] = Array.isArray(v.brands) ? v.brands : [];
      return (cat && vCats.includes(cat)) || (brand && vBrands.includes(brand));
    });
    return filtered.length > 0 ? filtered : vendorCodes;
  };

  const customerDisplay = (() => {
    const customerCode = String(header.customer || '').trim();
    if (!customerCode) return '';
    const selectedCustomer = customerCodes.find((customer) => customer.customerCode === customerCode);
    if (!selectedCustomer) return customerCode;
    return selectedCustomer.customerName || selectedCustomer.shortName || selectedCustomer.customerCode || customerCode;
  })();

  const customerAddress = (() => {
    const customerCode = String(header.customer || '').trim();
    if (!customerCode) return '';
    const selectedCustomer = customerCodes.find((customer) => customer.customerCode === customerCode);
    return selectedCustomer?.address || '';
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

      if (documentType === 'quotation' && field === 'customer') {
        const selectedCustomer = customerCodes.find((c) => c.customerCode === value);
        const autoTerm = selectedCustomer?.idTerm || '';
        const termExists = autoTerm && paymentTermCodes.some((t) => t.termId === autoTerm);
        return {
          ...prev,
          customer: value,
          paymentTerm: termExists ? autoTerm : prev.paymentTerm,
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

    if (documentType === 'quotation' && field === 'margin' && !isItemLocked) {
      setItems((prev) =>
        prev.map((item) => {
          if (!item.cost && !item.sellingPrice) return item;
          const newSellingPrice = calculateQuotationSalePrice(item.cost, value);
          return {
            ...item,
            margin: value,
            sellingPrice: newSellingPrice,
            totalSellingPrice: calculateLineTotal(item.quantity, newSellingPrice),
          };
        }),
      );
    }
  };

  useEffect(() => {
    if (documentType !== 'deposit_receipt') return;
    if (isViewMode) return;

    const nextPaymentAmount = total.toFixed(2);
    setHeader((prev) => {
      if (String(prev.paymentType || '').trim().toLowerCase() !== 'full') return prev;
      if (String(prev.paymentAmount || '') === nextPaymentAmount) return prev;
      return { ...prev, paymentAmount: nextPaymentAmount };
    });
  }, [documentType, isViewMode, total]);

  // Keep depositAmount in sync with live item totals for deposit_invoice
  useEffect(() => {
    if (documentType !== 'deposit_invoice') return;
    if (isViewMode) return;
    const pct = Number(header.depositPercentage || 30);
    const qtTotal = totalSellingPrice + tax;
    const depositAmt = Math.round(qtTotal * pct / 100 * 100) / 100;
    const balanceAmt = Math.round((qtTotal - depositAmt) * 100) / 100;
    const next = depositAmt.toFixed(2);
    if (String(header.depositAmount || '') === next) return;
    setHeader((prev: any) => ({
      ...prev,
      depositAmount: next,
      balanceAmount: balanceAmt.toFixed(2),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentType, isViewMode, totalSellingPrice, tax, header.depositPercentage]);

  // Auto-calculate dueDate when paymentTerm or documentDate changes (invoice only)
  useEffect(() => {
    if (documentType !== 'invoice') return;
    if (isViewMode) return;
    const termCode = String((header as any).paymentTerm || '').trim();
    if (!termCode) return;
    const matched = paymentTermCodes.find(
      (t: any) => String(t.termId || '').trim() === termCode,
    );
    const days = parseInt(matched?.days || '0', 10);
    if (!days) return;
    if (!(header as any).documentDate) return;
    const base = (header as any).documentDate
      ? new Date((header as any).documentDate)
      : new Date();
    base.setDate(base.getDate() + days);
    const computed = base.toISOString().slice(0, 10);
    if ((header as any).dueDate !== computed) {
      setHeader((h: any) => ({ ...h, dueDate: computed }));
    }
  }, [(header as any).paymentTerm, (header as any).documentDate, paymentTermCodes]);

  const handleRoundSellingPrice = (index: number, direction: 'up' | 'down') => {
    if (isViewMode || isItemLocked) return;
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index] };
      const raw = parseNumberInput(item.sellingPrice);
      if (!raw) return prev;
      const isInteger = Number.isInteger(raw);
      const newSalePrice = direction === 'up'
        ? (isInteger ? raw + 1 : Math.ceil(raw))
        : (isInteger ? Math.max(0, raw - 1) : Math.floor(raw));
      const newSalePriceStr = String(newSalePrice);
      next[index] = {
        ...item,
        sellingPrice: newSalePriceStr,
        totalSellingPrice: calculateLineTotal(item.quantity, newSalePriceStr) || String(newSalePrice),
      };
      return next;
    });
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    if (isViewMode) return;
    setItems((prev) => {
      const next = [...prev];
      const updated = { ...next[index], [field]: value };
      if (documentType === 'quotation') {
        if (field === 'cost' || field === 'margin') {
          if (!isItemLocked) {
            updated.sellingPrice = calculateQuotationSalePrice(updated.cost, updated.margin);
          }
          updated.totalCost = calculateLineTotal(updated.quantity, updated.cost);
          updated.totalSellingPrice = calculateLineTotal(updated.quantity, updated.sellingPrice);
        } else if (field === 'quantity' || field === 'sellingPrice') {
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

    const srcType = normalizeText(product?.sourceType);
    const isPRSource = documentType === 'purchase_order' && srcType === 'pr';

    if (isPRSource && product.sourceDocumentId && product.prItemId) {
      setPendingPrConversions((prev) => {
        const next = new Map(prev);
        const existing = next.get(String(product.sourceDocumentId)) || [];
        if (!existing.includes(String(product.prItemId))) {
          next.set(String(product.sourceDocumentId), [...existing, String(product.prItemId)]);
        }
        return next;
      });
    }

    setItems((prev) => {
      const next = [...prev];
      const isQuotationSource = documentType === 'purchase_order' && normalizeText(product?.sourceType) === 'quotation';
      const isDocumentSource = isPRSource || isQuotationSource;

      const nextQuantity = isDocumentSource
        ? String(product.quantity ?? next[selectedItemIndex].quantity ?? '')
        : next[selectedItemIndex].quantity;

      const nextCost = product.cost == null || product.cost === '' ? '' : Number(product.cost).toFixed(2);

      const nextUnitPrice = isDocumentSource
        ? (product.cost == null || product.cost === '' ? '' : Number(product.cost).toFixed(2))
        : next[selectedItemIndex].sellingPrice;

      next[selectedItemIndex] = {
        ...next[selectedItemIndex],
        id: product.id || next[selectedItemIndex].id,
        productCode: product.productCode || '',
        productName: product.productName || '',
        unitCode: product.unitCode || next[selectedItemIndex].unitCode || '',
        quantity: nextQuantity,
        margin: header.margin,
        cost: nextCost,
        sellingPrice: documentType === 'quotation'
          ? calculateQuotationSalePrice(nextCost, header.margin)
          : nextUnitPrice,
      };

      if (documentType === 'quotation') {
        next[selectedItemIndex].totalSellingPrice = calculateLineTotal(next[selectedItemIndex].quantity, next[selectedItemIndex].sellingPrice);
      } else if (documentType === 'purchase_order' && isDocumentSource) {
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
                    <div class="quotation-docbox-label">Valid Until</div>
                    <div class="quotation-docbox-value">${escapeHtml((header as any).dueDate ? formatPrintDate((header as any).dueDate) : '-')}</div>
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
                    <div class="quotation-info-label">Payment Term</div>
                    <div class="quotation-info-value">${escapeHtml(paymentTermDisplay || '-')}</div>
                    <div class="quotation-info-label">Payment Method</div>
                    <div class="quotation-info-value">${escapeHtml(header.paymentMethod || '-')}</div>
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

    // For deposit_invoice, override total/tax with deposit-only amounts.
    // depositAmount is VAT-inclusive (pct × grand total), so extract VAT from it.
    let finalTotal = total;
    let finalTax = tax;
    if (documentType === 'deposit_invoice') {
      const depositAmt = parseFloat(header.depositAmount) || 0;
      finalTotal = depositAmt;
      finalTax = depositAmt * taxRate / (100 + taxRate);
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
        total: finalTotal,
        tax: finalTax,
        totalQuantity,
        margin: documentType === 'quotation' ? parseNumberInput(header.margin).toFixed(2) : header.margin,
        taxRate,
      },
      items: validItems,
    };

    try {
      const response = await documentService.save(documentType, payload);
      const savedRecord = response?.data?.data || payload.header;

      if (documentType === 'purchase_order' && pendingPrConversions.size > 0) {
        const savedPoNumber = savedRecord.documentNumber || '';
        if (savedPoNumber) {
          await Promise.allSettled(
            [...pendingPrConversions.entries()].map(([prId, itemIds]) =>
              purchaseService.pr.markItemsConverted(prId, { itemIds, poNumber: savedPoNumber })
            )
          );
        }
        setPendingPrConversions(new Map());
      }

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

  const handleDeleteDocument = async () => {
    const docId = header.id || (initialData as any)?.documentId;
    if (!docId) return;
    const confirmed = await showAppConfirm({
      title: 'ลบเอกสาร',
      message: `ยืนยันการลบเอกสาร ${header.documentNumber || typeLabel}? การดำเนินการนี้ไม่สามารถกู้คืนได้`,
      confirmText: 'ลบ',
      cancelText: 'ยกเลิก',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await documentService.delete(documentType, docId);
      onNavigate('documents', { selectedType: documentType });
    } catch (error: any) {
      await showAppAlert({ title: 'ลบไม่สำเร็จ', message: error?.response?.data?.message || `ไม่สามารถลบเอกสารนี้ได้`, tone: 'danger' });
    }
  };

  return (
    <>
      <div className={`rounded-2xl border shadow-sm ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className={`rounded-t-2xl border-b px-6 py-4 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${
                documentType === 'quotation' ? (darkMode ? 'text-blue-300' : 'text-blue-700')
                : documentType === 'purchase_order' ? (darkMode ? 'text-orange-300' : 'text-orange-600')
                : (darkMode ? 'text-gray-400' : 'text-gray-500')
              }`}>
                {documentType === 'quotation' ? 'Sales Quotation'
                  : documentType === 'purchase_order' ? 'Purchase Order'
                  : 'All Document Form'}
              </p>
              <h3 className={`mt-1 text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {documentType === 'quotation' ? 'Quotation Details'
                  : documentType === 'purchase_order' ? (mode === 'edit' ? `แก้ไข ${header.documentNumber || ''}` : 'สร้างใบสั่งซื้อ')
                  : `${typeLabel} Details`}
              </h3>
              <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {documentType === 'quotation'
                  ? 'เอกสารเสนอราคาแบบมืออาชีพสำหรับตรวจสอบรายละเอียดลูกค้า ราคา และเงื่อนไขการขาย'
                  : documentType === 'purchase_order'
                  ? 'กรอกรายละเอียดให้ครบก่อนบันทึกและส่งใบสั่งซื้อให้ Supplier'
                  : 'จัดการข้อมูลเอกสารรวมโดยแยกประเภทด้วย DocumentType'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {isViewMode && documentType === 'quotation' && (
                <button
                  type="button"
                  disabled={!isConfirmedStatus}
                  onClick={() => onNavigate('so', { fromQuotation: { ...header, items } })}
                  className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${isConfirmedStatus ? (darkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white') : (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}`}>
                  🛒 สร้างใบสั่งขาย
                </button>
              )}
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isViewMode ? (darkMode ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-100 text-blue-700') : (darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-700')}`}>
                {isViewMode ? 'View Mode' : mode === 'edit' ? 'Edit Mode' : 'Create Mode'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          {codeError ? <div className={`rounded-xl border px-4 py-3 text-sm ${darkMode ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>{codeError}</div> : null}

          {isPendingApproval && !isViewMode && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
              <span className="text-lg">🔐</span>
              <div>
                <strong>รอการอนุมัติ (Pending Approval)</strong>
                <span className="ml-2">— กำหนด Margin%, ปัดราคาให้สวยงาม แล้วเปลี่ยนสถานะเป็น <strong>Approved</strong></span>
              </div>
            </div>
          )}
          {isApprovedStatus && !isViewMode && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <span className="text-lg">✅</span>
              <span><strong>Approved</strong> — ราคาขายถูกล็อกแล้ว สามารถเปลี่ยนสถานะเป็น <strong>Sent</strong> เพื่อส่งให้ลูกค้าได้</span>
            </div>
          )}
          <fieldset disabled={isViewMode || isReceiptLocked} className={`min-w-0 w-full ${(isViewMode || isReceiptLocked) ? 'opacity-95' : ''}`}>
            {documentType === 'quotation' ? (
              <div className={`overflow-hidden rounded-2xl border mb-6 ${darkMode ? 'border-blue-500/30 bg-gradient-to-r from-slate-900 via-blue-950/70 to-slate-900' : 'border-blue-200 bg-gradient-to-r from-blue-50 via-white to-indigo-50'}`}>
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
                      <span className="rounded-full px-3 py-1 text-xs font-semibold" style={getQuotationStatusStyle(header.status || 'Draft')}>
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
            ) : documentType === 'purchase_order' ? (
              <div className={`overflow-hidden rounded-2xl border mb-6 ${darkMode ? 'border-orange-500/30 bg-gradient-to-r from-slate-900 via-orange-950/40 to-slate-900' : 'border-orange-200 bg-gradient-to-r from-orange-50 via-white to-amber-50'}`}>
                <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>PO Overview</p>
                    <div>
                      <h4 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>PURCHASE ORDER</h4>
                      <p className={`mt-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>กรอกรายละเอียดให้ครบก่อนบันทึกและส่งใบสั่งซื้อให้ Supplier</p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-white/10 text-white' : 'bg-white text-orange-700 border border-orange-200'}`}>
                        {mode === 'edit' ? `Doc: ${header.documentNumber || ''}` : 'New PO — Auto Number'}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-gray-500/15 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                        Status: {header.status || 'Open'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:min-w-[280px]">
                    <div className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                      <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-200' : 'text-orange-700'}`}>Vendor</p>
                      <p className={`mt-2 text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{partyDisplay || '-'}</p>
                    </div>
                    <div className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                      <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-200' : 'text-orange-700'}`}>Delivery Date</p>
                      <p className={`mt-2 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {header.deliveryDate ? new Date(header.deliveryDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                      </p>
                    </div>
                    <div className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                      <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-200' : 'text-orange-700'}`}>รายการ</p>
                      <p className={`mt-2 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{items.length} รายการ</p>
                    </div>
                    <div className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-orange-500/30 bg-orange-950/40' : 'border-orange-200 bg-orange-50'}`}>
                      <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>Grand Total</p>
                      <p className={`mt-2 text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>฿{formatDisplayAmount(total)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {isViewMode && documentType === 'quotation' ? (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className={`rounded-2xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-900/80' : 'border-gray-200 bg-white'} shadow-sm`}>
                    <p className={`mb-4 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Document Info</p>
                    <dl className="space-y-3">
                      {[
                        { label: 'Date',         value: formatPrintDate(header.documentDate) || '-' },
                        { label: 'Payment Term', value: paymentTermDisplay || '-' },
                        { label: 'Tax Rate',     value: `${header.taxRate || '0'}%` },
                        { label: 'Margin',       value: `${(header as any).margin || '0'}%` },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between text-sm">
                          <dt className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</dt>
                          <dd className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</dd>
                        </div>
                      ))}
                      <div className="flex items-center justify-between text-sm">
                        <dt className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status</dt>
                        <dd><span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={getQuotationStatusStyle(header.status || 'Draft')}>{header.status || 'Draft'}</span></dd>
                      </div>
                    </dl>
                  </div>
                  <div className={`rounded-2xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-900/80' : 'border-gray-200 bg-white'} shadow-sm`}>
                    <p className={`mb-4 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Customer</p>
                    <dl className="space-y-3">
                      {[
                        { label: 'Customer', value: customerDisplay || '-' },
                        { label: 'Address',  value: customerAddress || '-' },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-start justify-between gap-4 text-sm">
                          <dt className={`shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</dt>
                          <dd className={`text-right font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
                {header.remark && (
                  <div className={`rounded-2xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-900/80' : 'border-gray-200 bg-white'} shadow-sm`}>
                    <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Remark / Notes</p>
                    <p className={`whitespace-pre-wrap text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{header.remark}</p>
                  </div>
                )}
              </div>
            ) : isViewMode && (documentType === 'invoice' || documentType === 'deposit_invoice' || documentType === 'deposit_receipt' || documentType === 'receipt') ? (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Card 1: Document Info */}
                  <div className={`rounded-2xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-900/80' : 'border-gray-200 bg-white'} shadow-sm`}>
                    <p className={`mb-4 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>ข้อมูลเอกสาร</p>
                    <dl className="space-y-3">
                      {([
                        { label: 'เลขที่เอกสาร', value: header.documentNumber || '-' },
                        { label: 'วันที่', value: formatPrintDate(header.documentDate) || '-' },
                        { label: 'สถานะ', value: header.status || '-' },
                        ...(documentType === 'invoice' || documentType === 'deposit_invoice' ? [
                          { label: 'Tax Rate', value: `${header.taxRate || '7'}%` },
                        ] : []),
                        ...(documentType === 'invoice' ? [
                          { label: 'Due Date', value: formatPrintDate((header as any).dueDate) || '-' },
                          { label: 'DO No', value: (header as any).doNo || '-' },
                        ] : []),
                        ...(documentType === 'deposit_invoice' ? [
                          { label: 'อ้างอิง SO', value: (header as any).linkedSONumber || '-' },
                        ] : []),
                        ...(documentType === 'receipt' || documentType === 'deposit_receipt' ? [
                          { label: 'Received Date', value: formatPrintDate((header as any).receivedDate) || '-' },
                          { label: 'Payment Reference', value: (header as any).paymentReference || '-' },
                        ] : []),
                        ...(documentType === 'deposit_receipt' ? [
                          { label: 'Payment Amount', value: `฿${formatDisplayAmount(parseFloat((header as any).paymentAmount) || 0)}` },
                          { label: 'Payment Type', value: (header as any).paymentType || '-' },
                        ] : []),
                        ...(documentType === 'receipt' ? [
                          { label: 'อ้างอิงใบรับมัดจำ', value: (header as any).linkedDepositReceiptNumber || '-' },
                        ] : []),
                        ...(header.title ? [{ label: 'Title', value: header.title }] : []),
                      ] as { label: string; value: string }[]).map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between text-sm">
                          <dt className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</dt>
                          <dd className={`font-medium text-right ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  {/* Card 2: Customer Info */}
                  <div className={`rounded-2xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-900/80' : 'border-gray-200 bg-white'} shadow-sm`}>
                    <p className={`mb-4 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>ข้อมูลลูกค้า</p>
                    <dl className="space-y-3">
                      {([
                        { label: 'ลูกค้า', value: customerDisplay || header.customer || '-' },
                        { label: 'Bill To', value: header.billTo || '-' },
                        ...(header.shipTo && header.shipTo !== header.billTo ? [{ label: 'Ship To', value: header.shipTo }] : []),
                        { label: 'เงื่อนไขชำระ', value: paymentTermDisplay || '-' },
                        ...(documentType === 'invoice' ? [
                          { label: 'เลขผู้เสียภาษี', value: (header as any).customerTaxId || '-' },
                          { label: 'สาขา', value: (header as any).customerBranch || 'สำนักงานใหญ่' },
                        ] : []),
                      ] as { label: string; value: string }[]).map(({ label, value }) => (
                        <div key={label} className="flex items-start justify-between gap-4 text-sm">
                          <dt className={`shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</dt>
                          <dd className={`text-right font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
                {/* Card 3: Invoice payment status */}
                {documentType === 'invoice' && (() => {
                  const ps = (header as any).paymentStatus || 'PENDING';
                  const badge = ps === 'PAID'
                    ? { label: 'ชำระแล้ว', cls: darkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700' }
                    : ps === 'OVERDUE'
                    ? { label: 'เกินกำหนด', cls: darkMode ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-700' }
                    : { label: 'รอชำระ', cls: darkMode ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700' };
                  return (
                    <div className={`rounded-2xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-900/80' : 'border-gray-200 bg-white'} shadow-sm`}>
                      <p className={`mb-4 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>สถานะชำระเงิน</p>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
                        {ps !== 'PAID' && ((header as any).documentId || (header as any).id) && (
                          <button type="button"
                            onClick={async () => {
                              if (!window.confirm('ยืนยันการชำระเงิน?')) return;
                              const docId = (header as any).documentId || (header as any).id;
                              const res = await fetch(`/api/documents/${docId}/mark-paid`, { method: 'PATCH' });
                              if (!res.ok) { alert('ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่'); return; }
                              setHeader((h: any) => ({ ...h, paymentStatus: 'PAID' }));
                            }}
                            className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-green-700">
                            Mark Paid
                          </button>
                        )}
                        {(header as any).linkedSONumber && (
                          <span className={`ml-auto text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            SO: <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{(header as any).linkedSONumber}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
                {/* Card 3: Deposit Invoice — deposit details */}
                {documentType === 'deposit_invoice' && (() => {
                  const pct = Number((header as any).depositPercentage) || 30;
                  const qtTotal = totalSellingPrice + tax;
                  const depositAmt = Math.round(qtTotal * pct / 100 * 100) / 100;
                  const balanceAmt = Math.round((qtTotal - depositAmt) * 100) / 100;
                  return (
                    <div className={`rounded-2xl border p-5 ${darkMode ? 'border-teal-700/60 bg-gray-900/80' : 'border-teal-200 bg-teal-50/40'} shadow-sm`}>
                      <p className={`mb-4 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>ข้อมูลมัดจำ</p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>มัดจำ (%)</p>
                          <p className={`mt-1 font-bold ${darkMode ? 'text-teal-300' : 'text-teal-700'}`}>{pct}%</p>
                        </div>
                        <div>
                          <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>ยอดมัดจำ</p>
                          <p className={`mt-1 font-bold ${darkMode ? 'text-teal-300' : 'text-teal-700'}`}>฿{formatDisplayAmount(depositAmt)}</p>
                        </div>
                        <div>
                          <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>ยอดคงเหลือ</p>
                          <p className={`mt-1 font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>฿{formatDisplayAmount(balanceAmt)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {/* Remark */}
                {header.remark && (
                  <div className={`rounded-2xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-900/80' : 'border-gray-200 bg-white'} shadow-sm`}>
                    <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Remark / Notes</p>
                    <p className={`whitespace-pre-wrap text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{header.remark}</p>
                  </div>
                )}
              </div>
            ) : (<>
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
                    readOnly={isItemLocked}
                    className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm ${isItemLocked ? 'bg-gray-100 text-gray-500' : 'bg-white text-black'}`}
                    value={header.documentDate} onChange={(e) => handleHeaderChange('documentDate', e.target.value)} />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Title
                  </span>
                  <input
                    readOnly={isItemLocked}
                    className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm ${isItemLocked ? 'bg-gray-100 text-gray-500' : 'bg-white text-black'}`}
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
                      <div className="flex gap-2">
                        <div className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 min-h-[38px] flex items-center">
                          {header.vendorCode ? (
                            <span>
                              <span className="font-semibold text-blue-700">{header.vendorCode}</span>
                              {' — '}
                              <span>{vendorCodes.find(v => v.vendorCode === header.vendorCode)?.name || header.vendorCode}</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">{isLoadingCodes ? 'Loading vendors...' : 'Select vendor code'}</span>
                          )}
                        </div>
                        <button type="button" onClick={() => setVendorModalOpen(true)}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
                          title="เลือก Vendor">
                          ...
                        </button>
                      </div>
                    )
                  ) : (isViewMode || isItemLocked) ? (
                    <input
                      readOnly
                      className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                      value={customerDisplay || header.customer || ''}
                    />
                  ) : (
                    <div className="flex gap-2">
                      <div className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 min-h-[38px] flex items-center">
                        {header.customer ? (
                          <span>
                            <span className="font-semibold text-blue-700">{header.customer}</span>
                            {' — '}
                            <span>{customerDisplay || header.customer}</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">{isLoadingCodes ? 'กำลังโหลดลูกค้า...' : 'เลือกลูกค้า'}</span>
                        )}
                      </div>
                      <button type="button" onClick={() => setCustomerModalOpen(true)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
                        title="เลือกลูกค้า">
                        ...
                      </button>
                    </div>
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
                  ) : documentType === 'delivery_order' ? (
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                      value={header.status}
                      onChange={(e) => handleHeaderChange('status', e.target.value)}
                    >
                      {DELIVERY_ORDER_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : documentType === 'customer_return' ? (
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                      value={header.status}
                      onChange={(e) => handleHeaderChange('status', e.target.value)}
                    >
                      {CUSTOMER_RETURN_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : documentType === 'deposit_invoice' ? (
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                      value={header.status}
                      onChange={(e) => handleHeaderChange('status', e.target.value)}
                    >
                      {DEPOSIT_INVOICE_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
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
                    readOnly={isItemLocked}
                    className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm ${isItemLocked ? 'bg-gray-100 text-gray-500' : 'bg-white text-black'}`}
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
                  <select
                    disabled={isItemLocked}
                    className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm ${isItemLocked ? 'bg-gray-100 text-gray-500' : 'bg-white text-black'}`}
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
              {subtypeFields
                .filter((field) => !(field.key === 'supplierName' && documentType === 'purchase_order'))
                .map((field) => (
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
                        readOnly={isItemLocked}
                        className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm ${isItemLocked ? 'bg-gray-100 text-gray-500' : 'bg-white text-black'}`}
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
                  ) : field.key === 'paymentAmount' && documentType === 'deposit_receipt' ? (
                    <p className={`rounded-lg border px-3 py-2 text-sm font-semibold ${darkMode ? 'border-gray-600 bg-gray-800 text-cyan-300' : 'border-gray-200 bg-gray-50 text-cyan-700'}`}>
                      ฿{formatDisplayAmount(parseFloat(header.paymentAmount) || 0)}
                    </p>
                  ) : field.key === 'paymentType' && documentType === 'deposit_receipt' ? (
                    <p className={`rounded-lg border px-3 py-2 text-sm font-medium ${darkMode ? 'border-gray-600 bg-gray-800 text-gray-200' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                      {DEPOSIT_RECEIPT_PAYMENT_TYPE_OPTIONS.find(o => o.value === header.paymentType)?.label || header.paymentType}
                    </p>
                  ) : field.key === 'vendorCode' && documentType === 'purchase_order' ? (
                    <div className="pt-1">
                      {header.vendorCode ? (
                        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          <span className={`${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{header.vendorCode}</span>
                          {'   '}
                          {vendorCodes.find(v => v.vendorCode === header.vendorCode)?.name || ''}
                        </p>
                      ) : (
                        <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>ยังไม่ได้เลือก Vendor</p>
                      )}
                    </div>
                  ) : (
                    <input
                      type={field.type}
                      readOnly={isItemLocked}
                      className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm ${isItemLocked ? 'bg-gray-100 text-gray-500' : 'bg-white text-black'}`}
                      value={(header as any)[field.key]}
                      onChange={(e) => handleHeaderChange(field.key, e.target.value)}
                    />
                  )}
                </label>
              ))}
              </div>
              {documentType === 'invoice' && (header as any).customerTaxId && (
                <div className={`mt-3 flex items-center gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span className="font-medium">เลขผู้เสียภาษี:</span>
                  <span className="font-mono">{(header as any).customerTaxId}</span>
                  {(header as any).customerBranch && (
                    <>
                      <span className="mx-1">·</span>
                      <span>{(header as any).customerBranch}</span>
                    </>
                  )}
                </div>
              )}
              {documentType === 'invoice' && (() => {
                const ps = (header as any).paymentStatus || 'PENDING';
                const badge =
                  ps === 'PAID'
                    ? { label: 'ชำระแล้ว', cls: darkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700' }
                    : ps === 'OVERDUE'
                    ? { label: 'เกินกำหนด', cls: darkMode ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-700' }
                    : { label: 'รอชำระ', cls: darkMode ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700' };
                return (
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {ps !== 'PAID' && ((header as any).documentId || (header as any).id) && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm('ยืนยันการชำระเงิน?')) return;
                          const docId = (header as any).documentId || (header as any).id;
                          const res = await fetch(`/api/documents/${docId}/mark-paid`, { method: 'PATCH' });
                          if (!res.ok) {
                            alert('ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่');
                            return;
                          }
                          setHeader((h: any) => ({ ...h, paymentStatus: 'PAID' }));
                        }}
                        className={`text-xs rounded-lg px-2 py-0.5 font-semibold transition ${darkMode ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {documentType === 'deposit_invoice' && (
              <div className={`mt-6 rounded-2xl border p-5 ${darkMode ? 'border-teal-700/60 bg-gray-900/80' : 'border-teal-200 bg-teal-50/40'} shadow-sm`}>
                <div className="mb-4">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>ข้อมูลมัดจำ</p>
                  <h4 className={`mt-1 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Deposit Invoice Details</h4>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 mb-4">
                  {Array.isArray(initialData?.__confirmedSOs) && (initialData.__confirmedSOs as any[]).length > 1 && (
                    <label className="block space-y-1.5">
                      <span className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        เลือกใบสั่งขาย (SO) <span className="text-red-500">*</span>
                      </span>
                      <select
                        value={(header as any).linkedSOId || ''}
                        onChange={(e) => {
                          const so = (initialData.__confirmedSOs as any[]).find((s: any) => s.id === e.target.value);
                          setHeader((h: any) => ({ ...h, linkedSOId: e.target.value, linkedSONumber: so?.soNumber || '' }));
                        }}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                      >
                        <option value="">-- เลือก SO --</option>
                        {(initialData.__confirmedSOs as any[]).map((so: any) => (
                          <option key={so.id} value={so.id}>{so.soNumber} — {so.customerName}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  {(header as any).linkedSOId && (
                    <p className={`text-xs ${darkMode ? 'text-teal-300' : 'text-teal-700'}`}>
                      SO: {(header as any).linkedSOId}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="block space-y-1.5">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      เปอร์เซ็นต์มัดจำ (%)
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={(header as any).depositPercentage || '30'}
                      onChange={(e) => {
                        const pct = Math.min(99, Math.max(1, Number(e.target.value) || 30));
                        const qtTotal = totalSellingPrice + tax;
                        const depositAmt = Math.round(qtTotal * pct / 100 * 100) / 100;
                        const balanceAmt = Math.round((qtTotal - depositAmt) * 100) / 100;
                        setHeader((h: any) => ({
                          ...h,
                          depositPercentage: String(pct),
                          depositAmount: String(depositAmt),
                          balanceAmount: String(balanceAmt),
                        }));
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                    />
                  </label>
                  {(() => {
                    const pct = Number((header as any).depositPercentage) || 30;
                    const qtTotal = totalSellingPrice + tax;
                    const depositAmt = Math.round(qtTotal * pct / 100 * 100) / 100;
                    const balanceAmt = Math.round((qtTotal - depositAmt) * 100) / 100;
                    return (
                      <>
                        <div className="space-y-1.5">
                          <span className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            ยอดมัดจำ ({pct}%)
                          </span>
                          <p className={`py-2 px-3 text-sm font-bold ${darkMode ? 'text-teal-300' : 'text-teal-700'}`}>
                            ฿{formatDisplayAmount(depositAmt)}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <span className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            ยอดคงเหลือ ({100 - pct}%)
                          </span>
                          <p className={`py-2 px-3 text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            ฿{formatDisplayAmount(balanceAmt)}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

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
            </>)}

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className={`rounded-2xl border px-4 py-4 ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'} shadow-sm`}>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{documentType === 'purchase_order' ? 'Vendor Name' : 'Customer Name'}</p>
                <p className={`mt-1 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{documentType === 'purchase_order' ? (vendorDisplay || header.supplierName || '-') : (customerDisplay || '-')}</p>
              </div>
             
              <div className={`rounded-2xl border px-4 py-4 ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'} shadow-sm`}>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {documentType === 'quotation' ? 'ยอดขายรวม (ก่อน VAT)' : documentType === 'purchase_order' ? 'Total Cost Price' : 'Subtotal'}
                </p>
                <p className={`mt-1 text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  ฿{formatDisplayAmount(totalSellingPrice)}
                </p>
                {documentType === 'quotation' ? (
                  <p className={`mt-0.5 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Margin {parseNumberInput(header.margin).toFixed(1)}%</p>
                ) : null}
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
              <div className="overflow-x-auto">
              <div className="min-w-max">
              {documentType === 'deposit_invoice' ? (
                <>
                  {/* Deposit Invoice — always display-only, no editable inputs */}
                  <div
                    className={`grid px-4 py-3 text-xs font-semibold uppercase tracking-wide
                      ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-50 text-gray-600'}`}
                    style={{ gridTemplateColumns: '36px 100px minmax(200px,2fr) 70px 80px 120px 130px' }}
                  >
                    <div>#</div>
                    <div>Code</div>
                    <div>Description</div>
                    <div className="text-right">Qty</div>
                    <div>หน่วยนับ</div>
                    <div className="text-right">Unit Price</div>
                    <div className="text-right">Line Total</div>
                  </div>
                  {items.map((item, index) => (
                    <div key={`di-item-${index}`}
                      className={`grid items-center gap-1 px-4 py-3
                        ${darkMode ? 'border-t border-gray-700 bg-gray-900' : 'border-t border-gray-200 bg-white'}`}
                      style={{ gridTemplateColumns: '36px 100px minmax(200px,2fr) 70px 80px 120px 130px' }}
                    >
                      <div className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{index + 1}</div>
                      <div className={`text-xs font-mono ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{item.productCode || '-'}</div>
                      <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {getProductDisplayName(item.productCode, item.productName) || item.productName || '-'}
                      </div>
                      <div className={`text-right text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.quantity || '-'}</div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {(unitCodes.find((u: any) => u.unitCode === item.unitCode)?.unitName) || item.unitCode || '-'}
                      </div>
                      <div className={`text-right text-sm font-medium ${darkMode ? 'text-teal-300' : 'text-teal-700'}`}>
                        {formatDisplayAmount(parseFloat(item.sellingPrice) || 0)}
                      </div>
                      <div className={`text-right text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        ฿{formatDisplayAmount(parseFloat(item.totalSellingPrice) || 0)}
                      </div>
                    </div>
                  ))}
                  <div className={`flex items-center justify-end gap-4 border-t px-4 py-3
                    ${darkMode ? 'border-gray-700 bg-gray-800 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                    <span className="text-xs font-semibold uppercase tracking-wide">มูลค่ารวมทั้งสิ้น (100%)</span>
                    <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      ฿{formatDisplayAmount(totalSellingPrice + tax)}
                    </span>
                  </div>
                </>
              ) : documentType === 'deposit_receipt' ? (
                <>
                  {/* Deposit Receipt — always display-only, no editable inputs */}
                  <div
                    className={`grid px-4 py-3 text-xs font-semibold uppercase tracking-wide
                      ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-50 text-gray-600'}`}
                    style={{ gridTemplateColumns: '36px 100px minmax(200px,2fr) 70px 80px 120px 130px' }}
                  >
                    <div>#</div>
                    <div>Code</div>
                    <div>Description</div>
                    <div className="text-right">Qty</div>
                    <div>หน่วยนับ</div>
                    <div className="text-right">Unit Price</div>
                    <div className="text-right">Line Total</div>
                  </div>
                  {items.map((item, index) => (
                    <div key={`dr-item-${index}`}
                      className={`grid items-center gap-1 px-4 py-3
                        ${darkMode ? 'border-t border-gray-700 bg-gray-900' : 'border-t border-gray-200 bg-white'}`}
                      style={{ gridTemplateColumns: '36px 100px minmax(200px,2fr) 70px 80px 120px 130px' }}
                    >
                      <div className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{index + 1}</div>
                      <div className={`text-xs font-mono ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{item.productCode || '-'}</div>
                      <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {getProductDisplayName(item.productCode, item.productName) || item.productName || '-'}
                      </div>
                      <div className={`text-right text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.quantity || '-'}</div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {(unitCodes.find((u: any) => u.unitCode === item.unitCode)?.unitName) || item.unitCode || '-'}
                      </div>
                      <div className={`text-right text-sm font-medium ${darkMode ? 'text-cyan-300' : 'text-cyan-700'}`}>
                        {formatDisplayAmount(parseFloat(item.sellingPrice) || 0)}
                      </div>
                      <div className={`text-right text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        ฿{formatDisplayAmount(parseFloat(item.totalSellingPrice) || 0)}
                      </div>
                    </div>
                  ))}
                  <div className={`flex items-center justify-end gap-4 border-t px-4 py-3
                    ${darkMode ? 'border-gray-700 bg-gray-800 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                    <span className="text-xs font-semibold uppercase tracking-wide">มูลค่ารวมทั้งสิ้น (100%)</span>
                    <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      ฿{formatDisplayAmount(totalSellingPrice + tax)}
                    </span>
                  </div>
                </>
              ) : isViewMode && documentType === 'purchase_order' ? (
                <>
                  {/* View-mode read-only table for Purchase Order */}
                  <div
                    className={`grid px-4 py-3 text-xs font-semibold uppercase tracking-wide
                      ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-50 text-gray-600'}`}
                    style={{ gridTemplateColumns: '36px 100px minmax(200px,2fr) 70px 80px 130px 140px' }}
                  >
                    <div>#</div>
                    <div>Code</div>
                    <div>Description</div>
                    <div className="text-right">Qty</div>
                    <div>หน่วยนับ</div>
                    <div className="text-right">ราคาทุน/หน่วย</div>
                    <div className="text-right">รวมทุน</div>
                  </div>
                  {printItems.map((item: any, index: number) => (
                    <div key={`po-view-item-${index}`}
                      className={`grid items-center gap-1 px-4 py-3
                        ${darkMode ? 'border-t border-gray-700 bg-gray-900' : 'border-t border-gray-200 bg-white'}`}
                      style={{ gridTemplateColumns: '36px 100px minmax(200px,2fr) 70px 80px 130px 140px' }}
                    >
                      <div className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{index + 1}</div>
                      <div className={`text-xs font-mono ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{item.productCode || '-'}</div>
                      <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {getProductDisplayName(item.productCode, item.productName) || '-'}
                      </div>
                      <div className={`text-right text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.quantity || '-'}</div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {(unitCodes.find((u: any) => u.unitCode === item.unitCode)?.unitName) || item.unitCode || '-'}
                      </div>
                      <div className={`text-right text-sm font-medium ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                        {formatDisplayAmount(parseFloat(item.sellingPrice) || 0)}
                      </div>
                      <div className={`text-right text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        ฿{formatDisplayAmount(parseFloat(item.totalSellingPrice) || parseFloat(item.totalCost) || 0)}
                      </div>
                    </div>
                  ))}
                  <div className={`grid items-center gap-1 border-t px-4 py-3
                    ${darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}
                    style={{ gridTemplateColumns: '36px 100px minmax(200px,2fr) 70px 80px 130px 140px' }}
                  >
                    <div></div><div></div><div></div><div></div>
                    <div className={`text-right text-xs font-semibold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      ทุนรวม (ก่อน VAT)
                    </div>
                    <div className={`text-right text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      ฿{formatDisplayAmount(totalCost || totalSellingPrice)}
                    </div>
                  </div>
                </>
              ) : documentType === 'quotation' && (isViewMode || isItemLocked) ? (
                <>
                  {/* View-mode read-only table for Quotation */}
                  <div
                    className={`grid px-4 py-3 text-xs font-semibold uppercase tracking-wide
                      ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-50 text-gray-600'}`}
                    style={{ gridTemplateColumns: '36px 90px minmax(200px,2fr) 70px 80px 120px 120px 130px 1fr' }}
                  >
                    <div>#</div>
                    <div>Code</div>
                    <div>Description</div>
                    <div className="text-right">Qty</div>
                    <div>หน่วยนับ</div>
                    <div className="text-right">ราคาทุน</div>
                    <div className="text-right">ราคาขาย</div>
                    <div className="text-right">Line Total</div>
                    <div className="pl-2">Vendor</div>
                  </div>
                  {printItems.map((item: any, index: number) => (
                    <div key={`view-item-${index}`}
                      className={`grid items-center gap-1 px-4 py-3
                        ${darkMode ? 'border-t border-gray-700 bg-gray-900' : 'border-t border-gray-200 bg-white'}`}
                      style={{ gridTemplateColumns: '36px 90px minmax(200px,2fr) 70px 80px 120px 120px 130px 1fr' }}
                    >
                      <div className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{index + 1}</div>
                      <div className={`text-xs font-mono ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{item.productCode || '-'}</div>
                      <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {getProductDisplayName(item.productCode, item.productName) || '-'}
                      </div>
                      <div className={`text-right text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.quantity || '-'}</div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {(unitCodes.find((u: any) => u.unitCode === item.unitCode)?.unitName) || item.unitCode || '-'}
                      </div>
                      <div className={`text-right text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatDisplayAmount(parseFloat(item.cost) || 0)}
                      </div>
                      <div className={`text-right text-sm font-medium ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                        {formatDisplayAmount(parseFloat(item.sellingPrice) || 0)}
                      </div>
                      <div className={`text-right text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        ฿{formatDisplayAmount(parseFloat(item.totalSellingPrice) || 0)}
                      </div>
                      <div className={`pl-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {item.vendorCode
                          ? (vendorCodes.find((v: any) => v.vendorCode === item.vendorCode)?.name || item.vendorCode)
                          : '-'}
                      </div>
                    </div>
                  ))}
                  {/* Subtotal footer row */}
                  <div className={`grid items-center gap-1 border-t px-4 py-3
                    ${darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}
                    style={{ gridTemplateColumns: '36px 90px minmax(200px,2fr) 70px 80px 120px 120px 130px 1fr' }}
                  >
                    <div></div><div></div><div></div><div></div><div></div>
                    <div className={`text-right text-xs font-semibold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      ทุนรวม: ฿{formatDisplayAmount(totalCost)}
                    </div>
                    <div></div>
                    <div className={`text-right text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      ยอดขาย: ฿{formatDisplayAmount(totalSellingPrice)}
                    </div>
                    <div></div>
                  </div>
                </>
              ) : documentType === 'invoice' ? (
                <>
                  {/* Invoice — always display-only, no editable inputs */}
                  <div
                    className={`grid px-4 py-3 text-xs font-semibold uppercase tracking-wide
                      ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-50 text-gray-600'}`}
                    style={{ gridTemplateColumns: '36px 100px minmax(200px,2fr) 70px 80px 120px 130px' }}
                  >
                    <div>#</div>
                    <div>Code</div>
                    <div>Description</div>
                    <div className="text-right">Qty</div>
                    <div>หน่วยนับ</div>
                    <div className="text-right">Unit Price</div>
                    <div className="text-right">Line Total</div>
                  </div>
                  {items.map((item, index) => (
                    <div key={`inv-item-${index}`}
                      className={`grid items-center gap-1 px-4 py-3
                        ${darkMode ? 'border-t border-gray-700 bg-gray-900' : 'border-t border-gray-200 bg-white'}`}
                      style={{ gridTemplateColumns: '36px 100px minmax(200px,2fr) 70px 80px 120px 130px' }}
                    >
                      <div className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{index + 1}</div>
                      <div className={`text-xs font-mono ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{item.productCode || '-'}</div>
                      <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {getProductDisplayName(item.productCode, item.productName) || item.productName || '-'}
                      </div>
                      <div className={`text-right text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.quantity || '-'}</div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {(unitCodes.find((u: any) => u.unitCode === item.unitCode)?.unitName) || item.unitCode || '-'}
                      </div>
                      <div className={`text-right text-sm font-medium ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                        {formatDisplayAmount(parseFloat(item.sellingPrice) || 0)}
                      </div>
                      <div className={`text-right text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        ฿{formatDisplayAmount(parseFloat(item.totalSellingPrice) || 0)}
                      </div>
                    </div>
                  ))}
                  <InvoiceSummary
                    subtotal={totalSellingPrice}
                    vat={tax}
                    grandTotal={totalSellingPrice + tax}
                    taxRate={taxRate}
                    depositAmount={parseFloat(header.depositAmountDeducted) > 0
                      ? parseFloat(header.depositAmountDeducted) : undefined}
                    depositReceiptNumber={header.linkedDepositReceiptNumber || undefined}
                    darkMode={darkMode}
                  />
                </>
              ) : documentType === 'receipt' ? (
                <>
                  {/* Receipt — display-only, no editable inputs */}
                  <div
                    className={`grid px-4 py-3 text-xs font-semibold uppercase tracking-wide
                      ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-50 text-gray-600'}`}
                    style={{ gridTemplateColumns: '36px 100px minmax(200px,2fr) 70px 80px 120px 130px' }}
                  >
                    <div>#</div>
                    <div>Code</div>
                    <div>Description</div>
                    <div className="text-right">Qty</div>
                    <div>หน่วยนับ</div>
                    <div className="text-right">Unit Price</div>
                    <div className="text-right">Line Total</div>
                  </div>
                  {items.map((item, index) => (
                    <div key={`rc-item-${index}`}
                      className={`grid items-center gap-1 px-4 py-3
                        ${darkMode ? 'border-t border-gray-700 bg-gray-900' : 'border-t border-gray-200 bg-white'}`}
                      style={{ gridTemplateColumns: '36px 100px minmax(200px,2fr) 70px 80px 120px 130px' }}
                    >
                      <div className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{index + 1}</div>
                      <div className={`text-xs font-mono ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{item.productCode || '-'}</div>
                      <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {getProductDisplayName(item.productCode, item.productName) || item.productName || '-'}
                      </div>
                      <div className={`text-right text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.quantity || '-'}</div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {(unitCodes.find((u: any) => u.unitCode === item.unitCode)?.unitName) || item.unitCode || '-'}
                      </div>
                      <div className={`text-right text-sm font-medium ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                        {formatDisplayAmount(parseFloat(item.sellingPrice) || 0)}
                      </div>
                      <div className={`text-right text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        ฿{formatDisplayAmount(parseFloat(item.totalSellingPrice) || 0)}
                      </div>
                    </div>
                  ))}
                  <InvoiceSummary
                    subtotal={totalSellingPrice}
                    vat={tax}
                    grandTotal={totalSellingPrice + tax}
                    taxRate={taxRate}
                    depositAmount={parseFloat(header.depositAmountDeducted) > 0
                      ? parseFloat(header.depositAmountDeducted) : undefined}
                    depositReceiptNumber={header.linkedDepositReceiptNumber || undefined}
                    darkMode={darkMode}
                  />
                </>
              ) : (
                <>
                  {/* Edit/Create mode grid */}
                  <div
                    className={`grid px-4 py-3 text-xs font-semibold uppercase tracking-wide
                      ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-50 text-gray-600'}`}
                    style={{
                      gridTemplateColumns: documentType === 'quotation' ?
                        '44px 100px minmax(180px,1.2fr) 90px 90px 100px 110px 120px 52px 100px 160px 44px' :
                        '44px 100px minmax(260px,1.8fr) 90px 80px 120px 120px 130px'
                    }}
                  >
                    <div>Item</div>
                    <div>Code</div>
                    <div>Description</div>
                    <div>Qty</div>
                    <div>หน่วยนับ</div>
                    {documentType === 'quotation' ?
                      <>
                        <div>Margin (%)</div>
                        <div>Cost Price</div>
                      </>
                      : null
                    }
                    <div>{documentType === 'quotation' ? 'Sale Price' : documentType === 'purchase_order' ? 'Cost Price' : 'Unit Price'}</div>
                    {documentType === 'quotation' ? <div className="text-center">ปัด</div> : null}
                    <div>{documentType === 'quotation' ? 'Total' : documentType === 'purchase_order' ? 'Total Cost' : 'Line Total'}</div>
                    {documentType === 'quotation' ? <div>Vendor</div> : null}
                    <div></div>
                  </div>
                  {items.map((item, index) => (
                    <div key={`document-item-${index}`}
                      className={`grid items-start gap-1 px-4 py-3
                      ${darkMode ? 'border-t border-gray-700 bg-gray-900' : 'border-t border-gray-200 bg-white'}`}
                      style={{
                        gridTemplateColumns: documentType === 'quotation' ?
                          '44px 100px minmax(180px,1.2fr) 90px 90px 100px 110px 120px 52px 100px 160px 44px' :
                          '44px 100px minmax(260px,1.8fr) 90px 80px 120px 120px 130px'
                      }}
                    >
                      <div className={`pt-2 text-sm font-semibold
                        ${darkMode ? 'text-white' : 'text-gray-900'}`}>{index + 1}
                      </div>
                      <button type="button"
                        disabled={isItemLocked}
                        onClick={() => { setSelectedItemIndex(index); setProductModalOpen(true); }}
                        className={`rounded-lg border px-3 py-2 text-left text-xs font-medium disabled:opacity-50
                      ${darkMode ? 'border-blue-500/40 bg-blue-500/10 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                        {item.productCode || 'Select...'}
                      </button>
                      <input
                        readOnly={isItemLocked}
                        className={`rounded-lg border border-gray-300 px-3 py-2 text-sm ${isItemLocked ? 'bg-gray-100 text-gray-500' : 'bg-white text-black'}`}
                        value={item.productName}
                        placeholder="Description"
                        onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                      />
                      <input type="number"
                        readOnly={isItemLocked}
                        className={`rounded-lg border border-gray-300 px-3 py-2 text-right text-sm ${isItemLocked ? 'bg-gray-100 text-gray-500' : 'bg-white text-black'}`}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      />
                      <select
                        disabled={isItemLocked}
                        className={`rounded-lg border border-gray-300 px-2 py-2 text-xs w-full ${isItemLocked ? 'bg-gray-100 text-gray-500' : 'bg-white text-black'}`}
                        value={item.unitCode || ''}
                        onChange={(e) => handleItemChange(index, 'unitCode', e.target.value)}
                      >
                        <option value="">-</option>
                        {unitCodes.map((u: any) => (
                          <option key={u.unitCode} value={u.unitCode}>{u.unitName || u.unitCode}</option>
                        ))}
                      </select>
                      {documentType === 'quotation' ?
                        <>
                          <input type="number" step="0.01"
                            readOnly={isItemLocked}
                            className={`rounded-lg border border-gray-300 px-3 py-2 text-right text-sm ${isItemLocked ? 'bg-gray-100 text-gray-500' : 'bg-white text-black'}`}
                            value={item.margin}
                            onChange={(e) => handleItemChange(index, 'margin', e.target.value)}
                          />
                          <input type="number" step="0.01"
                            readOnly={isItemLocked}
                            className={`rounded-lg border border-gray-300 px-3 py-2 text-right text-sm ${isItemLocked ? 'bg-gray-100 text-gray-500' : 'bg-white text-black'}`}
                            value={item.cost}
                            onChange={(e) => handleItemChange(index, 'cost', e.target.value)}
                          />
                        </>
                        : null}
                      <input type="number" step="0.01"
                        readOnly={isItemLocked}
                        className={`rounded-lg border border-gray-300 px-3 py-2 text-right text-sm ${isItemLocked ? 'bg-gray-100 text-gray-500' : 'bg-white text-black'}`}
                        value={item.sellingPrice}
                        onChange={(e) => handleItemChange(index, 'sellingPrice', e.target.value)}
                      />
                      {documentType === 'quotation' ? (
                        <div className="flex flex-col gap-0.5 items-center justify-center">
                          <button type="button" title="ปัดขึ้น"
                            disabled={isViewMode || isItemLocked}
                            onClick={() => handleRoundSellingPrice(index, 'up')}
                            className="w-9 rounded border border-blue-300 bg-blue-50 py-0.5 text-center text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-40">
                            ▲
                          </button>
                          <button type="button" title="ปัดลง"
                            disabled={isViewMode || isItemLocked}
                            onClick={() => handleRoundSellingPrice(index, 'down')}
                            className="w-9 rounded border border-amber-300 bg-amber-50 py-0.5 text-center text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-40">
                            ▼
                          </button>
                        </div>
                      ) : null}
                      <input type="number" step="0.01"
                        readOnly
                        className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-right text-sm w-full text-gray-700"
                        value={item.totalSellingPrice}
                        onChange={undefined}
                      />
                      {documentType === 'quotation' ? (
                        <select
                          className={`rounded-lg border border-gray-300 px-2 py-2 text-xs w-full ${isPendingApproval || isItemLocked ? 'bg-gray-100 text-gray-600' : 'bg-white text-black'}`}
                          value={item.vendorCode || ''}
                          disabled={isPendingApproval || isItemLocked}
                          onChange={(e) => handleItemChange(index, 'vendorCode', e.target.value)}
                        >
                          <option value="">— เลือก Vendor —</option>
                          {getVendorsForItem(item.productCode).map((v: any) => (
                            <option key={v.vendorCode} value={v.vendorCode}>{v.name || v.vendorCode}</option>
                          ))}
                        </select>
                      ) : null}
                      <div className="flex justify-center pt-2">
                        {items.length > 1 && !isItemLocked ?
                          <button type="button"
                            onClick={() => removeItemRow(index)}
                            className="rounded-md px-2 py-1 text-lg leading-none text-red-500 hover:bg-red-50">×
                          </button> : null}
                      </div>
                    </div>
                  ))}
                  <div className={`flex items-center justify-between border-t px-4 py-3
                    ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                    {!isItemLocked && (
                      <button type="button"
                        onClick={addItemRow}
                        className="rounded-lg border border-dashed border-purple-500 px-3 py-2 text-xs font-semibold text-purple-600 hover:bg-purple-50">
                        + Add Item
                      </button>
                    )}
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Items: {printItems.length || items.length}
                    </div>
                  </div>
                </>
              )}
              </div>
              </div>
            </div>

            {documentType === 'receipt' && header.linkedDepositReceiptId && (
              <div className="mt-4">
                <DepositDeductionSummary
                  qtTotal={parseNumberInput(header.qtTotal || '0')}
                  dpNumber={header.dpNumber || header.linkedDepositReceiptNumber || ''}
                  depositPercentage={parseNumberInput(header.depositPercentage || '30')}
                  depositAmount={parseNumberInput(header.depositAmountDeducted || '0')}
                  balanceNet={total}
                  balanceBase={parseNumberInput(header.balanceBase || '0')}
                  vatAmount={parseNumberInput(header.balanceVat || '0')}
                  darkMode={darkMode}
                />
              </div>
            )}
          </fieldset>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
            {/* View Mode: Back */}
            {isViewMode ? (
              <button
                type="button"
                onClick={() => goBackToDocuments()}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            ) : <div />}
            <div className="flex flex-wrap gap-3">
            {/* Edit Mode: Save + Cancel */}
            {!isViewMode && (
              <button
                type="button"
                onClick={() => void handleSave()}
                className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700">
                Save {typeLabel}
              </button>
            )}
            {/* View Mode: แก้ไข — hidden for receipt (immutable document) */}
            {isViewMode && !isReceiptLocked && (
              <button
                type="button"
                onClick={() => setMode('edit')}
                className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600">
                แก้ไข
              </button>
            )}
            {/* Print PDF: View Mode ทุกประเภท + Quotation Edit Mode */}
            {(isViewMode || documentType === 'quotation') && (
              <button
                type="button"
                onClick={() => void handlePrint()}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print PDF
              </button>
            )}
            {/* Invoice View Mode: พิมพ์ 3 ชุด */}
            {documentType === 'invoice' && isViewMode && (
              <button
                type="button"
                onClick={() => {
                  const depositAmt = parseFloat(header.depositAmountDeducted) || 0;
                  const grandTotalAmt = total;
                  const netPay = grandTotalAmt - depositAmt;
                  const html = buildInvoicePrintHtml({
                    invoiceNo: String(header.documentNumber || ''),
                    invoiceDate: String(header.documentDate || ''),
                    dueDate: String((header as any).dueDate || ''),
                    customerName: String(header.billTo || ''),
                    customerAddress: String(header.shipTo || header.billTo || ''),
                    customerTaxId: String((header as any).customerTaxId || ''),
                    customerBranch: String((header as any).customerBranch || ''),
                    paymentTerm: String(header.paymentTerm || ''),
                    items: items.map((item: any, i: number) => ({
                      lineNo: i + 1,
                      productCode: item.productCode || '',
                      productName: item.productName || '',
                      quantity: Number(item.quantity || 0),
                      unit: (unitCodes.find((u: any) => u.unitCode === item.unitCode)?.unitName) || item.unitCode || '',
                      unitPrice: Number(item.sellingPrice || 0),
                      totalAmount: Number(item.totalSellingPrice || 0),
                    })),
                    subtotal: totalSellingPrice,
                    vatRate: taxRate,
                    vatAmount: tax,
                    grandTotal: grandTotalAmt,
                    depositAmount: depositAmt,
                    netPayable: netPay,
                    netPayableText: bahttext(Math.round(netPay * 100) / 100),
                    referenceNo: String((header as any).linkedSONumber || header.referenceNo || ''),
                    depositReceiptNumber: (header as any).linkedDepositReceiptNumber || undefined,
                    companyName: String(companyInfo?.name || companyInfo?.nameEn || ''),
                    companyAddress: String(companyInfo?.address || ''),
                    companyTaxId: String(companyInfo?.taxId || ''),
                  });
                  void printDocumentContent(String(header.documentNumber || 'invoice'), html, { bodyPadding: '0' });
                }}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
              >
                พิมพ์ (3 ชุด)
              </button>
            )}
            {/* Receipt View Mode: พิมพ์ DO — only when RC was created via pay-full (has linkedDOId) */}
            {documentType === 'receipt' && isViewMode && initialData?.linkedDOId && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await documentService.getById('delivery_order', initialData.linkedDOId);
                    const doDoc = res?.data?.data;
                    if (doDoc) {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`<html><head><title>DO ${escapeHtml(doDoc.documentNumber)}</title></head><body>`);
                        printWindow.document.write(`<h2>ใบส่งสินค้า ${escapeHtml(doDoc.documentNumber)}</h2>`);
                        printWindow.document.write(`<p>ลูกค้า: ${escapeHtml(doDoc.billTo || '-')}</p>`);
                        printWindow.document.write(`<p>อ้างอิง SO: ${escapeHtml(doDoc.referenceNo || '-')}</p>`);
                        printWindow.document.close();
                        printWindow.print();
                      } else {
                        await showAppAlert({ title: 'Popup ถูกบล็อก', message: 'กรุณาอนุญาต popup ในเบราว์เซอร์แล้วลองใหม่', tone: 'warning' });
                      }
                    }
                  } catch {
                    await showAppAlert({ title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถโหลดข้อมูลใบส่งสินค้าได้', tone: 'danger' });
                  }
                }}
                className="rounded-xl px-3 py-1.5 text-sm font-semibold border border-orange-400 text-orange-600 hover:bg-orange-50 transition">
                🚚 พิมพ์ใบส่งสินค้า (DO)
              </button>
            )}
            {/* View Mode: ลบ */}
            {isViewMode && (
              <button
                type="button"
                onClick={() => void handleDeleteDocument()}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700">
                ลบ
              </button>
            )}
            {/* Edit Mode: Cancel — hidden for receipt (confirm-and-save only) */}
            {!isViewMode && !isReceiptLocked && (
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
                  if (confirmed) goBackToDocuments();
                }}
                className="rounded-lg bg-gray-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700">
                Cancel
              </button>
            )}
            </div>
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

      <VendorPickerModal
        isOpen={vendorModalOpen}
        vendors={vendorCodes}
        selectedCode={header.vendorCode || ''}
        onSelect={(v) => handleHeaderChange('vendorCode', v.vendorCode)}
        onClear={() => handleHeaderChange('vendorCode', '')}
        onClose={() => setVendorModalOpen(false)}
        darkMode={darkMode}
      />

      <CustomerPickerModal
        isOpen={customerModalOpen}
        customers={customerCodes}
        selectedCode={header.customer || ''}
        onSelect={(c) => { handleHeaderChange('customer', c.customerCode); setCustomerModalOpen(false); }}
        onClear={() => { handleHeaderChange('customer', ''); setCustomerModalOpen(false); }}
        onClose={() => setCustomerModalOpen(false)}
        darkMode={darkMode}
      />
    </>
  );
}