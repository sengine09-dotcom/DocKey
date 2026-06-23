import { ulid } from 'ulid';
import { prisma } from './prisma';
import { recordStockMove } from './stockService';

const DOCUMENT_TYPE_MAP = {
  quotation: 'QUOTATION',
  invoice: 'INVOICE',
  receipt: 'RECEIPT',
  deposit_receipt: 'DEPOSIT_RECEIPT',
  deposit_invoice: 'DEPOSIT_INVOICE',
  purchase_order: 'PURCHASE_ORDER',
  work_order: 'WORK_ORDER',
  delivery_order: 'DELIVERY_ORDER',
  customer_return: 'CUSTOMER_RETURN',
} as const;

const PRISMA_TO_APP_DOCUMENT_TYPE = {
  QUOTATION: 'quotation',
  INVOICE: 'invoice',
  RECEIPT: 'receipt',
  DEPOSIT_RECEIPT: 'deposit_receipt',
  DEPOSIT_INVOICE: 'deposit_invoice',
  PURCHASE_ORDER: 'purchase_order',
  WORK_ORDER: 'work_order',
  DELIVERY_ORDER: 'delivery_order',
  CUSTOMER_RETURN: 'customer_return',
} as const;

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

const DOCUMENT_PREFIX: Record<MainDocumentType, string> = {
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

type MainDocumentType = keyof typeof DOCUMENT_TYPE_MAP;

// Lightweight includes — only the relevant type-specific relation per query type
const TYPE_RELATION_MAP: Record<string, object> = {
  quotation:        { quotationDocument: true },
  invoice:          { invoiceDocument: true },
  receipt:          { receiptDocument: true },
  deposit_receipt:  { depositReceiptDocument: true },
  deposit_invoice:  { depositInvoiceDocument: true },
  purchase_order:   { purchaseOrderDocument: true },
  work_order:       { workOrderDocument: true },
  delivery_order:   { deliveryOrderDocument: true },
  customer_return:  { customerReturnDocument: true },
};

const buildListInclude = (type: MainDocumentType) =>
  TYPE_RELATION_MAP[type] ?? {};

const buildDetailInclude = (type: MainDocumentType) => ({
  ...buildListInclude(type),
  items: { orderBy: { lineNo: 'asc' as const } },
});

const toNumber = (value: any) => (value == null || value === '' ? 0 : Number(value));

const parseNullableNumber = (value: any) => {
  if (value == null || value === '') {
    return null;
  }

  return Number(value);
};

const parseDate = (value: any) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseString = (value: any) => {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  return text === '' ? null : text;
};

const parseLegacyInvoiceNo = (value: any) => {
  const text = parseString(value);
  if (!text) {
    return null;
  }

  return text.length <= 8 ? text : null;
};

const parseDocumentType = (value: string): MainDocumentType | null => {
  const normalized = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return normalized in DOCUMENT_TYPE_MAP ? (normalized as MainDocumentType) : null;
};

const getPrismaDocumentType = (type: MainDocumentType) => DOCUMENT_TYPE_MAP[type];

//const getDocumentYearPart = () => String(new Date().getFullYear()).slice(-2);

const isAutoDocumentNumber = (type: MainDocumentType, value: string | null) => {
  const documentNumber = String(value || '').trim();
  if (!documentNumber) {
    return false;
  }

  return new RegExp(`^${DOCUMENT_PREFIX[type]}-\\d{2}-\\d{6}$`).test(documentNumber);
};

const buildFallbackDocumentNumber = async (type: MainDocumentType, companyId: string) => {
  const yearPart = String(new Date().getFullYear()).slice(-2);
  const prefix = `${DOCUMENT_PREFIX[type]}-${yearPart}-`;
  const latestDocument = await prisma.document.findFirst({
    where: {
      companyId,
      documentType: getPrismaDocumentType(type),
      documentNumber: {
        startsWith: prefix,
      },
    },
    select: {
      documentNumber: true,
    },
    orderBy: {
      documentNumber: 'desc',
    },
  });

  const latestDocumentParts = String(latestDocument?.documentNumber || '').split('-');
  const latestSequence = Number(latestDocumentParts[latestDocumentParts.length - 1] || 0);
  const nextSequence = String(latestSequence + 1).padStart(6, '0');
  return `${prefix}${nextSequence}`;
};

const buildStatusColor = (status: string) => {
  const normalized = String(status || '').toLowerCase();
  if (['paid', 'printed', 'received', 'completed', 'confirmed', 'approved', 'won', 'converted'].includes(normalized)) return 'green';
  if (['overdue', 'cancelled', 'rejected', 'expired', 'lost'].includes(normalized)) return 'red';
  if (['sent', 'open', 'scheduled'].includes(normalized)) return 'blue';
  if (['pending approval'].includes(normalized)) return 'amber';
  return 'yellow';
};

const buildInvoiceStatus = (statusOnline: number | null | undefined) => {
  if (statusOnline === 2) return 'Paid';
  if (statusOnline === 3) return 'Overdue';
  return 'Pending';
};

const buildInvoiceStatusOnline = (status: string | null | undefined) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'paid') return 2;
  if (normalized === 'overdue') return 3;
  return 1;
};

