import documentService, { MainDocumentType, DocumentListParams } from '../../services/documentService';

export const DOCUMENT_TYPES: MainDocumentType[] = ['quotation', 'invoice', 'receipt', 'deposit_receipt', 'deposit_invoice', 'purchase_order', 'work_order', 'delivery_order', 'customer_return'];

export const QUOTATION_STATUS_OPTIONS = ['All', 'Draft', 'Pending Approval', 'Approved', 'Sent', 'Confirmed'];

export const DEPOSIT_INVOICE_STATUS_OPTIONS = ['All', 'Draft', 'Sent', 'Awaiting_Verify', 'Paid'] as const;

export const DEPOSIT_INVOICE_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Draft':           { bg: 'rgba(108,117,125,0.15)', text: '#495057' },
  'Sent':            { bg: 'rgba(111,66,193,0.15)',  text: '#59359A' },
  'Awaiting_Verify': { bg: 'rgba(253,126,20,0.15)',  text: '#B94B00' },
  'Paid':            { bg: 'rgba(25,135,84,0.15)',   text: '#0F5132' },
};

export const getDepositInvoiceStatusStyle = (status: string): { backgroundColor: string; color: string } => {
  const c = DEPOSIT_INVOICE_STATUS_COLORS[status] ?? DEPOSIT_INVOICE_STATUS_COLORS['Draft'];
  return { backgroundColor: c.bg, color: c.text };
};

export const QUOTATION_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Draft':            { bg: 'rgba(108,117,125,0.15)', text: '#495057' },
  'Pending Approval': { bg: 'rgba(253,126,20,0.15)',  text: '#B94B00' },
  'Approved':         { bg: 'rgba(13,110,253,0.15)',  text: '#0A58CA' },
  'Sent':             { bg: 'rgba(111,66,193,0.15)',  text: '#59359A' },
  'Confirmed':        { bg: 'rgba(25,135,84,0.15)',   text: '#0F5132' },
};

export const getQuotationStatusStyle = (status: string): { backgroundColor: string; color: string } => {
  const c = QUOTATION_STATUS_COLORS[status] ?? QUOTATION_STATUS_COLORS['Draft'];
  return { backgroundColor: c.bg, color: c.text };
};

export const SALES_TYPES: MainDocumentType[] = ['quotation', 'deposit_receipt', 'deposit_invoice', 'invoice', 'receipt'];
export const PURCHASE_TYPES: MainDocumentType[] = ['purchase_order'];
export const OPERATIONS_TYPES: MainDocumentType[] = ['work_order', 'delivery_order'];

export type DocumentsByType = Record<MainDocumentType, any[]>;

