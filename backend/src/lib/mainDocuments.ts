import { ulid } from 'ulid';
import { prisma } from './prisma';

const DOCUMENT_TYPE_MAP = {
  quotation: 'QUOTATION',
  invoice: 'INVOICE',
  receipt: 'RECEIPT',
  purchase_order: 'PURCHASE_ORDER',
  work_order: 'WORK_ORDER',
} as const;

const PRISMA_TO_APP_DOCUMENT_TYPE = {
  QUOTATION: 'quotation',
  INVOICE: 'invoice',
  RECEIPT: 'receipt',
  PURCHASE_ORDER: 'purchase_order',
  WORK_ORDER: 'work_order',
} as const;

const DOCUMENT_DEFAULT_STATUS: Record<MainDocumentType, string> = {
  quotation: 'Draft',
  invoice: 'Pending',
  receipt: 'Received',
  purchase_order: 'Open',
  work_order: 'Open',
};

const DOCUMENT_PREFIX: Record<MainDocumentType, string> = {
  quotation: 'QT',
  invoice: 'INV',
  receipt: 'RC',
  purchase_order: 'PO',
  work_order: 'WO',
};

type MainDocumentType = keyof typeof DOCUMENT_TYPE_MAP;

const documentInclude = {
  items: { orderBy: { lineNo: 'asc' as const } },
  quotationDocument: true,
  invoiceDocument: true,
  receiptDocument: true,
  purchaseOrderDocument: true,
  workOrderDocument: true,
};

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
  const normalized = String(value || '').trim().toLowerCase().replace(/-/g, '_');
  return normalized in DOCUMENT_TYPE_MAP ? (normalized as MainDocumentType) : null;
};

const getPrismaDocumentType = (type: MainDocumentType) => DOCUMENT_TYPE_MAP[type];

const getDocumentYearPart = () => String(new Date().getFullYear()).slice(-2);

const isAutoDocumentNumber = (type: MainDocumentType, value: string | null) => {
  const documentNumber = String(value || '').trim();
  if (!documentNumber) {
    return false;
  }

  return new RegExp(`^${DOCUMENT_PREFIX[type]}-\\d{2}-\\d{6}$`).test(documentNumber);
};

