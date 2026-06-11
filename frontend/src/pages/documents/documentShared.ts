import documentService, { MainDocumentType } from '../../services/documentService';

export const DOCUMENT_TYPES: MainDocumentType[] = ['quotation', 'invoice', 'receipt', 'deposit_receipt', 'purchase_order', 'work_order', 'delivery_order', 'customer_return'];

export const QUOTATION_STATUS_OPTIONS = ['All', 'Draft', 'Sent', 'Waiting Customer', 'Follow Up', 'Negotiating', 'Confirmed', 'Approved', 'Won', 'Rejected', 'Lost', 'Expired', 'Converted'];

export const SALES_TYPES: MainDocumentType[] = ['quotation', 'deposit_receipt', 'invoice', 'receipt'];
export const PURCHASE_TYPES: MainDocumentType[] = ['purchase_order'];
export const OPERATIONS_TYPES: MainDocumentType[] = ['work_order'];

export type DocumentsByType = Record<MainDocumentType, any[]>;

export const documentTypeConfigs: Record<MainDocumentType, { icon: string; label: string; labelTh: string; accent: string; createLabel: string }> = {
  quotation:       { icon: '📝', label: 'Quotation',       labelTh: 'ใบเสนอราคา',    accent: 'blue',   createLabel: 'สร้างใบเสนอราคา' },
  deposit_receipt: { icon: '🏦', label: 'Deposit Receipt', labelTh: 'ใบรับมัดจำ',    accent: 'cyan',   createLabel: 'สร้างใบรับมัดจำ' },
  invoice:         { icon: '🧾', label: 'Invoice',         labelTh: 'ใบแจ้งหนี้',    accent: 'emerald',createLabel: 'สร้างใบแจ้งหนี้' },
  receipt:         { icon: '💵', label: 'Receipt',         labelTh: 'ใบเสร็จรับเงิน', accent: 'amber',  createLabel: 'สร้างใบเสร็จ' },
  purchase_order:  { icon: '📦', label: 'Purchase Order',  labelTh: 'ใบสั่งซื้อ',    accent: 'violet', createLabel: 'สร้างใบสั่งซื้อ' },
  work_order:      { icon: '🛠️', label: 'Work Order',      labelTh: 'ใบสั่งงาน',     accent: 'rose',   createLabel: 'สร้างใบสั่งงาน' },
  delivery_order:  { icon: '🚚', label: 'Delivery Order',  labelTh: 'ใบส่งสินค้า',   accent: 'orange', createLabel: 'สร้างใบส่งสินค้า' },
  customer_return: { icon: '↩️', label: 'Customer Return', labelTh: 'ใบคืนสินค้า',   accent: 'pink',   createLabel: 'สร้างใบคืนสินค้า' },
};