const mapDocumentItem = (
  item: any,
  productNameMap: Record<string, string> = {},
  unitNameMap: Record<string, string> = {},
) => ({
  lineNo: item.lineNo,
  productCode: item.productCode || '',
  vendorCode: item.vendorCode || '',
  productName: item.product?.productName || productNameMap[String(item.productCode || '').trim()] || '',
  quantity: toNumber(item.quantity).toFixed(2),
  margin: toNumber(item.margin).toFixed(2),
  cost: toNumber(item.cost).toFixed(2),
  sellingPrice: toNumber(item.sellingPrice).toFixed(2),
  totalCost: toNumber(item.totalCost).toFixed(2),
  totalSellingPrice: toNumber(item.totalSellingPrice).toFixed(2),
  unitCode: item.unitId || '',
  unitName: unitNameMap[String(item.unitId || '').trim()] || '',
});

const buildCustomerNameMap = async (documents: any[], companyId: string) => {
  const customerCodes = Array.from(new Set(
    documents
      .map((document) => String(document?.customerId || '').trim())
      .filter(Boolean)
  ));

  if (customerCodes.length === 0) {
    return {} as Record<string, string>;
  }

  const customers = await prisma.customer.findMany({
    where: {
      companyId,
      customerCode: { in: customerCodes },
    },
    select: {
      customerCode: true,
      customerName: true,
    },
  });

  return customers.reduce((result, customer) => {
    const customerName = customer.customerName || customer.customerCode;
    result[customer.customerCode] = customerName;
    return result;
  }, {} as Record<string, string>);
};

const buildProductNameMap = async (documents: any[], companyId: string) => {
  const productCodes = Array.from(new Set(
    documents
      .flatMap((document) => Array.isArray(document?.items) ? document.items : [])
      .map((item) => String(item?.productCode || '').trim())
      .filter(Boolean)
  ));

  if (productCodes.length === 0) {
    return {} as Record<string, string>;
  }

  const products = await prisma.product.findMany({
    where: {
      companyId,
      productCode: { in: productCodes },
    },
    select: {
      productCode: true,
      productName: true,
    },
  });

  return products.reduce((result, product) => {
    result[product.productCode] = product.productName || product.productCode;
    return result;
  }, {} as Record<string, string>);
};

const buildUnitNameMap = async (documents: any[], companyId: string) => {
  const unitCodes = Array.from(new Set(
    documents
      .flatMap((doc) => Array.isArray(doc?.items) ? doc.items : [])
      .map((item) => String(item?.unitId || '').trim())
      .filter(Boolean)
  ));

  if (unitCodes.length === 0) return {} as Record<string, string>;

  const units = await prisma.unitCode.findMany({
    where: { companyId, unitCode: { in: unitCodes } },
    select: { unitCode: true, unitName: true },
  });

  return units.reduce((acc, u) => {
    acc[u.unitCode] = u.unitName || u.unitCode;
    return acc;
  }, {} as Record<string, string>);
};