const buildFallbackDocumentNumber = async (type: MainDocumentType) => {
  const yearPart = String(new Date().getFullYear()).slice(-2);
  const prefix = `${DOCUMENT_PREFIX[type]}-${yearPart}-`;
  const latestDocument = await prisma.document.findFirst({
    where: {
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
  if (['paid', 'printed', 'received', 'completed', 'approved', 'won', 'converted'].includes(normalized)) return 'green';
  if (['overdue', 'cancelled', 'rejected', 'expired', 'lost'].includes(normalized)) return 'red';
  if (['sent', 'open', 'scheduled', 'negotiating', 'follow up', 'waiting customer'].includes(normalized)) return 'blue';
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

const mapDocumentItem = (item: any) => ({
  id: item.productId || item.itemCode || '',
  itemCode: item.itemCode || item.productId || '',
  description: item.description || '',
  packing: item.packing || '',
  quantity: toNumber(item.quantity).toFixed(3),
  costPrice: toNumber(item.costPrice).toFixed(2),
  unitPrice: toNumber(item.unitPrice).toFixed(2),
  total: toNumber(item.totalAmount).toFixed(2),
  weight: toNumber(item.weight).toFixed(3),
  bag: item.bag == null ? '' : String(item.bag),
  lineNo: item.lineNo,
});

const buildCustomerNameMap = async (documents: any[]) => {
  const customerIds = Array.from(new Set(
    documents
      .map((document) => String(document?.customerId || '').trim())
      .filter(Boolean)
  ));

  if (customerIds.length === 0) {
    return {} as Record<string, string>;
  }

  const customers = await prisma.customer.findMany({
    where: {
      customerId: { in: customerIds },
    },
    select: {
      customerId: true,
      customerName: true,
    },
  });

  return customers.reduce((result, customer) => {
    const customerName = customer.customerName || customer.customerId;
    result[customer.customerId] = customerName;
    return result;
  }, {} as Record<string, string>);
};

const mapDocumentRecord = (document: any, customerNameMap: Record<string, string> = {}) => {
  const documentType = PRISMA_TO_APP_DOCUMENT_TYPE[document.documentType as keyof typeof PRISMA_TO_APP_DOCUMENT_TYPE] as MainDocumentType;
  const items = (document.items || []).map(mapDocumentItem);
  const status = document.status || DOCUMENT_DEFAULT_STATUS[documentType];
  const customerId = document.customerId || '';
  const baseRecord = {
    id: document.id,
    documentId: document.id,
    documentType,
    documentNumber: document.documentNumber,
    title: document.title || '',
    documentDate: document.documentDate,
    customer: customerId,
    customerName: customerNameMap[customerId] || '',
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
    };
  }

  if (documentType === 'quotation') {
    return {
      ...baseRecord,
      validUntil: document.quotationDocument?.validUntil || null,
      attentionTo: document.quotationDocument?.attentionTo || '',
    };
  }

  if (documentType === 'receipt') {
    return {
      ...baseRecord,
      receivedDate: document.receiptDocument?.receivedDate || null,
      paymentReference: document.receiptDocument?.paymentReference || '',
    };
  }

  if (documentType === 'purchase_order') {
    return {
      ...baseRecord,
      supplierName: document.purchaseOrderDocument?.supplierName || '',
      deliveryDate: document.purchaseOrderDocument?.deliveryDate || null,
    };
  }

  return {
    ...baseRecord,
    scheduledDate: document.workOrderDocument?.scheduledDate || null,
    assignedTo: document.workOrderDocument?.assignedTo || '',
  };
};

const buildDocumentWhere = (type: MainDocumentType, identifier: string) => {
  const prismaType = getPrismaDocumentType(type);

  return {
    documentType: prismaType,
    OR: [
      { id: identifier },
      { documentNumber: identifier },
      { legacySourceId: identifier },
    ],
  };
};

const fetchDocumentRecord = async (type: MainDocumentType, identifier: string) => {
  const document = await prisma.document.findFirst({
    where: buildDocumentWhere(type, identifier),
    include: documentInclude,
  });

  if (!document) {
    return null;
  }

  const customerNameMap = await buildCustomerNameMap([document]);
  return mapDocumentRecord(document, customerNameMap);
};

const syncLegacyInvoiceRecord = async (invoice: any) => {
  const existing = await prisma.document.findFirst({
    where: {
      documentType: DOCUMENT_TYPE_MAP.invoice,
      OR: [
        { legacySourceId: invoice.invoiceNo },
        { documentNumber: invoice.invoiceNo },
      ],
    },
  });

  const documentId = existing?.id || ulid();
  const status = buildInvoiceStatus(invoice.statusOnline);

  await prisma.document.upsert({
    where: { id: documentId },
    create: {
      id: documentId,
      documentType: DOCUMENT_TYPE_MAP.invoice,
      documentNumber: invoice.invoiceNo,
      legacySourceId: invoice.invoiceNo,
      title: 'Invoice',
      documentDate: invoice.invDate || null,
      customerId: invoice.customerId || null,
      billTo: invoice.customerId || null,
      shipTo: invoice.destinationId || null,
      destinationId: invoice.destinationId || null,
      paymentTermId: invoice.termId || null,
      paymentMethod: invoice.termId || null,
      referenceNo: invoice.poNo || null,
      status,
      remark: invoice.remark || null,
      taxRate: invoice.vat || 0,
      taxAmount: 0,
      totalAmount: invoice.totalAmount || 0,
      totalQuantity: invoice.totalQuantity || 0,
    },
    update: {
      documentNumber: invoice.invoiceNo,
      legacySourceId: invoice.invoiceNo,
      title: 'Invoice',
      documentDate: invoice.invDate || null,
      customerId: invoice.customerId || null,
      billTo: invoice.customerId || null,
      shipTo: invoice.destinationId || null,
      destinationId: invoice.destinationId || null,
      paymentTermId: invoice.termId || null,
      paymentMethod: invoice.termId || null,
      referenceNo: invoice.poNo || null,
      status,
      remark: invoice.remark || null,
      taxRate: invoice.vat || 0,
      taxAmount: 0,
      totalAmount: invoice.totalAmount || 0,
      totalQuantity: invoice.totalQuantity || 0,
    },
  });

  await prisma.documentItem.deleteMany({ where: { documentId } });

  if (invoice.invoiceDetails?.length) {
    await prisma.documentItem.createMany({
      data: invoice.invoiceDetails.map((item: any, index: number) => ({
        id: ulid(),
        documentId,
        lineNo: index + 1,
        productId: item.productId || null,
        itemCode: item.productId || null,
        description: item.productId || null,
        packing: null,
        quantity: item.quantity || 0,
        unitPrice: item.price || 0,
        totalAmount: item.total || 0,
        unitId: item.unitId || null,
        weight: item.weight || 0,
        bag: item.bag || 0,
      })),
    });
  }

  await prisma.invoiceDocument.upsert({
    where: { documentId },
    create: {
      documentId,
      dueDate: null,
      doNo: invoice.doNo || null,
      monitorReference: invoice.idMonitor || null,
      statusOnline: invoice.statusOnline ?? 1,
      legacyInvoiceNo: parseLegacyInvoiceNo(invoice.invoiceNo),
    },
    update: {
      dueDate: null,
      doNo: invoice.doNo || null,
      monitorReference: invoice.idMonitor || null,
      statusOnline: invoice.statusOnline ?? 1,
      legacyInvoiceNo: parseLegacyInvoiceNo(invoice.invoiceNo),
    },
  });
};

const buildSubtypeUpsert = (type: MainDocumentType, header: any, documentId: string) => {
  if (type === 'invoice') {
    return prisma.invoiceDocument.upsert({
      where: { documentId },
      create: {
        documentId,
        dueDate: parseDate(header.dueDate),
        doNo: parseString(header.doNo),
        monitorReference: null,
        statusOnline: Number(header.statusOnline ?? buildInvoiceStatusOnline(header.status)),
        legacyInvoiceNo: parseLegacyInvoiceNo(header.legacyInvoiceNo || header.invoiceNo || header.invoiceId),
      },
      update: {
        dueDate: parseDate(header.dueDate),
        doNo: parseString(header.doNo),
        monitorReference: null,
        statusOnline: Number(header.statusOnline ?? buildInvoiceStatusOnline(header.status)),
        legacyInvoiceNo: parseLegacyInvoiceNo(header.legacyInvoiceNo || header.invoiceNo || header.invoiceId),
      },
    });
  }

  if (type === 'quotation') {
    return prisma.quotationDocument.upsert({
      where: { documentId },
      create: {
        documentId,
        validUntil: parseDate(header.validUntil),
        attentionTo: parseString(header.attentionTo),
      },
      update: {
        validUntil: parseDate(header.validUntil),
        attentionTo: parseString(header.attentionTo),
      },
    });
  }

  if (type === 'receipt') {
    return prisma.receiptDocument.upsert({
      where: { documentId },
      create: {
        documentId,
        receivedDate: parseDate(header.receivedDate),
        paymentReference: parseString(header.paymentReference),
      },
      update: {
        receivedDate: parseDate(header.receivedDate),
        paymentReference: parseString(header.paymentReference),
      },
    });
  }

  if (type === 'purchase_order') {
    return prisma.purchaseOrderDocument.upsert({
      where: { documentId },
      create: {
        documentId,
        supplierName: parseString(header.supplierName),
        deliveryDate: parseDate(header.deliveryDate),
      },
      update: {
        supplierName: parseString(header.supplierName),
        deliveryDate: parseDate(header.deliveryDate),
      },
    });
  }

  return prisma.workOrderDocument.upsert({
    where: { documentId },
    create: {
      documentId,
      scheduledDate: parseDate(header.scheduledDate),
      assignedTo: parseString(header.assignedTo),
    },
    update: {
      scheduledDate: parseDate(header.scheduledDate),
      assignedTo: parseString(header.assignedTo),
    },
  });
};

export const listDocumentsByType = async (typeInput: string) => {
  const type = parseDocumentType(typeInput);
  if (!type) {
    throw new Error('Invalid document type');
  }

  const documents = await prisma.document.findMany({
    where: { documentType: getPrismaDocumentType(type) },
    include: documentInclude,
    orderBy: [{ documentDate: 'desc' }, { updatedAt: 'desc' }],
  });

  const customerNameMap = await buildCustomerNameMap(documents);
  return documents.map((document) => mapDocumentRecord(document, customerNameMap));
};

export const getDocumentById = async (typeInput: string, identifier: string) => {
  const type = parseDocumentType(typeInput);
  if (!type) {
    throw new Error('Invalid document type');
  }

  return fetchDocumentRecord(type, identifier);
};

export const saveDocumentByType = async (typeInput: string, payload: any) => {
  const type = parseDocumentType(typeInput);
  if (!type) {
    throw new Error('Invalid document type');
  }

  const header = payload?.header || {};
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const requestedDocumentId = parseString(header.documentId);
  const requestedDocumentNumber = parseString(header.documentNumber || header.invoiceNo || header.invoiceId);

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
          documentType: prismaType,
          OR: existingLookupConditions,
        },
        include: { invoiceDocument: true },
      })
    : null;

  const documentNumber = existing?.documentNumber || await buildFallbackDocumentNumber(type);

  const documentId = existing?.id || requestedDocumentId || ulid();
  const status = parseString(header.status) || DOCUMENT_DEFAULT_STATUS[type];

  if (type === 'invoice') {
    const quotationReference = parseString(header.linkedQuotationNumber);

    if (quotationReference) {
      const duplicateLinkedInvoice = await prisma.document.findFirst({
        where: {
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

  if (type === 'receipt') {
    const invoiceReference = parseString(header.linkedInvoiceNumber);

    if (invoiceReference) {
      const duplicateLinkedReceipt = await prisma.document.findFirst({
        where: {
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

  await prisma.document.upsert({
    where: { id: documentId },
    create: {
      id: documentId,
      documentType: prismaType,
      documentNumber,
      legacySourceId: type === 'invoice' ? documentNumber : parseString(header.legacySourceId),
      title: parseString(header.title) || type.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
      documentDate: parseDate(header.documentDate || header.invoiceDate || header.receivedDate),
      customerId: parseString(header.customer),
      billTo: parseString(header.billTo),
      shipTo: parseString(header.shipTo),
      destinationId: parseString(header.destination),
      paymentTermId: parseString(header.paymentTerm),
      paymentMethod: parseString(header.paymentMethod),
      referenceNo: parseString(header.referenceNo || header.poNo),
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
      legacySourceId: type === 'invoice' ? documentNumber : parseString(header.legacySourceId),
      title: parseString(header.title) || type.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
      documentDate: parseDate(header.documentDate || header.invoiceDate || header.receivedDate),
      customerId: parseString(header.customer),
      billTo: parseString(header.billTo),
      shipTo: parseString(header.shipTo),
      destinationId: parseString(header.destination || header.shipTo),
      paymentTermId: parseString(header.paymentTerm),
      paymentMethod: parseString(header.paymentMethod),
      referenceNo: parseString(header.referenceNo || header.poNo),
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

  await prisma.documentItem.deleteMany({ where: { documentId } });

  const validItems = items.filter((item: any) => item?.id || item?.itemCode || item?.description);
  if (validItems.length > 0) {
    await prisma.documentItem.createMany({
      data: validItems.map((item: any, index: number) => ({
        id: ulid(),
        documentId,
        lineNo: index + 1,
        productId: parseString(item.id),
        description: parseString(item.description),
        cost: parseNullableNumber(item.cost),        
        quantity: toNumber(item.quantity),
        margin: parseNullableNumber(item.margin),
        sellingPrice: parseNullableNumber(item.sellingPrice),
        totalCost: parseNullableNumber(item.totalCost),
        totalSellingPrice: parseNullableNumber(item.totalSellingPrice),
        unitId: parseString(item.unitId),        
      })),
    });
  }

  await buildSubtypeUpsert(type, { ...header, documentNumber, status }, documentId);

  if (type === 'invoice') {
    const linkedQuotationNumber = parseString(header.linkedQuotationNumber);
    console.log('[DEBUG] linkedQuotationNumber:', linkedQuotationNumber);

    if (linkedQuotationNumber) {
      const updateResult = await prisma.document.updateMany({
        where: {
          documentType: DOCUMENT_TYPE_MAP.quotation,
          documentNumber: linkedQuotationNumber,
        },
        data: {
          status: 'Link Invoice',
        },
      });
      console.log('[DEBUG] Update Quotation status result:', updateResult);
    } else {
      console.log('[DEBUG] No linkedQuotationNumber provided, skip update Quotation status');
    }
  }

  if (type === 'receipt') {
    const linkedInvoiceNumber = parseString(header.linkedInvoiceNumber);
    console.log('[DEBUG] linkedInvoiceNumber:', linkedInvoiceNumber);

    if (linkedInvoiceNumber) {
      const updateResult = await prisma.document.updateMany({
        where: {
          documentType: DOCUMENT_TYPE_MAP.invoice,
          documentNumber: linkedInvoiceNumber,
        },
        data: {
          status: 'Link Receipt',
        },
      });
      console.log('[DEBUG] Update Invoice status result:', updateResult);
    } else {
      console.log('[DEBUG] No linkedInvoiceNumber provided, skip update Invoice status');
    }
  }

  const savedDocument = await prisma.document.findUnique({
    where: { id: documentId },
    include: documentInclude,
  });

  return fetchDocumentRecord(type, documentId);
};

export const deleteDocumentByType = async (typeInput: string, identifier: string) => {
  const type = parseDocumentType(typeInput);
  if (!type) {
    throw new Error('Invalid document type');
  }

  const existing = await prisma.document.findFirst({
    where: buildDocumentWhere(type, identifier),
    include: { invoiceDocument: true },
  });

  if (!existing) {
    return false;
  }

  await prisma.document.delete({ where: { id: existing.id } });
  return true;
};

export const isMainDocumentType = (value: string) => parseDocumentType(value) != null;