export const accentClasses: Record<string, { tab: string; activeTab: string; btn: string; badge: string }> = {
  blue:    { tab: 'border-blue-500',    activeTab: 'bg-blue-600 text-white border-blue-600',    btn: 'bg-blue-600 hover:bg-blue-700',    badge: 'bg-blue-100 text-blue-700' },
  cyan:    { tab: 'border-cyan-500',    activeTab: 'bg-cyan-600 text-white border-cyan-600',    btn: 'bg-cyan-600 hover:bg-cyan-700',    badge: 'bg-cyan-100 text-cyan-700' },
  emerald: { tab: 'border-emerald-500', activeTab: 'bg-emerald-600 text-white border-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  amber:   { tab: 'border-amber-500',   activeTab: 'bg-amber-500 text-white border-amber-500',  btn: 'bg-amber-500 hover:bg-amber-600',  badge: 'bg-amber-100 text-amber-700' },
  violet:  { tab: 'border-violet-500',  activeTab: 'bg-violet-600 text-white border-violet-600', btn: 'bg-violet-600 hover:bg-violet-700', badge: 'bg-violet-100 text-violet-700' },
  rose:    { tab: 'border-rose-500',    activeTab: 'bg-rose-600 text-white border-rose-600',    btn: 'bg-rose-600 hover:bg-rose-700',    badge: 'bg-rose-100 text-rose-700' },
};

export const createEmptyCollections = (): DocumentsByType => ({
  quotation: [], invoice: [], receipt: [], deposit_receipt: [], purchase_order: [], work_order: [], delivery_order: [], customer_return: [],
});

export const getRecordKey = (record: any) => record?.id || record?.documentId || record?.documentNumber;

export const formatDate = (value: any) => {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString('th-TH');
};

export const formatCurrency = (value: any) =>
  Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const toDateInputValue = (value: any) => {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

export const replaceRecord = (records: any[], nextRecord: any) => {
  const nextKey = getRecordKey(nextRecord);
  const existingIndex = records.findIndex((r) => getRecordKey(r) === nextKey || r.documentNumber === nextRecord.documentNumber);
  if (existingIndex === -1) return [nextRecord, ...records];
  return records.map((r, i) => (i === existingIndex ? nextRecord : r));
};

export const getRecordVendorLabel = (record: any) => {
  const code = String(record?.vendorCode || '').trim();
  const name = String(record?.supplierName || '').trim();
  return code && name ? `${code} - ${name}` : code || name || '-';
};

export const loadAllDocuments = async (): Promise<DocumentsByType> => {
  const results = await Promise.allSettled(DOCUMENT_TYPES.map((t) => documentService.getAll(t)));
  const collections = createEmptyCollections();
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      collections[DOCUMENT_TYPES[i]] = result.value?.data?.data || [];
    }
  });
  return collections;
};

export const buildInvoiceDraftFromQuotation = (quotation: any) => {
  const qNum = String(quotation?.documentNumber || '').trim();
  return {
    __mode: 'create',
    title: quotation?.title ? `Invoice for ${quotation.title}` : 'Invoice',
    documentDate: toDateInputValue(quotation?.documentDate) || toDateInputValue(new Date()),
    customer: quotation?.customer || '',
    billTo: quotation?.billTo || quotation?.customerName || '',
    shipTo: quotation?.shipTo || '',
    destination: quotation?.destination || quotation?.shipTo || '',
    paymentTerm: quotation?.paymentTerm || '',
    paymentMethod: quotation?.paymentMethod || 'Bank Transfer',
    referenceNo: qNum,
    status: 'Pending',
    remark: quotation?.remark ? `${quotation.remark}\n\nLinked from quotation ${qNum}` : `Linked from quotation ${qNum}`,
    taxRate: String(quotation?.taxRate ?? 0),
    dueDate: toDateInputValue(quotation?.validUntil),
    doNo: '',
    margin: String(quotation?.margin ?? 0),
    linkedQuotationId: quotation?.documentId || quotation?.id || '',
    linkedQuotationNumber: qNum,
    items: (quotation?.items || []).map((item: any) => ({
      id: item?.id || '', productCode: item?.productCode || '', productName: item?.productName || '',
      packing: item?.packing || '', quantity: item?.quantity || '', cost: item?.cost || '',
      margin: item?.margin || '', sellingPrice: item?.sellingPrice || '',
      totalCost: item?.totalCost || '', totalSellingPrice: item?.totalSellingPrice || '', unitId: item?.unitId || '',
    })),
  };
};