export const documentTypeConfigs: Record<MainDocumentType, { icon: string; label: string; labelTh: string; accent: string; createLabel: string }> = {
  quotation:       { icon: '📝', label: 'Quotation',       labelTh: 'ใบเสนอราคา',    accent: 'blue',   createLabel: 'สร้างใบเสนอราคา' },
  deposit_receipt: { icon: '🏦', label: 'Deposit Receipt', labelTh: 'ใบรับมัดจำ',    accent: 'cyan',   createLabel: 'สร้างใบรับมัดจำ' },
  deposit_invoice: { icon: '📋', label: 'Deposit Invoice', labelTh: 'ใบแจ้งหนี้มัดจำ', accent: 'teal', createLabel: 'สร้างใบแจ้งหนี้มัดจำ' },
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
  teal:    { tab: 'border-teal-500',    activeTab: 'bg-teal-600 text-white border-teal-600',    btn: 'bg-teal-600 hover:bg-teal-700',    badge: 'bg-teal-100 text-teal-700' },
  emerald: { tab: 'border-emerald-500', activeTab: 'bg-emerald-600 text-white border-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  amber:   { tab: 'border-amber-500',   activeTab: 'bg-amber-500 text-white border-amber-500',  btn: 'bg-amber-500 hover:bg-amber-600',  badge: 'bg-amber-100 text-amber-700' },
  violet:  { tab: 'border-violet-500',  activeTab: 'bg-violet-600 text-white border-violet-600', btn: 'bg-violet-600 hover:bg-violet-700', badge: 'bg-violet-100 text-violet-700' },
  rose:    { tab: 'border-rose-500',    activeTab: 'bg-rose-600 text-white border-rose-600',    btn: 'bg-rose-600 hover:bg-rose-700',    badge: 'bg-rose-100 text-rose-700' },
  orange:  { tab: 'border-orange-500',  activeTab: 'bg-orange-600 text-white border-orange-600', btn: 'bg-orange-600 hover:bg-orange-700', badge: 'bg-orange-100 text-orange-700' },
};

export const createEmptyCollections = (): DocumentsByType => ({
  quotation: [], invoice: [], receipt: [], deposit_receipt: [], deposit_invoice: [],
  purchase_order: [], work_order: [], delivery_order: [], customer_return: [],
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

export const DEFAULT_DOC_LIMIT = 50;

export const loadTabDocuments = async (
  type: MainDocumentType,
  params: DocumentListParams = {},
): Promise<any[]> => {
  const res = await documentService.getAll(type, { limit: DEFAULT_DOC_LIMIT, ...params });
  return res?.data?.data || [];
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
    linkedSOId: invoice?.linkedSOId || '',
    items: (invoice?.items || []).map((item: any) => ({
      id: item?.id || '', productCode: item?.productCode || '', productName: item?.productName || '',
      quantity: item?.quantity || '', margin: item?.margin || '', sellingPrice: item?.sellingPrice || '',
      totalCost: item?.totalCost || '', totalSellingPrice: item?.totalSellingPrice || '', unitId: item?.unitId || '',
    })),
  };
};

export const buildDepositInvoiceDraftFromQuotation = (quotation: any, so: any) => {
  const qNum = String(quotation?.documentNumber || '').trim();
  const today = toDateInputValue(new Date());
  const qtTotal = Number(quotation?.total || 0);
  const depositPct = 30;
  const depositAmount = Math.round((qtTotal * depositPct / 100) * 100) / 100;
  const balanceAmount = Math.round((qtTotal - depositAmount) * 100) / 100;
  const taxRate = Number(quotation?.taxRate || 7);
  const depositBase = Math.round((depositAmount / (1 + taxRate / 100)) * 100) / 100;
  const depositVat = Math.round((depositAmount - depositBase) * 100) / 100;

  return {
    __mode: 'create',
    title: quotation?.title ? `ใบแจ้งหนี้มัดจำ — ${quotation.title}` : 'ใบแจ้งหนี้มัดจำ',
    documentDate: today,
    customer: quotation?.customer || '',
    billTo: quotation?.billTo || quotation?.customerName || '',
    paymentTerm: quotation?.paymentTerm || '',
    paymentMethod: quotation?.paymentMethod || 'Bank Transfer',
    referenceNo: qNum,
    status: 'Draft',
    remark: `มัดจำ ${depositPct}% ตามใบเสนอราคา ${qNum}`,
    taxRate: String(taxRate),
    tax: String(depositVat),
    total: String(depositAmount),
    linkedQuotationId: quotation?.documentId || quotation?.id || '',
    linkedQuotationNumber: qNum,
    linkedSOId: so?.id || '',
    depositPercentage: depositPct,
    depositAmount,
    balanceAmount,
    items: (quotation?.items || []).map((item: any) => ({
      id: item?.id || '', productCode: item?.productCode || '',
      productName: item?.productName || '', quantity: item?.quantity || '',
      cost: item?.cost || '', margin: item?.margin || '',
      sellingPrice: item?.sellingPrice || '', totalCost: item?.totalCost || '',
      totalSellingPrice: item?.totalSellingPrice || '',
      unitCode: item?.unitCode || item?.unitId || '',
    })),
  };
};

export const buildDepositInvoiceDraftFromSO = (so: any) => {
  const soNum = String(so?.soNumber || '').trim();
  const today = toDateInputValue(new Date());
  const soTotal = (so?.items || []).reduce((s: number, i: any) => {
    const qty = Number(i?.quantity || i?.qty || 0);
    const price = Number(i?.sellingPrice || i?.unitPrice || 0);
    return s + (Number(i?.totalSellingPrice || 0) || Number(i?.amount || 0) || (qty * price));
  }, 0);
  const depositPct = 30;
  const depositAmount = Math.round((soTotal * depositPct / 100) * 100) / 100;
  const balanceAmount = Math.round((soTotal - depositAmount) * 100) / 100;
  const taxRate = 7;
  const depositBase = Math.round((depositAmount / (1 + taxRate / 100)) * 100) / 100;
  const depositVat = Math.round((depositAmount - depositBase) * 100) / 100;

  return {
    __mode: 'create',
    title: `ใบแจ้งหนี้มัดจำ — ${so?.customerName || soNum}`,
    documentDate: today,
    customer: so?.customerCode || '',
    billTo: so?.customerName || '',
    paymentTerm: so?.paymentTerm || '',
    paymentMethod: so?.paymentMethod || 'Bank Transfer',
    referenceNo: soNum,
    status: 'Draft',
    remark: `มัดจำ ${depositPct}% ตามใบสั่งขาย ${soNum}`,
    taxRate: String(taxRate),
    tax: String(depositVat),
    total: String(depositAmount),
    linkedQuotationId: '',
    linkedQuotationNumber: '',
    linkedSOId: so?.id || '',
    linkedSONumber: soNum,
    depositPercentage: depositPct,
    depositAmount,
    balanceAmount,
    items: (so?.items || []).map((item: any) => {
      const qty = item?.quantity || item?.qty || '';
      const price = item?.sellingPrice || item?.unitPrice || '';
      const lineTotal = item?.totalSellingPrice || item?.amount
        || (Number(qty) * Number(price) || '');
      return {
        id: item?.id || '',
        productCode: item?.productCode || '',
        productName: item?.productName || item?.description || '',
        quantity: String(qty),
        cost: item?.cost || '',
        margin: item?.margin || '',
        sellingPrice: String(price),
        totalCost: item?.totalCost || '',
        totalSellingPrice: String(lineTotal),
        unitCode: item?.unitCode || item?.unit || '',
      };
    }),
  };
};

export const buildDPFromDepositInvoice = (di: any) => {
  const diNum = String(di?.documentNumber || '').trim();
  const today = toDateInputValue(new Date());
  const pct = Number(di?.depositPercentage || 30) / 100;
  const storedAmount = Number(di?.depositAmount || di?.total || 0);
  const itemsTotal = (di?.items || []).reduce(
    (s: number, i: any) => s + Number(i?.totalSellingPrice || 0), 0,
  );
  const paymentAmount = storedAmount || Math.round(itemsTotal * pct * 100) / 100;
  return {
    __mode: 'create',
    title: `ใบรับมัดจำ — ${di?.title || diNum}`,
    documentDate: today,
    customer: di?.customer || '',
    billTo: di?.billTo || '',
    paymentTerm: di?.paymentTerm || '',
    paymentMethod: di?.paymentMethod || 'Bank Transfer',
    referenceNo: diNum,
    status: 'Received',
    remark: `รับเงินมัดจำ ${di?.depositPercentage || 30}% ตามใบแจ้งหนี้มัดจำ ${diNum}`,
    taxRate: String(di?.taxRate || 7),
    receivedDate: today,
    paymentReference: '',
    paymentAmount: String(paymentAmount),
    paymentType: 'partial',
    linkedQuotationId: di?.linkedQuotationId || '',
    linkedQuotationNumber: di?.linkedQuotationNumber || '',
    linkedSOId: di?.linkedSOId || '',
    linkedDIId: di?.documentId || '',
    linkedDINumber: di?.documentNumber || '',
    items: (di?.items || []).map((item: any) => ({
      id: item?.id || '', productCode: item?.productCode || '',
      productName: item?.productName || '', quantity: item?.quantity || '',
      cost: item?.cost || '', margin: item?.margin || '',
      sellingPrice: item?.sellingPrice || '', totalCost: item?.totalCost || '',
      totalSellingPrice: item?.totalSellingPrice || '', unitId: item?.unitId || '',
    })),
  };
};

export const buildInvoiceFromSO = (
  so: any,
  di?: any,
  customerExtra?: { customerTaxId: string; customerBranch: string },
  doDoc?: any,
) => {
  const soNum = String(so?.soNumber || '').trim();
  const today = toDateInputValue(new Date());
  const soTotal = (so?.items || []).reduce((s: number, i: any) => {
    return s + (Number(i?.amount || 0) || Number(i?.qty || 0) * Number(i?.unitPrice || 0));
  }, 0);
  const diNum = di ? String(di?.documentNumber || '').trim() : '';
  const depositAmt = di ? Number(di?.depositAmount || di?.total || 0) : 0;
  const balanceAmt = Math.round((soTotal - depositAmt) * 100) / 100;
  const doNum = doDoc ? String(doDoc?.documentNumber || '').trim() : '';

  return {
    __mode: 'create',
    title: `ใบแจ้งหนี้ — ${so?.customerName || soNum}`,
    documentDate: today,
    customer: so?.customerCode || '',
    billTo: so?.customerName || '',
    paymentTerm: so?.paymentTerm || '',
    paymentMethod: 'Bank Transfer',
    referenceNo: soNum,
    status: 'Pending',
    remark: di
      ? `ใบแจ้งหนี้ หักมัดจำ ${depositAmt.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท ตาม ${diNum} อ้างอิงใบสั่งขาย ${soNum}`
      : `อ้างอิงใบสั่งขาย ${soNum}`,
    taxRate: String(7),
    linkedSOId: so?.id || '',
    linkedSONumber: soNum,
    linkedQuotationId: '',
    linkedQuotationNumber: '',
    depositAmountDeducted: String(depositAmt),
    linkedDepositReceiptId: di?.documentId || di?.id || '',
    linkedDepositReceiptNumber: diNum,
    total: String(di ? balanceAmt : soTotal),
    customerTaxId: customerExtra?.customerTaxId || '',
    customerBranch: customerExtra?.customerBranch || '',
    paymentStatus: 'PENDING',
    doNo: doNum,
    items: (so?.items || []).map((item: any) => ({
      id: '',
      productCode: item?.productCode || '',
      productName: item?.description || item?.productName || '',
      quantity: String(item?.qty || item?.quantity || ''),
      cost: '',
      margin: '',
      sellingPrice: String(item?.unitPrice || item?.sellingPrice || ''),
      totalCost: '',
      totalSellingPrice: String(item?.amount || item?.totalSellingPrice || ''),
      unitId: item?.unit || '',
    })),
  };
};

export const buildBalanceInvoiceFromDP = (dp: any, doDoc?: any) => {
  const dpNum = String(dp?.documentNumber || '').trim();
  const today = toDateInputValue(new Date());
  const balanceAmount = Number(dp?.balanceAmount || 0);  // stored on DI, passed via dp context
  const doNum = doDoc ? String(doDoc?.documentNumber || '').trim() : '';
  return {
    __mode: 'create',
    title: `ใบแจ้งหนี้งวดสุดท้าย — ${dp?.title || dpNum}`,
    documentDate: today,
    customer: dp?.customer || '',
    billTo: dp?.billTo || '',
    paymentTerm: dp?.paymentTerm || '',
    paymentMethod: dp?.paymentMethod || 'Bank Transfer',
    referenceNo: dpNum,
    status: 'Pending',
    remark: `ใบแจ้งหนี้งวดสุดท้าย หักมัดจำ ${dp?.paymentAmount || 0} บาท ตาม ${dpNum}`,
    taxRate: String(dp?.taxRate || 7),
    total: String(balanceAmount),
    linkedDepositReceiptId: dp?.documentId || dp?.id || '',
    linkedDepositReceiptNumber: dpNum,
    depositAmountDeducted: Number(dp?.paymentAmount || 0),
    linkedSOId: dp?.linkedSOId || '',
    linkedQuotationId: dp?.linkedQuotationId || '',
    linkedQuotationNumber: dp?.linkedQuotationNumber || '',
    doNo: doNum,
    items: (dp?.items || []).map((item: any) => ({
      id: item?.id || '', productCode: item?.productCode || '',
      productName: item?.productName || '', quantity: item?.quantity || '',
      cost: item?.cost || '', margin: item?.margin || '',
      sellingPrice: item?.sellingPrice || '', totalCost: item?.totalCost || '',
      totalSellingPrice: item?.totalSellingPrice || '', unitId: item?.unitId || '',
    })),
  };
};

export const buildReceiptDraftFromBalanceInvoice = (invoice: any, dp: any) => {
  const invNum = String(invoice?.documentNumber || '').trim();
  const today = toDateInputValue(new Date());
  const qtTotal = Number(invoice?.total || 0) + Number(dp?.paymentAmount || 0);
  const depositAmt = Number(dp?.paymentAmount || 0);
  const balanceNet = Number(invoice?.total || 0);
  const taxRate = Number(invoice?.taxRate || 7);
  const balanceBase = Math.round((balanceNet / (1 + taxRate / 100)) * 100) / 100;
  const balanceVat = Math.round((balanceNet - balanceBase) * 100) / 100;

  return {
    __mode: 'create',
    title: `ใบเสร็จรับเงิน — ${invoice?.title || invNum}`,
    documentDate: today,
    customer: invoice?.customer || '',
    billTo: invoice?.billTo || '',
    paymentTerm: invoice?.paymentTerm || '',
    paymentMethod: invoice?.paymentMethod || '',
    referenceNo: invNum,
    status: 'Received',
    remark: `รับชำระเงินงวดสุดท้าย อ้างอิง ${invNum}`,
    taxRate: String(taxRate),
    tax: String(balanceVat),
    total: String(balanceNet),
    receivedDate: today,
    paymentReference: '',
    linkedInvoiceId: invoice?.documentId || invoice?.id || '',
    linkedInvoiceNumber: invNum,
    linkedDepositReceiptId: dp?.documentId || dp?.id || '',
    linkedDepositReceiptNumber: String(dp?.documentNumber || ''),
    linkedSOId: invoice?.linkedSOId || dp?.linkedSOId || '',
    linkedQuotationId: invoice?.linkedQuotationId || dp?.linkedQuotationId || '',
    linkedQuotationNumber: invoice?.linkedQuotationNumber || dp?.linkedQuotationNumber || '',
    depositAmountDeducted: depositAmt,
    // These drive the DepositDeductionSummary display
    qtTotal,
    dpNumber: String(dp?.documentNumber || ''),
    depositPercentage: Number(dp?.depositPercentage || 30),
    balanceNet,
    balanceBase,
    balanceVat,
    items: (invoice?.items || []).map((item: any) => ({
      id: item?.id || '', productCode: item?.productCode || '',
      productName: item?.productName || '', quantity: item?.quantity || '',
      margin: item?.margin || '', sellingPrice: item?.sellingPrice || '',
      totalCost: item?.totalCost || '', totalSellingPrice: item?.totalSellingPrice || '',
      unitId: item?.unitId || '',
    })),
  };
};
