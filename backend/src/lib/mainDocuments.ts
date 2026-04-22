import { ulid } from 'ulid';
import { prisma } from './prisma';

const DOCUMENT_TYPE_MAP = {
  quotation: 'QUOTATION',
  invoice: 'INVOICE',
  receipt: 'RECEIPT',
  deposit_receipt: 'DEPOSIT_RECEIPT',
  purchase_order: 'PURCHASE_ORDER',
  work_order: 'WORK_ORDER',
} as const;

const PRISMA_TO_APP_DOCUMENT_TYPE = {
  QUOTATION: 'quotation',
  INVOICE: 'invoice',
  RECEIPT: 'receipt',
  DEPOSIT_RECEIPT: 'deposit_receipt',
  PURCHASE_ORDER: 'purchase_order',
  WORK_ORDER: 'work_order',
} as const;

const DOCUMENT_DEFAULT_STATUS: Record<MainDocumentType, string> = {
  quotation: 'Draft',
  invoice: 'Pending',
  receipt: 'Received',
  deposit_receipt: 'Received',
  purchase_order: 'Open',
  work_order: 'Open',
};

const DOCUMENT_PREFIX: Record<MainDocumentType, string> = {
  quotation: 'QT',
  invoice: 'INV',
  receipt: 'RC',
  deposit_receipt: 'DR',
  purchase_order: 'PO',
  work_order: 'WO',
};

type MainDocumentType = keyof typeof DOCUMENT_TYPE_MAP;

const documentInclude = {
  items: {
    orderBy: { lineNo: 'asc' as const },
  },
  quotationDocument: true,
  invoiceDocument: true,
  receiptDocument: true,
  depositReceiptDocument: true,
  purchaseOrderDocument: {
    orderBy: { lineNo: 'asc' as const },
  },
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
  if (['paid', 'printed', 'received', 'completed', 'confirmed', 'approved', 'won', 'converted', 'ordered'].includes(normalized)) return 'green';
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

const mapBreakdownItem = (item: any, productNameMap: Record<string, string> = {}) => ({
  lineNo: item.lineNo,
  productCode: item.productCode || '',
  productName: productNameMap[String(item.productCode || '').trim()] || '',
  quantity: toNumber(item.quantity).toFixed(2),
  margin: '0.00',
  cost: toNumber(item.cost).toFixed(2),
  sellingPrice: toNumber(item.cost).toFixed(2),
  totalCost: toNumber(item.totalCost).toFixed(2),
  totalSellingPrice: toNumber(item.totalCost).toFixed(2),
  unitID: item.unitId || 'x',
  sourceQuotationId: item.sourceQuotationId || '',
  sourceQuotationNumber: item.sourceQuotationNumber || '',
});

const mapDocumentItem = (item: any, productNameMap: Record<string, string> = {}) => ({
  lineNo: item.lineNo,
  productCode: item.productCode || '',
  productName: item.product?.productName || productNameMap[String(item.productCode || '').trim()] || '',
  quantity: toNumber(item.quantity).toFixed(2),
  margin: toNumber(item.margin).toFixed(2),
  cost: toNumber(item.cost).toFixed(2),
  sellingPrice: toNumber(item.sellingPrice).toFixed(2),
  totalCost: toNumber(item.totalCost).toFixed(2),
  totalSellingPrice: toNumber(item.totalSellingPrice).toFixed(2),
  unitID: item.unitId || 'x',
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
      .flatMap((document) => [
        ...(Array.isArray(document?.items) ? document.items : []),
        ...(Array.isArray(document?.purchaseOrderDocument) ? document.purchaseOrderDocument : []),
      ])
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

const mapDocumentRecord = (document: any, customerNameMap: Record<string, string> = {}, productNameMap: Record<string, string> = {}) => {
  const documentType = PRISMA_TO_APP_DOCUMENT_TYPE[document.documentType as keyof typeof PRISMA_TO_APP_DOCUMENT_TYPE] as MainDocumentType;
  const items = (document.items || []).map((item: any) => mapDocumentItem(item, productNameMap));
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
    };
  }

  if (documentType === 'purchase_order') {
    const poLines: any[] = Array.isArray(document.purchaseOrderDocument) ? document.purchaseOrderDocument : [];
    const splitItems = poLines.map((line: any) => mapBreakdownItem(line, productNameMap));
    const firstLine = poLines[0] || {};
    return {
      ...baseRecord,
      // baseRecord.items = aggregated DocumentItem (for view mode)
      splitItems, // PurchaseOrderDocument split lines (for edit mode)
      vendorCode: firstLine.vendorCode || '',
      supplierName: firstLine.supplierName || '',
      deliveryDate: firstLine.deliveryDate || null,
    };
  }

  return {
    ...baseRecord,
    scheduledDate: document.workOrderDocument?.scheduledDate || null,
    assignedTo: document.workOrderDocument?.assignedTo || '',
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
    include: documentInclude,
  });
  if (!document) {
    return null;
  }
  const customerNameMap = await buildCustomerNameMap([document], companyId);
  const productNameMap = await buildProductNameMap([document], companyId);
  const record = mapDocumentRecord(document, customerNameMap, productNameMap) as any;

  if (type === 'quotation') {
    const linkedPOLines = await prisma.purchaseOrderDocument.findMany({
      where: { sourceQuotationId: document.id },
      select: {
        documentId: true,
        document: { select: { id: true, documentNumber: true } },
      },
      distinct: ['documentId'],
    });
    record.linkedPurchaseOrders = linkedPOLines
      .filter((line) => line.document)
      .map((line) => ({
        documentId: line.document!.id,
        documentNumber: line.document!.documentNumber,
      }));
  }

  return record;
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
      } as any,
      update: {
        documentNumber,
        dueDate: parseDate(header.dueDate),
        doNo: parseString(header.doNo),
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
      },
      update: {
        documentNumber,
        receivedDate: parseDate(header.receivedDate),
        paymentReference: parseString(header.paymentReference),
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
      },
      update: {
        documentNumber,
        receivedDate: parseDate(header.receivedDate),
        paymentReference: parseString(header.paymentReference),
        paymentAmount: parseNullableNumber(header.paymentAmount),
        paymentType: parseString(header.paymentType),
        linkedQuotationId: parseString(header.linkedQuotationId),
        linkedQuotationNumber: parseString(header.linkedQuotationNumber),
      },
    });
  }

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
};