export const buildDepositReceiptDraftFromQuotation = (quotation: any) => {
  const qNum = String(quotation?.documentNumber || '').trim();
  const today = toDateInputValue(new Date());
  return {
    __mode: 'create',
    title: quotation?.title ? `Deposit Receipt for ${quotation.title}` : 'Deposit Receipt',
    documentDate: today,
    customer: quotation?.customer || '',
    billTo: quotation?.billTo || quotation?.customerName || '',
    shipTo: quotation?.shipTo || '',
    destination: quotation?.destination || quotation?.shipTo || '',
    paymentTerm: quotation?.paymentTerm || '',
    paymentMethod: quotation?.paymentMethod || 'Bank Transfer',
    referenceNo: qNum,
    status: 'Received',
    remark: quotation?.remark ? `${quotation.remark}\n\nDeposit receipt from quotation ${qNum}` : `Deposit receipt from quotation ${qNum}`,
    taxRate: String(quotation?.taxRate ?? 0),
    receivedDate: today,
    paymentReference: '',
    paymentAmount: String(Number(quotation?.total || 0).toFixed(2)),
    paymentType: 'full',
    linkedQuotationId: quotation?.documentId || quotation?.id || '',
    linkedQuotationNumber: qNum,
    items: (quotation?.items || []).map((item: any) => ({
      id: item?.id || '', productCode: item?.productCode || '', productName: item?.productName || '',
      quantity: item?.quantity || '', cost: item?.cost || '', margin: item?.margin || '',
      sellingPrice: item?.sellingPrice || '', totalCost: item?.totalCost || '',
      totalSellingPrice: item?.totalSellingPrice || '', unitId: item?.unitId || '',
    })),
  };
};

export const buildPurchaseOrderDraftFromQuotation = (quotation: any) => {
  const qNum = String(quotation?.documentNumber || '').trim();
  return {
    __mode: 'create',
    title: quotation?.title ? `PO for ${quotation.title}` : 'Purchase Order',
    documentDate: toDateInputValue(new Date()),
    customer: '',
    billTo: quotation?.billTo || quotation?.customerName || '',
    shipTo: quotation?.shipTo || '',
    destination: quotation?.destination || quotation?.shipTo || '',
    paymentTerm: quotation?.paymentTerm || '',
    paymentMethod: quotation?.paymentMethod || '',
    referenceNo: qNum,
    status: 'Open',
    remark: quotation?.remark ? `${quotation.remark}\n\nPurchase order from quotation ${qNum}` : `Purchase order from quotation ${qNum}`,
    taxRate: String(quotation?.taxRate ?? 0),
    vendorCode: '', supplierName: '', deliveryDate: '',
    items: (quotation?.items || []).map((item: any) => ({
      id: item?.id || '', productCode: item?.productCode || '', productName: item?.productName || '',
      quantity: item?.quantity || '', cost: item?.cost || '', margin: item?.margin || '',
      sellingPrice: item?.cost || '', totalCost: item?.totalCost || '',
      totalSellingPrice: item?.totalCost || '', unitId: item?.unitId || '',
    })),
  };
};

export const buildReceiptDraftFromInvoice = (invoice: any) => {
  const invNum = String(invoice?.documentNumber || '').trim();
  const today = toDateInputValue(new Date());
  return {
    __mode: 'create',
    title: invoice?.title ? `Receipt for ${invoice.title}` : 'Receipt',
    documentDate: today,
    customer: invoice?.customer || '',
    billTo: invoice?.billTo || invoice?.customerName || '',
    shipTo: invoice?.shipTo || '',
    destination: invoice?.destination || invoice?.shipTo || '',
    paymentTerm: invoice?.paymentTerm || '',
    paymentMethod: invoice?.paymentMethod || '',
    referenceNo: invNum,
    status: 'Received',
    remark: invoice?.remark ? `${invoice.remark}\n\nLinked from invoice ${invNum}` : `Linked from invoice ${invNum}`,
    taxRate: String(invoice?.taxRate ?? 0),
    receivedDate: today,
    paymentReference: '',
    linkedInvoiceId: invoice?.documentId || invoice?.id || '',
    linkedInvoiceNumber: invNum,
    items: (invoice?.items || []).map((item: any) => ({
      id: item?.id || '', productCode: item?.productCode || '', productName: item?.productName || '',
      quantity: item?.quantity || '', margin: item?.margin || '', sellingPrice: item?.sellingPrice || '',
      totalCost: item?.totalCost || '', totalSellingPrice: item?.totalSellingPrice || '', unitId: item?.unitId || '',
    })),
  };
};