const mapDocumentRecord = (
  document: any,
  customerNameMap: Record<string, string> = {},
  productNameMap: Record<string, string> = {},
  unitNameMap: Record<string, string> = {},
) => {
  const documentType = PRISMA_TO_APP_DOCUMENT_TYPE[document.documentType as keyof typeof PRISMA_TO_APP_DOCUMENT_TYPE] as MainDocumentType;
  const items = (document.items || []).map((item: any) => mapDocumentItem(item, productNameMap, unitNameMap));
  const status = document.status || DOCUMENT_DEFAULT_STATUS[documentType];
  const customerCode = document.customerId || '';

  const baseRecord = {
    id: document.id,
    documentId: document.id,
    documentType,
    documentNumber: document.documentNumber,
    title: document.title || '',
    documentDate: document.documentDate,
    customer: customerCode,
    customerName: customerNameMap[customerCode] || '',
    billTo: document.billTo || '',
    shipTo: document.shipTo || document.destinationId || '',
    destination: document.destinationId || '',
    paymentTerm: document.paymentTermId || '',
    paymentMethod: document.paymentMethod || '',
    referenceNo: document.referenceNo || '',
    status,
    remark: document.remark || '',
    profitPercent: toNumber(document.profitPercent),
    subtotal: toNumber(document.subtotal),
    tax: toNumber(document.taxAmount),
    taxRate: toNumber(document.taxRate),
    total: toNumber(document.totalAmount),
    amount: toNumber(document.totalAmount),
    totalQuantity: toNumber(document.totalQuantity),
    margin: toNumber(document.margin),
    itemCount: items.length,
    lastUpdated: document.updatedAt,
    color: buildStatusColor(status),
    items,
  };

  if (documentType === 'invoice') {
    return {
      ...baseRecord,
      invoiceId: document.documentNumber,
      invoiceNo: document.documentNumber,
      invoiceDate: document.documentDate,
      dueDate: document.invoiceDocument?.dueDate || null,
      doNo: document.invoiceDocument?.doNo || '',
      statusOnline: document.invoiceDocument?.statusOnline ?? buildInvoiceStatusOnline(status),
      linkedQuotationId: document.invoiceDocument?.linkedQuotationId || '',
      linkedQuotationNumber: document.invoiceDocument?.linkedQuotationNumber || '',
      linkedDepositReceiptId: document.invoiceDocument?.linkedDepositReceiptId || '',
      linkedSOId: document.invoiceDocument?.linkedSOId || '',
    };
  }

  if (documentType === 'quotation') {
    return {
      ...baseRecord,
      validUntil: document.quotationDocument?.validUntil || null,
      attentionTo: document.quotationDocument?.attentionTo || '',
      linkedInvoiceId: document.quotationDocument?.linkedInvoiceId || '',
      linkedInvoiceNumber: document.quotationDocument?.linkedInvoiceNumber || '',
    };
  }

  if (documentType === 'receipt') {
    return {
      ...baseRecord,
      receivedDate: document.receiptDocument?.receivedDate || null,
      paymentReference: document.receiptDocument?.paymentReference || '',
      linkedInvoiceId: document.receiptDocument?.linkedInvoiceId || '',
      linkedInvoiceNumber: document.receiptDocument?.linkedInvoiceNumber || '',
      linkedDepositReceiptId: document.receiptDocument?.linkedDepositReceiptId || '',
      linkedSOId: document.receiptDocument?.linkedSOId || '',
      depositAmountDeducted: parseNullableNumber(document.receiptDocument?.depositAmountDeducted),
    };
  }

  if (documentType === 'deposit_receipt') {
    return {
      ...baseRecord,
      receivedDate: document.depositReceiptDocument?.receivedDate || null,
      paymentReference: document.depositReceiptDocument?.paymentReference || '',
      paymentAmount: toNumber(document.depositReceiptDocument?.paymentAmount),
      paymentType: document.depositReceiptDocument?.paymentType || 'full',
      linkedQuotationId: document.depositReceiptDocument?.linkedQuotationId || '',
      linkedQuotationNumber: document.depositReceiptDocument?.linkedQuotationNumber || '',
      linkedSOId: document.depositReceiptDocument?.linkedSOId || '',
    };
  }

  if (documentType === 'deposit_invoice') {
    return {
      ...baseRecord,
      linkedQuotationId: document.depositInvoiceDocument?.linkedQuotationId || '',
      linkedSOId: document.depositInvoiceDocument?.linkedSOId || '',
      depositPercentage: toNumber(document.depositInvoiceDocument?.depositPercentage),
      depositAmount: toNumber(document.depositInvoiceDocument?.depositAmount),
      balanceAmount: toNumber(document.depositInvoiceDocument?.balanceAmount),
    };
  }

  if (documentType === 'purchase_order') {
    return {
      ...baseRecord,
      vendorCode: document.purchaseOrderDocument?.vendorCode || '',
      supplierName: document.purchaseOrderDocument?.supplierName || '',
      deliveryDate: document.purchaseOrderDocument?.deliveryDate || null,
      vendorQuotationNo: document.purchaseOrderDocument?.vendorQuotationNo || '',
    };
  }

  if (documentType === 'work_order') {
    return {
      ...baseRecord,
      scheduledDate: document.workOrderDocument?.scheduledDate || null,
      assignedTo: document.workOrderDocument?.assignedTo || '',
    };
  }

  if (documentType === 'delivery_order') {
    return {
      ...baseRecord,
      quotationId: document.deliveryOrderDocument?.quotationId || '',
      quotationNumber: document.deliveryOrderDocument?.quotationNumber || '',
    };
  }

  return {
    ...baseRecord,
    refDocNumber: document.customerReturnDocument?.refDocNumber || '',
  };
};

const buildDocumentWhere = (type: MainDocumentType, identifier: string, companyId: string) => {
  const prismaType = getPrismaDocumentType(type);

  return {
    companyId,
    documentType: prismaType,
    OR: [
      { id: identifier },
      { documentNumber: identifier },
    ],
  };
};

