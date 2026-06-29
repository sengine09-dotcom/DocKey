import { computePaymentStatus, saveDocumentByType } from '../mainDocuments';

// Mock the prisma module so saveDocumentByType never touches a real DB.
jest.mock('../prisma', () => {
  return {
    prisma: {
      document: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      documentItem: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      receiptDocument: {
        upsert: jest.fn(),
      },
      depositReceiptDocument: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      depositInvoiceDocument: {
        findFirst: jest.fn(),
      },
      invoiceDocument: {
        findFirst: jest.fn(),
      },
      saleOrder: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      paymentTerm: {
        findFirst: jest.fn(),
      },
      deliveryOrderDocument: {
        findFirst: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
      },
      customer: {
        findMany: jest.fn(),
      },
      unitCode: {
        findMany: jest.fn(),
      },
    },
  };
});

// Pull in the mocked prisma so tests can configure return values.
import { prisma } from '../prisma';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedPrisma = prisma as any;

/** Minimal receipt payload with a linkedSOId — triggers the DO gate. */
const makeReceiptPayload = (linkedSOId: string) => ({
  header: {
    linkedSOId,
    // No linkedInvoiceNumber, linkedDepositReceiptId, or linkedInvoiceId
    // so the early-lookup branches are all skipped.
  },
  items: [],
});

/** A minimal document row returned by prisma.document.findFirst for fetchDocumentRecord. */
const makeFakeDocument = () => ({
  id: 'doc-id-1',
  documentType: 'RECEIPT',
  documentNumber: 'RC-26-000001',
  title: 'Receipt',
  documentDate: new Date(),
  customerId: '',
  billTo: '',
  shipTo: '',
  destinationId: '',
  paymentTermId: '',
  paymentMethod: '',
  referenceNo: '',
  status: 'Received',
  remark: '',
  profitPercent: 0,
  subtotal: 0,
  taxAmount: 0,
  taxRate: 0,
  totalAmount: 0,
  totalQuantity: 0,
  margin: 0,
  updatedAt: new Date(),
  items: [],
  receiptDocument: {
    receivedDate: null,
    paymentReference: '',
    linkedInvoiceId: '',
    linkedInvoiceNumber: '',
    linkedDepositReceiptId: '',
    linkedSOId: 'test-so-id',
    depositAmountDeducted: null,
    linkedDOId: '',
  },
});

describe('DO gate on RC save (via saveDocumentByType)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default stubs — enough for saveDocumentByType to run without crashing
    // for the paths that precede the DO gate.
    (mockedPrisma.document.findFirst as jest.Mock).mockResolvedValue(null);
    (mockedPrisma.document.upsert as jest.Mock).mockResolvedValue({ id: 'doc-id-1', documentNumber: 'RC-26-000001' });
    (mockedPrisma.document.findMany as jest.Mock).mockResolvedValue([]);
    (mockedPrisma.documentItem.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (mockedPrisma.documentItem.createMany as jest.Mock).mockResolvedValue({ count: 0 });
    (mockedPrisma.receiptDocument.upsert as jest.Mock).mockResolvedValue({});
    (mockedPrisma.depositReceiptDocument.findFirst as jest.Mock).mockResolvedValue(null);
    (mockedPrisma.depositReceiptDocument.findMany as jest.Mock).mockResolvedValue([]);
    (mockedPrisma.depositInvoiceDocument.findFirst as jest.Mock).mockResolvedValue(null);
    (mockedPrisma.invoiceDocument.findFirst as jest.Mock).mockResolvedValue(null);
    (mockedPrisma.product.findMany as jest.Mock).mockResolvedValue([]);
    (mockedPrisma.customer.findMany as jest.Mock).mockResolvedValue([]);
    (mockedPrisma.unitCode.findMany as jest.Mock).mockResolvedValue([]);
    // SO has no paymentTerm → isCashPaymentTerm stays false → simplest completion path
    (mockedPrisma.saleOrder.findFirst as jest.Mock).mockResolvedValue({ paymentTerm: null });
    (mockedPrisma.paymentTerm.findFirst as jest.Mock).mockResolvedValue(null);
    // Default DO: exists (allows gate to pass) — overridden per test when needed
    (mockedPrisma.deliveryOrderDocument.findFirst as jest.Mock).mockResolvedValue({ id: 'do-1', linkedSOId: 'test-so-id' });
  });

  it('throws when saving RC for a linked SO that has no DO', async () => {
    // Override: no DO found for this SO
    (mockedPrisma.deliveryOrderDocument.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      saveDocumentByType('receipt', makeReceiptPayload('test-so-id'), 'company-1')
    ).rejects.toThrow('กรุณาออกใบส่งสินค้า (DO) ก่อน');
  });

  it('allows RC when linkedSOId is empty (standalone receipt — no SO linkage)', async () => {
    // No linkedSOId → DO gate is never reached; fetchDocumentRecord needs a document
    (mockedPrisma.document.findFirst as jest.Mock).mockResolvedValue(makeFakeDocument());

    await expect(
      saveDocumentByType('receipt', makeReceiptPayload(''), 'company-1')
    ).resolves.toBeDefined();
  });

  it('allows RC when linkedSOId is set and a DO exists for that SO', async () => {
    // DO exists (already the default, but be explicit)
    (mockedPrisma.deliveryOrderDocument.findFirst as jest.Mock).mockResolvedValue({
      id: 'do-1',
      linkedSOId: 'test-so-id',
    });
    // fetchDocumentRecord at the end of saveDocumentByType needs a document
    (mockedPrisma.document.findFirst as jest.Mock).mockResolvedValue(makeFakeDocument());

    await expect(
      saveDocumentByType('receipt', makeReceiptPayload('test-so-id'), 'company-1')
    ).resolves.toBeDefined();
  });

  it('allows RC when linkedSOId is empty string (treated as no linkage)', async () => {
    // Empty string → parseString returns null → gate condition is falsy
    (mockedPrisma.document.findFirst as jest.Mock).mockResolvedValue(makeFakeDocument());

    await expect(
      saveDocumentByType('receipt', makeReceiptPayload(''), 'company-1')
    ).resolves.toBeDefined();
  });
});

describe('computePaymentStatus', () => {
  const pastDate = new Date(Date.now() - 86400_000 * 2); // 2 days ago
  const futureDate = new Date(Date.now() + 86400_000 * 10); // 10 days from now

  it('returns PAID when paymentStatus is PAID regardless of dueDate', () => {
    expect(computePaymentStatus('PAID', pastDate)).toBe('PAID');
    expect(computePaymentStatus('PAID', null)).toBe('PAID');
  });

  it('returns OVERDUE when PENDING and dueDate is in the past', () => {
    expect(computePaymentStatus('PENDING', pastDate)).toBe('OVERDUE');
  });

  it('returns PENDING when PENDING and dueDate is in the future', () => {
    expect(computePaymentStatus('PENDING', futureDate)).toBe('PENDING');
  });

  it('returns PENDING when PENDING and no dueDate', () => {
    expect(computePaymentStatus('PENDING', null)).toBe('PENDING');
  });
});