export const listDocumentsByType = async (typeInput: string, companyId: string) => {
  const type = parseDocumentType(typeInput);
  if (!type) {
    throw new Error('Invalid document type');
  }

  const documents = await prisma.document.findMany({
    where: { companyId, documentType: getPrismaDocumentType(type) },
    include: documentInclude,
    orderBy: [{ documentDate: 'desc' }, { updatedAt: 'desc' }],
  });
  const customerNameMap = await buildCustomerNameMap(documents, companyId);
  const productNameMap = await buildProductNameMap(documents, companyId);
  return documents.map((document) => mapDocumentRecord(document, customerNameMap, productNameMap));
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

  console.log('[DEBUG] saveDocumentByType called with type:', type);
  console.log('[DEBUG] Payload structure:', JSON.stringify(payload, null, 2));

  const header = payload?.header || {};
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const requestedDocumentId = parseString(header.documentId || header.id);
  const requestedDocumentNumber = parseString(header.documentNumber);

  console.log('[DEBUG] Header:', JSON.stringify(header, null, 2));
  console.log('[DEBUG] Items count:', items.length);
  console.log('[DEBUG] Requested documentId:', requestedDocumentId);
  console.log('[DEBUG] Requested documentNumber:', requestedDocumentNumber);

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
    console.log('[DEBUG] Invoice validation logic triggered');
    const quotationReference = parseString(header.linkedQuotationNumber);
    console.log('[DEBUG] Quotation reference:', quotationReference);

    if (quotationReference) {
      console.log('[DEBUG] Checking for duplicate linked invoice...');
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

      console.log('[DEBUG] Duplicate linked invoice found:', !!duplicateLinkedInvoice);

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

  console.log('[DEBUG] Incoming items for documentId:', documentId);
  console.log('[DEBUG] Items count:', items.length);
  console.log('[DEBUG] Items structure:', JSON.stringify(items, null, 2));

  const validItems = items.filter((item: any) => item?.productCode);
  console.log('[DEBUG] Valid items after filtering:', validItems.length);
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
  
  if (type === 'purchase_order') {
    // Save split lines (one per quotation source) to PurchaseOrderDocument
    await prisma.purchaseOrderDocument.deleteMany({ where: { documentId } });

    if (validItems.length > 0) {
      const vendorCode = parseString(header.vendorCode);
      const supplierName = parseString(header.supplierName);
      const deliveryDate = parseDate(header.deliveryDate);

      await prisma.purchaseOrderDocument.createMany({
        data: validItems.map((item: any, index: number) => ({
          id: ulid(),
          documentId,
          documentNumber,
          lineNo: index + 1,
          productCode: existingProductCodeSet.has(String(parseString(item.productCode) || ''))
            ? parseString(item.productCode)
            : null,
          quantity: toNumber(item.quantity),
          cost: parseNullableNumber(item.cost),
          totalCost: parseNullableNumber(item.totalCost) ?? (toNumber(item.quantity) * toNumber(item.cost)),
          unitId: parseString(item.unitId),
          sourceQuotationId: parseString(item.sourceQuotationId),
          sourceQuotationNumber: parseString(item.sourceQuotationNumber),
          vendorCode,
          supplierName,
          deliveryDate,
        })),
      });

      // Aggregate by productCode (weighted average cost) for DocumentItem
      const grouped = new Map<string, { qty: number; costSum: number; unitId: string }>();
      for (const item of validItems) {
        const code = parseString(item.productCode) || '__nocode__';
        const qty = toNumber(item.quantity);
        const cost = toNumber(item.cost);
        const entry = grouped.get(code);
        if (entry) {
          entry.qty += qty;
          entry.costSum += cost * qty;
        } else {
          grouped.set(code, { qty, costSum: cost * qty, unitId: parseString(item.unitId) || '' });
        }
      }

      await prisma.documentItem.createMany({
        data: Array.from(grouped.entries()).map(([code, agg], index) => {
          const avgCost = agg.qty > 0 ? agg.costSum / agg.qty : 0;
          const resolvedCode = code === '__nocode__' ? null
            : existingProductCodeSet.has(code) ? code : null;
          return {
            id: ulid(),
            documentId,
            documentNumber,
            documentType: getPrismaDocumentType(type),
            lineNo: index + 1,
            productCode: resolvedCode,
            cost: avgCost,
            quantity: agg.qty,
            margin: null,
            sellingPrice: avgCost,
            totalCost: agg.costSum,
            totalSellingPrice: agg.costSum,
            unitId: agg.unitId || null,
          };
        }),
      });
      console.log('[DEBUG] PO split lines and aggregated DocumentItems created');

      // Update referenced quotations to 'Ordered'
      const linkedQuotationIds = [
        ...new Set(
          validItems
            .map((item: any) => parseString(item.sourceQuotationId))
            .filter(Boolean) as string[]
        ),
      ];
      if (linkedQuotationIds.length > 0) {
        await prisma.document.updateMany({
          where: {
            companyId,
            documentType: DOCUMENT_TYPE_MAP.quotation,
            id: { in: linkedQuotationIds },
          },
          data: { status: 'Ordered' },
        });
        console.log('[DEBUG] Updated quotation(s) to Ordered:', linkedQuotationIds);
      }
    }
  } else if (validItems.length > 0) {
    console.log('[DEBUG] Creating DocumentItems...');
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
        cost: parseNullableNumber(item.cost),
        quantity: toNumber(item.quantity),
        margin: parseNullableNumber(item.margin),
        sellingPrice: parseNullableNumber(item.sellingPrice),
        totalCost: parseNullableNumber(item.totalCost),
        totalSellingPrice: parseNullableNumber(item.totalSellingPrice),
        unitId: parseString(item.unitId),
      })),
    });
    console.log('[DEBUG] DocumentItems created successfully');
  } else {
    console.log('[DEBUG] No valid items to save');
  }

  if (type !== 'purchase_order') {
    await buildSubtypeUpsert(type, { ...header, status }, documentId, documentNumber);
  }

  if (type === 'invoice') {
    const linkedQuotationNumber = parseString(header.linkedQuotationNumber);
    console.log('[DEBUG] linkedQuotationNumber:', linkedQuotationNumber);

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
      const updateResult = await prisma.document.updateMany({
        where: {
          companyId,
          documentType: DOCUMENT_TYPE_MAP.quotation,
          documentNumber: linkedQuotationNumber,
        },
        data: {
          status: 'Link Invoice',
        },
      });
      console.log('[DEBUG] Update Quotation status result:', updateResult);

      // Update QuotationDocument with invoice linking data
      if (quotationDoc) {
        await prisma.quotationDocument.update({
          where: { id: quotationDoc.id },
          data: {
            linkedInvoiceId: documentId,
            linkedInvoiceNumber: documentNumber,
          } as any,
        });
        console.log('[DEBUG] Updated QuotationDocument with invoice linking:', {
          quotationId: quotationDoc.id,
          invoiceId: documentId,
          invoiceNumber: documentNumber
        });
      }
    } else {
      console.log('[DEBUG] No linkedQuotationNumber provided, skip update Quotation status');
    }
  }

  if (type === 'receipt') {
    const linkedInvoiceNumber = parseString(header.linkedInvoiceNumber);
    console.log('[DEBUG] linkedInvoiceNumber:', linkedInvoiceNumber);

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
      const updateResult = await prisma.document.updateMany({
        where: {
          companyId,
          documentType: DOCUMENT_TYPE_MAP.invoice,
          documentNumber: linkedInvoiceNumber,
        },
        data: {
          status: 'Link Receipt',
        },
      });
      console.log('[DEBUG] Update Invoice status result:', updateResult);

      if (invoiceDoc) {
        // Update InvoiceDocument with receipt linking data
        await prisma.invoiceDocument.update({
          where: { id: invoiceDoc.id },
          data: {
            linkedReceiptId: documentId,
            linkedReceiptNumber: documentNumber,
          } as any,
        });
        console.log('[DEBUG] Updated InvoiceDocument with receipt linking:', {
          invoiceId: invoiceDoc.id,
          receiptId: documentId,
          receiptNumber: documentNumber
        });
      }

    } else {
      console.log('[DEBUG] No linkedInvoiceNumber provided, skip update Invoice status');
    }
  }

  const savedDocument = await prisma.document.findUnique({
    where: { id: documentId },
    include: documentInclude,
  });

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