const fetchDocumentRecord = async (type: MainDocumentType, identifier: string, companyId: string) => {
  const document = await prisma.document.findFirst({
    where: buildDocumentWhere(type, identifier, companyId),
    include: buildDetailInclude(type),
  });
  if (!document) {
    return null;
  }
  const [customerNameMap, productNameMap, unitNameMap] = await Promise.all([
    buildCustomerNameMap([document], companyId),
    buildProductNameMap([document], companyId),
    buildUnitNameMap([document], companyId),
  ]);
  return mapDocumentRecord(document, customerNameMap, productNameMap, unitNameMap);
};

const buildSubtypeUpsert = (type: MainDocumentType, header: any, documentId: string, documentNumber: string) => {
  
  if (type === 'invoice') {
    return prisma.invoiceDocument.upsert({
      where: { id : documentId },
      create: {
        id: documentId,
        documentNumber,
        dueDate: parseDate(header.dueDate),
        doNo: parseString(header.doNo),
        linkedReceiptId: '',
        linkedReceiptNumber: '',
        linkedDepositReceiptId: parseString(header.linkedDepositReceiptId),
        linkedSOId: parseString(header.linkedSOId),
      } as any,
      update: {
        documentNumber,
        dueDate: parseDate(header.dueDate),
        doNo: parseString(header.doNo),
        linkedDepositReceiptId: parseString(header.linkedDepositReceiptId),
        linkedSOId: parseString(header.linkedSOId),
      } as any,
    });
  }

  if (type === 'quotation') {
    return prisma.quotationDocument.upsert({
      where: { id: documentId },
      create: {
        id: documentId,
        documentNumber,
        attentionTo: '',
        linkedInvoiceId: '',
        linkedInvoiceNumber: '',
      },
      update: {
        documentNumber,
        attentionTo: '',
      } as any,
    });
  }

  if (type === 'receipt') {
    return prisma.receiptDocument.upsert({
      where: { id: documentId },
      create: {
        id: documentId,
        documentNumber,
        receivedDate: parseDate(header.receivedDate),
        paymentReference: parseString(header.paymentReference),
        linkedDepositReceiptId: parseString(header.linkedDepositReceiptId),
        linkedSOId: parseString(header.linkedSOId),
        depositAmountDeducted: parseNullableNumber(header.depositAmountDeducted),
      },
      update: {
        documentNumber,
        receivedDate: parseDate(header.receivedDate),
        paymentReference: parseString(header.paymentReference),
        linkedDepositReceiptId: parseString(header.linkedDepositReceiptId),
        linkedSOId: parseString(header.linkedSOId),
        depositAmountDeducted: parseNullableNumber(header.depositAmountDeducted),
      },
    });
  }

  if (type === 'deposit_receipt') {
    return prisma.depositReceiptDocument.upsert({
      where: { id: documentId },
      create: {
        id: documentId,
        documentNumber,
        receivedDate: parseDate(header.receivedDate),
        paymentReference: parseString(header.paymentReference),
        paymentAmount: parseNullableNumber(header.paymentAmount),
        paymentType: parseString(header.paymentType),
        linkedQuotationId: parseString(header.linkedQuotationId),
        linkedQuotationNumber: parseString(header.linkedQuotationNumber),
        linkedSOId: parseString(header.linkedSOId),
      },
      update: {
        documentNumber,
        receivedDate: parseDate(header.receivedDate),
        paymentReference: parseString(header.paymentReference),
        paymentAmount: parseNullableNumber(header.paymentAmount),
        paymentType: parseString(header.paymentType),
        linkedQuotationId: parseString(header.linkedQuotationId),
        linkedQuotationNumber: parseString(header.linkedQuotationNumber),
        linkedSOId: parseString(header.linkedSOId),
      },
    });
  }

  if (type === 'deposit_invoice') {
    return prisma.depositInvoiceDocument.upsert({
      where: { documentId },
      create: {
        documentId,
        documentNumber,
        linkedQuotationId: parseString(header.linkedQuotationId),
        linkedSOId: parseString(header.linkedSOId),
        depositPercentage: toNumber(header.depositPercentage) || 30,
        depositAmount: toNumber(header.depositAmount),
        balanceAmount: toNumber(header.balanceAmount),
      },
      update: {
        documentNumber,
        linkedQuotationId: parseString(header.linkedQuotationId),
        linkedSOId: parseString(header.linkedSOId),
        depositPercentage: toNumber(header.depositPercentage) || 30,
        depositAmount: toNumber(header.depositAmount),
        balanceAmount: toNumber(header.balanceAmount),
      },
    });
  }

  if (type === 'purchase_order') {
    return prisma.purchaseOrderDocument.upsert({
      where: { id: documentId },
      create: {
        id: documentId,
        documentNumber,
        vendorCode: parseString(header.vendorCode),
        supplierName: parseString(header.supplierName),
        deliveryDate: parseDate(header.deliveryDate),
        vendorQuotationNo: parseString(header.vendorQuotationNo),
      },
      update: {
        documentNumber,
        vendorCode: parseString(header.vendorCode),
        supplierName: parseString(header.supplierName),
        deliveryDate: parseDate(header.deliveryDate),
        vendorQuotationNo: parseString(header.vendorQuotationNo),
      },
    });
  }

  if (type === 'work_order') {
    return prisma.workOrderDocument.upsert({
      where: { id: documentId },
      create: {
        id: documentId,
        documentNumber,
        scheduledDate: parseDate(header.scheduledDate),
        assignedTo: parseString(header.assignedTo),
      },
      update: {
        documentNumber,
        scheduledDate: parseDate(header.scheduledDate),
        assignedTo: parseString(header.assignedTo),
      },
    });
  }

  if (type === 'delivery_order') {
    return prisma.deliveryOrderDocument.upsert({
      where: { id: documentId },
      create: {
        id: documentId,
        documentNumber,
        quotationId: parseString(header.quotationId),
        quotationNumber: parseString(header.quotationNumber),
      },
      update: {
        documentNumber,
        quotationId: parseString(header.quotationId),
        quotationNumber: parseString(header.quotationNumber),
      },
    });
  }

  return prisma.customerReturnDocument.upsert({
    where: { id: documentId },
    create: {
      id: documentId,
      documentNumber,
      refDocNumber: parseString(header.refDocNumber),
    },
    update: {
      documentNumber,
      refDocNumber: parseString(header.refDocNumber),
    },
  });
};

