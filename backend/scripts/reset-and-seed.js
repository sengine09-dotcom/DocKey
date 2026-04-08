require('dotenv/config');
const { PrismaClient, DocumentType, PaymentType } = require('@prisma/client');
const { ulid } = require('ulid');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const seedCustomers = [
  {
    id: ulid(),
    customerCode: 'CUST-001',
    customerName: 'Thai Test Customer Co., Ltd.',
    contactName: 'Somchai Test',
    phone: '0812345678',
    email: 'customer1@test.local',
    address: '99 Test Road, Bangkok',
    taxId: '0105557000001',
    branch: 'Head Office',
    used: 'Y',
  },
  {
    id: ulid(),
    customerCode: 'CUST-002',
    customerName: 'Sample Industrial Supply Co., Ltd.',
    contactName: 'Suda Example',
    phone: '0823456789',
    email: 'customer2@test.local',
    address: '88 Demo Avenue, Chonburi',
    taxId: '0105557000002',
    branch: 'Branch 1',
    used: 'Y',
  },
];

const seedProducts = [
  {
    id: ulid(),
    productCode: 'P-001',
    productName: 'Steel Pipe 2 Inch',
    category: 'Steel',
    brand: 'DocKey',
    model: 'SP-2',
    price: 1500,
    cost: 1100,
    stockQty: 100,
    minQty: 10,
    maxQty: 500,
  },
  {
    id: ulid(),
    productCode: 'P-002',
    productName: 'Flange 4 Inch',
    category: 'Fitting',
    brand: 'DocKey',
    model: 'FL-4',
    price: 950,
    cost: 700,
    stockQty: 80,
    minQty: 10,
    maxQty: 300,
  },
  {
    id: ulid(),
    productCode: 'P-003',
    productName: 'Industrial Valve',
    category: 'Valve',
    brand: 'DocKey',
    model: 'IV-1',
    price: 4200,
    cost: 3200,
    stockQty: 40,
    minQty: 5,
    maxQty: 100,
  },
];

const seedDestinations = [
  {
    id: ulid(),
    destinationCode: 'DST-001',
    destination: 'Bangkok Warehouse',
    location: 'Bangkok',
    used: 'Y',
  },
  {
    id: ulid(),
    destinationCode: 'DST-002',
    destination: 'Chonburi Site',
    location: 'Chonburi',
    used: 'Y',
  },
];

const seedPaymentTerms = [
  {
    id: ulid(),
    termCode: 'CASH',
    termName: 'Cash',
    shortName: 'Cash',
    days: '0',
    used: 'Y',
  },
  {
    id: ulid(),
    termCode: 'NET7',
    termName: 'Net 7 Days',
    shortName: '7 Days',
    days: '7',
    used: 'Y',
  },
  {
    id: ulid(),
    termCode: 'NET30',
    termName: 'Net 30 Days',
    shortName: '30 Days',
    days: '30',
    used: 'Y',
  },
];

const seedVendors = [
  {
    id: ulid(),
    vendorCode: 'VND-0001',
    name: 'Bangkok Steel Supplier Co., Ltd.',
    contactName: 'Niran Purchase',
    phone: '0891111111',
    email: 'vendor1@test.local',
    address: '11 Supplier Road, Bangkok',
    taxId: '0105558000001',
    paymentType: PaymentType.CASH,
    paymentTerm: 0,
    bankName: 'Kasikorn Bank',
    bankAccount: '123-4-56789-0',
    accountName: 'Bangkok Steel Supplier Co., Ltd.',
    isActive: true,
    note: 'Primary steel supplier',
  },
  {
    id: ulid(),
    vendorCode: 'VND-0002',
    name: 'Eastern Industrial Parts Ltd.',
    contactName: 'Malee Supply',
    phone: '0892222222',
    email: 'vendor2@test.local',
    address: '22 Industrial Park, Rayong',
    taxId: '0105558000002',
    paymentType: PaymentType.CREDIT,
    paymentTerm: 30,
    bankName: 'Bangkok Bank',
    bankAccount: '234-5-67890-1',
    accountName: 'Eastern Industrial Parts Ltd.',
    isActive: true,
    note: 'Credit supplier for fittings and valves',
  },
];

async function resetDocuments() {
  await prisma.documentItem.deleteMany();
  await prisma.depositReceiptDocument.deleteMany();
  await prisma.receiptDocument.deleteMany();
  await prisma.invoiceDocument.deleteMany();
  await prisma.quotationDocument.deleteMany();
  await prisma.purchaseOrderDocument.deleteMany();
  await prisma.workOrderDocument.deleteMany();
  await prisma.document.deleteMany();
}

async function resetMasterData() {
  await prisma.vendor.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.destination.deleteMany();
  await prisma.paymentTerm.deleteMany();
}

async function seedMasterData() {
  await prisma.customer.createMany({ data: seedCustomers });
  await prisma.product.createMany({ data: seedProducts });
  await prisma.destination.createMany({ data: seedDestinations });
  await prisma.paymentTerm.createMany({ data: seedPaymentTerms });
  await prisma.vendor.createMany({ data: seedVendors });
}

async function main() {
  console.log('Resetting document and master data...');

  await prisma.$transaction(async (tx) => {
    await tx.documentItem.deleteMany();
    await tx.depositReceiptDocument.deleteMany();
    await tx.receiptDocument.deleteMany();
    await tx.invoiceDocument.deleteMany();
    await tx.quotationDocument.deleteMany();
    await tx.purchaseOrderDocument.deleteMany();
    await tx.workOrderDocument.deleteMany();
    await tx.document.deleteMany();
    await tx.vendor.deleteMany();
    await tx.product.deleteMany();
    await tx.customer.deleteMany();
    await tx.destination.deleteMany();
    await tx.paymentTerm.deleteMany();

    await tx.customer.createMany({ data: seedCustomers });
    await tx.product.createMany({ data: seedProducts });
    await tx.destination.createMany({ data: seedDestinations });
    await tx.paymentTerm.createMany({ data: seedPaymentTerms });
    await tx.vendor.createMany({ data: seedVendors });
  });

  const summary = {
    customers: await prisma.customer.count(),
    products: await prisma.product.count(),
    destinations: await prisma.destination.count(),
    paymentTerms: await prisma.paymentTerm.count(),
    vendors: await prisma.vendor.count(),
    documents: await prisma.document.count(),
  };

  console.log('Reset complete. Seed summary:', summary);
  console.log('Sample codes ready:', {
    customers: seedCustomers.map((item) => item.customerCode),
    products: seedProducts.map((item) => item.productCode),
    destinations: seedDestinations.map((item) => item.destinationCode),
    paymentTerms: seedPaymentTerms.map((item) => item.termCode),
    vendors: seedVendors.map((item) => item.vendorCode),
  });
}

main()
  .catch((error) => {
    console.error('Reset and seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