interface ListOptions {
  limit?: number;
  search?: string;
  customer?: string;
  vendorCode?: string;
}

export const listDocumentsByType = async (typeInput: string, companyId: string, options: ListOptions = {}) => {
  const type = parseDocumentType(typeInput);
  if (!type) {
    throw new Error('Invalid document type');
  }

  const { limit, search, customer, vendorCode } = options;

  const where: any = { companyId, documentType: getPrismaDocumentType(type) };

  if (customer) {
    where.customerId = customer;
  }

  if (vendorCode) {
    where.items = { some: { vendorCode } };
  }

  if (search) {
    const likeSearch = { contains: search };
    where.OR = [
      { documentNumber: likeSearch },
      { title: likeSearch },
      { referenceNo: likeSearch },
      { remark: likeSearch },
      { customerId: likeSearch },
    ];
  }

  const documents = await prisma.document.findMany({
    where,
    include: buildDetailInclude(type),
    orderBy: [{ documentDate: 'desc' }, { updatedAt: 'desc' }],
    ...(limit ? { take: limit } : {}),
  });
  const [customerNameMap, productNameMap, unitNameMap] = await Promise.all([
    buildCustomerNameMap(documents, companyId),
    buildProductNameMap(documents, companyId),
    buildUnitNameMap(documents, companyId),
  ]);
  return documents.map((document) => mapDocumentRecord(document, customerNameMap, productNameMap, unitNameMap));
};

export const getDocumentById = async (typeInput: string, identifier: string, companyId: string) => {
  const type = parseDocumentType(typeInput);
  if (!type) {
    throw new Error('Invalid document type');
  }
  return fetchDocumentRecord(type, identifier, companyId);
};

export const saveDocumentByType = async (typeInput: string, payload: any, companyId: string) => {
  const type = parseDocumentType(typeInput);
  if (!type) {
    throw new Error('Invalid document type');
  }


  const header = payload?.header || {};
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const requestedDocumentId = parseString(header.documentId || header.id);
  const requestedDocumentNumber = parseString(header.documentNumber);


  const prismaType = getPrismaDocumentType(type);
  const existingLookupConditions = [
    requestedDocumentId ? { id: requestedDocumentId } : undefined,
    requestedDocumentNumber && !isAutoDocumentNumber(type, requestedDocumentNumber) ? { documentNumber: requestedDocumentNumber } : undefined,
    type === 'invoice' && requestedDocumentNumber && !isAutoDocumentNumber(type, requestedDocumentNumber)
      ? { legacySourceId: requestedDocumentNumber }
      : undefined,
  ].filter(Boolean) as any[];

  const existing = existingLookupConditions.length > 0
    ? await prisma.document.findFirst({
      where: {
        companyId,
        documentType: prismaType,
        OR: existingLookupConditions,
      },
      include: { invoiceDocument: true },
    })
    : null;

  const documentNumber = existing?.documentNumber || await buildFallbackDocumentNumber(type, companyId);

  const documentId = existing?.id || requestedDocumentId || ulid();
  const status = parseString(header.status) || DOCUMENT_DEFAULT_STATUS[type];

  if (type === 'invoice') {
    const quotationReference = parseString(header.linkedQuotationNumber);

    if (quotationReference) {
      const duplicateLinkedInvoice = await prisma.document.findFirst({
        where: {
          companyId,
          documentType: prismaType,
          id: { not: documentId },
          referenceNo: quotationReference,
        },
        select: {
          documentNumber: true,
        },
      });


      if (duplicateLinkedInvoice) {
        throw new Error(`Quotation ${quotationReference} is already linked to invoice ${duplicateLinkedInvoice.documentNumber}`);
      }
    }
  }

  if (type === 'deposit_receipt') {
    const quotationReference = parseString(header.linkedQuotationNumber);

    if (quotationReference) {
      const duplicateDepositReceipt = await prisma.document.findFirst({
        where: {
          companyId,
          documentType: prismaType,
          id: { not: documentId },
          referenceNo: quotationReference,
        },
        select: {
          documentNumber: true,
        },
      });

      if (duplicateDepositReceipt) {
        throw new Error(`Quotation ${quotationReference} is already linked to deposit receipt ${duplicateDepositReceipt.documentNumber}`);
      }
    }
  }

  if (type === 'receipt') {
    const invoiceReference = parseString(header.linkedInvoiceNumber);

    if (invoiceReference) {
      const duplicateLinkedReceipt = await prisma.document.findFirst({
        where: {
          companyId,
          documentType: prismaType,
          id: { not: documentId },
          referenceNo: invoiceReference,
        },
        select: {
          documentNumber: true,
        },
      });

      if (duplicateLinkedReceipt) {
        throw new Error(`Invoice ${invoiceReference} is already linked to receipt ${duplicateLinkedReceipt.documentNumber}`);
      }
    }
  }

  if (type === 'invoice' && existing === null) {
    const linkedSOId = parseString(header.linkedSOId);

    if (linkedSOId) {
      // 1. Check DP exists for this SO
      const dp = await prisma.depositReceiptDocument.findFirst({
        where: { linkedSOId },
        select: { id: true },
      });
      if (!dp) {
        throw new Error('ยังไม่มีใบรับมัดจำสำหรับ SO นี้ กรุณาสร้างใบรับมัดจำก่อน');
      }

      // 2. 3-hop GR gate: SO items → PR items → GR
      const soItems = await prisma.sOItem.findMany({
        where: { soId: linkedSOId, convertedToPr: true },
        select: { prNumber: true },
      });
      const prNumbers = soItems
        .map(i => i.prNumber)
        .filter((v): v is string => Boolean(v));

      if (prNumbers.length === 0) {
        throw new Error('ยังไม่มีการรับสินค้า (GR) สำหรับ SO นี้');
      }

      const prItems = await prisma.pRItem.findMany({
        where: { prNumber: { in: prNumbers }, convertedToPo: true },
        select: { poNumber: true },
      });
      const poNumbers = prItems
        .map(i => i.poNumber)
        .filter((v): v is string => Boolean(v));

      if (poNumbers.length === 0) {
        throw new Error('ยังไม่มีการรับสินค้า (GR) สำหรับ SO นี้');
      }

      const gr = await prisma.goodsReceipt.findFirst({
        where: { poNumber: { in: poNumbers }, status: 'CONFIRMED', companyId },
        select: { id: true },
      });
      if (!gr) {
        throw new Error('ยังไม่มีการรับสินค้า (GR) สำหรับ SO นี้');
      }
    }
  }

  if (type === 'deposit_invoice' && existing === null) {
    const linkedSOId = parseString(header.linkedSOId);
    const linkedQTId = parseString(header.linkedQuotationId);
    const pct = toNumber(header.depositPercentage);

    if (!linkedSOId) {
      throw new Error('กรุณาระบุใบสั่งขาย (SO)');
    }
    if (!linkedQTId) {
      throw new Error('กรุณาระบุใบเสนอราคา (QT)');
    }
    if (pct < 1 || pct > 99) {
      throw new Error('เปอร์เซ็นต์มัดจำต้องอยู่ระหว่าง 1-99');
    }

    const so = await prisma.saleOrder.findFirst({
      where: { id: linkedSOId, companyId },
      select: { status: true },
    });
    if (!so) {
      throw new Error('ไม่พบใบสั่งขาย');
    }
    if (so.status !== 'CONFIRMED') {
      throw new Error('SO ยังไม่ยืนยัน กรุณายืนยัน SO ก่อนสร้างใบแจ้งหนี้มัดจำ');
    }

    const qt = await prisma.document.findFirst({
      where: { id: linkedQTId, companyId, documentType: 'QUOTATION' },
      select: { status: true },
    });
    if (!qt) {
      throw new Error('ไม่พบใบเสนอราคา');
    }
    if (qt.status !== 'Confirmed') {
      throw new Error('ใบเสนอราคายังไม่ได้รับการยืนยัน กรุณาเปลี่ยนสถานะ QT เป็น Confirmed');
    }
  }


  await prisma.document.upsert({
    where: { id: documentId },
    create: {
      id: documentId,
      companyId,
      documentType: prismaType,
      documentNumber,
      title: parseString(header.title) || type.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
      documentDate: parseDate(header.documentDate || header.invoiceDate || header.receivedDate),
      customerId: parseString(header.customer),
      billTo: parseString(header.billTo),
      shipTo: parseString(header.shipTo),
      destinationId: parseString(header.destination),
      paymentTermId: parseString(header.paymentTerm),
      paymentMethod: parseString(header.paymentMethod),
      referenceNo: parseString(header.referenceNo || header.poNo || header.linkedQuotationNumber),
      status,
      remark: parseString(header.remark),
      taxRate: toNumber(header.taxRate),
      taxAmount: toNumber(header.tax),
      totalAmount: toNumber(header.total),
      totalQuantity: toNumber(header.totalQuantity),
      margin: parseNullableNumber(header.margin) ?? 0,
      totalCost: parseNullableNumber(header.totalCost) ?? 0,
      totalSellingPrice: parseNullableNumber(header.totalSellingPrice) ?? 0,
      totalProfit: parseNullableNumber(header.totalProfit) ?? 0,
    },
    update: {
      documentNumber,
      title: parseString(header.title) || type.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
      documentDate: parseDate(header.documentDate || header.invoiceDate || header.receivedDate),
      customerId: parseString(header.customer),
      billTo: parseString(header.billTo),
      shipTo: parseString(header.shipTo),
      destinationId: parseString(header.destination || header.shipTo),
      paymentTermId: parseString(header.paymentTerm),
      paymentMethod: parseString(header.paymentMethod),
      referenceNo: parseString(header.referenceNo || header.poNo || header.linkedQuotationNumber),
      status,
      remark: parseString(header.remark),
      taxRate: toNumber(header.taxRate),
      taxAmount: toNumber(header.tax),
      totalAmount: toNumber(header.total),
      totalQuantity: toNumber(header.totalQuantity),
      margin: parseNullableNumber(header.margin) ?? 0,
      totalCost: parseNullableNumber(header.totalCost) ?? 0,
      totalSellingPrice: parseNullableNumber(header.totalSellingPrice) ?? 0,
      totalProfit: parseNullableNumber(header.totalProfit) ?? 0,
    },
  });

  // Calculate and update cost and selling price for Quotation
  if (type === 'quotation') {
    const margin = parseNullableNumber(header.margin) ?? 0;
    // Calculate cost: sum of costPrice * quantity for all items
    let totalCost = 0;
    if (Array.isArray(items)) {
      totalCost = items.reduce((sum, item) => {
        const qty = toNumber(item.quantity);
        const cost = toNumber(item.cost);
        return sum + (qty * cost);
      }, 0);
    }
    let totalSellingPrice = 0;
    if (Array.isArray(items)) {
      totalSellingPrice = items.reduce((sum, item) => {
        const qty = toNumber(item.quantity);
        const sellingPrice = toNumber(item.sellingPrice);
        return sum + (qty * sellingPrice);
      }, 0);
    }
    // Update Document with margin and cost
    await prisma.document.update({
      where: { id: documentId },
      data: { margin, totalCost, totalSellingPrice, totalProfit: totalSellingPrice - totalCost },
    });
  }

  await prisma.documentItem.deleteMany({
    where: {
      documentNumber,
      documentType: getPrismaDocumentType(type),
    },
  });


  const validItems = items.filter((item: any) => item?.productCode);
  const requestedProductCodes = Array.from(new Set(
    validItems
      .map((item: any) => parseString(item.productCode))
      .filter(Boolean)
  )) as string[];
  const existingProductCodeSet = new Set<string>();

  if (requestedProductCodes.length > 0) {
    const existingProducts = await prisma.product.findMany({
      where: {
        companyId,
        productCode: { in: requestedProductCodes },
      },
      select: {
        productCode: true,
      },
    });

    existingProducts.forEach((product) => {
      existingProductCodeSet.add(product.productCode);
    });
  }
  
  if (validItems.length > 0) {
    await prisma.documentItem.createMany({
      data: validItems.map((item: any, index: number) => ({
        id: ulid(),
        documentId,
        documentNumber,
        documentType: getPrismaDocumentType(type),
        lineNo: index + 1,
        productCode: existingProductCodeSet.has(String(parseString(item.productCode) || ''))
          ? parseString(item.productCode)
          : null,
        vendorCode: type === 'quotation' ? parseString(item.vendorCode) : null,
        cost: parseNullableNumber(item.cost),
        quantity: toNumber(item.quantity),
        margin: parseNullableNumber(item.margin),
        sellingPrice: parseNullableNumber(item.sellingPrice),
        totalCost: parseNullableNumber(item.totalCost),
        totalSellingPrice: parseNullableNumber(item.totalSellingPrice),
        unitId: parseString(item.unitCode || item.unitId),
      })),
    });
  } else {
  }

  await buildSubtypeUpsert(type, { ...header, status }, documentId, documentNumber);

  // Stock deduction on first save of DO; stock return on first save of CUSTOMER_RETURN
  const isStockDoc = type === 'delivery_order' || type === 'customer_return';
  if (isStockDoc && existing === null) {
    const direction = type === 'delivery_order' ? 'OUT' : 'IN';
    const stockItems = validItems
      .map((item: any) => ({
        productCode: String(parseString(item.productCode) || ''),
        qty: toNumber(item.quantity),
      }))
      .filter((i) => i.productCode && i.qty > 0);

    if (stockItems.length > 0) {
      const productRows = await prisma.product.findMany({
        where: { companyId, productCode: { in: stockItems.map((i) => i.productCode) } },
        select: { id: true, productCode: true },
      });
      const productIdMap = new Map(productRows.map((p) => [p.productCode, p.id]));

      const moveItems = stockItems
        .map((i) => ({ ...i, productId: productIdMap.get(i.productCode) || '' }))
        .filter((i) => i.productId);

      if (moveItems.length > 0) {
        await prisma.$transaction(async (tx) => {
          await recordStockMove(tx, {
            items: moveItems,
            docNumber: documentNumber,
            docType: type === 'delivery_order' ? 'DELIVERY_ORDER' : 'CUSTOMER_RETURN',
            direction,
            companyId,
            docId: documentId,
            userId: parseString(header.createdBy) ?? undefined,
          });
        });
      }
    }
  }

  if (type === 'invoice') {
    const linkedQuotationNumber = parseString(header.linkedQuotationNumber);

    if (linkedQuotationNumber) {
      // Find the quotation document first to get its ID
      const quotationDoc = await prisma.document.findFirst({
        where: {
          companyId,
          documentType: DOCUMENT_TYPE_MAP.quotation,
          documentNumber: linkedQuotationNumber,
        },
        select: { id: true }
      });

      // Update quotation status and link invoice data
      await prisma.document.updateMany({
        where: {
          companyId,
          documentType: DOCUMENT_TYPE_MAP.quotation,
          documentNumber: linkedQuotationNumber,
        },
        data: {
          status: 'Link Invoice',
        },
      });

      // Update QuotationDocument with invoice linking data
      if (quotationDoc) {
        await prisma.quotationDocument.update({
          where: { id: quotationDoc.id },
          data: {
            linkedInvoiceId: documentId,
            linkedInvoiceNumber: documentNumber,
          } as any,
        });
      }
    }
  }

  if (type === 'receipt') {
    const linkedInvoiceNumber = parseString(header.linkedInvoiceNumber);

    if (linkedInvoiceNumber) {
      // Find the invoice document first to get its ID
      const invoiceDoc = await prisma.document.findFirst({
        where: {
          companyId,
          documentType: DOCUMENT_TYPE_MAP.invoice,
          documentNumber: linkedInvoiceNumber,
        },
        select: { id: true }
      });
      // Update invoice status and link receipt data
      await prisma.document.updateMany({
        where: {
          companyId,
          documentType: DOCUMENT_TYPE_MAP.invoice,
          documentNumber: linkedInvoiceNumber,
        },
        data: {
          status: 'Link Receipt',
        },
      });

      if (invoiceDoc) {
        // Update InvoiceDocument with receipt linking data
        await prisma.invoiceDocument.update({
          where: { id: invoiceDoc.id },
          data: {
            linkedReceiptId: documentId,
            linkedReceiptNumber: documentNumber,
          } as any,
        });
      }
    }
  }

  return fetchDocumentRecord(type, documentId, companyId);
};

export const deleteDocumentByType = async (typeInput: string, identifier: string, companyId: string) => {
  const type = parseDocumentType(typeInput);
  if (!type) {
    throw new Error('Invalid document type');
  }

  const existing = await prisma.document.findFirst({
    where: buildDocumentWhere(type, identifier, companyId),
    include: { invoiceDocument: true },
  });

  if (!existing) {
    return false;
  }

  await prisma.document.delete({ where: { id: existing.id } });
  return true;
};

export const isMainDocumentType = (value: string) => parseDocumentType(value) != null;