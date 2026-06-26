/// <reference types="node" />
/**
 * reset-documents.ts
 *
 * ลบเอกสารทั้งหมดเพื่อเริ่มทดสอบใหม่ตั้งแต่ต้น
 * เก็บ: บริษัท, ผู้ใช้, ลูกค้า, สินค้า, หน่วย, เงื่อนไขการชำระ, vendor
 *
 * วิธีรัน:
 *   cd backend
 *   npx ts-node --transpile-only scripts/reset-documents.ts
 *
 * หรือถ้าต้องการข้ามการยืนยัน:
 *   SKIP_CONFIRM=true npx ts-node --transpile-only scripts/reset-documents.ts
 */

import * as readline from 'readline';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function confirm(question: string): Promise<boolean> {
  if (process.env.SKIP_CONFIRM === 'true') return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

async function countAll() {
  const [docs, sos, prs, grs, stocks] = await Promise.all([
    prisma.document.count(),
    prisma.saleOrder.count(),
    prisma.purchaseRequisition.count(),
    prisma.goodsReceipt.count(),
    prisma.stockTransaction.count(),
  ]);
  return { docs, sos, prs, grs, stocks };
}

async function main() {
  console.log('\n========================================');
  console.log('  DocKey — รีเซ็ตเอกสารทั้งหมด');
  console.log('========================================\n');

  const before = await countAll();
  console.log('ข้อมูลปัจจุบัน:');
  console.log(`  Document (ใบเสนอราคา/DI/DR/Invoice/Receipt/PO/WO/DO): ${before.docs}`);
  console.log(`  Sale Order:          ${before.sos}`);
  console.log(`  Purchase Requisition:${before.prs}`);
  console.log(`  Goods Receipt:       ${before.grs}`);
  console.log(`  Stock Transaction:   ${before.stocks}`);
  console.log('\nข้อมูลที่จะ คง ไว้: บริษัท, ผู้ใช้, ลูกค้า, สินค้า, หน่วย, เงื่อนไขชำระ, Vendor\n');

  const ok = await confirm('ยืนยันลบเอกสารทั้งหมด? (y/N): ');
  if (!ok) {
    console.log('ยกเลิก — ไม่มีการเปลี่ยนแปลง');
    return;
  }

  console.log('\nกำลังลบ...');

  // 1. StockTransaction — ไม่มี cascade, ลบก่อน
  const st = await prisma.stockTransaction.deleteMany({});
  console.log(`  ✓ StockTransaction: ${st.count}`);

  // 2. Document — ลบแล้ว cascade ไปยัง DocumentItem + ใบย่อยทุกประเภท
  //    (QuotationDocument, InvoiceDocument, ReceiptDocument,
  //     DepositReceiptDocument, DepositInvoiceDocument,
  //     PurchaseOrderDocument, WorkOrderDocument,
  //     DeliveryOrderDocument, CustomerReturnDocument)
  const doc = await prisma.document.deleteMany({});
  console.log(`  ✓ Document (+ ใบย่อย + รายการสินค้า): ${doc.count}`);

  // 3. SOItem cascade จาก SaleOrder
  const so = await prisma.saleOrder.deleteMany({});
  console.log(`  ✓ SaleOrder (+ SOItem): ${so.count}`);

  // 4. GRItem cascade จาก GoodsReceipt
  const gr = await prisma.goodsReceipt.deleteMany({});
  console.log(`  ✓ GoodsReceipt (+ GRItem): ${gr.count}`);

  // 5. PRItem cascade จาก PurchaseRequisition
  const pr = await prisma.purchaseRequisition.deleteMany({});
  console.log(`  ✓ PurchaseRequisition (+ PRItem): ${pr.count}`);

  // 6. Reset stockQty บน Product (denormalized field ไม่ cascade จาก StockTransaction)
  const prod = await prisma.product.updateMany({ data: { stockQty: 0 } });
  console.log(`  ✓ Product.stockQty → 0: ${prod.count} สินค้า`);

  const after = await countAll();
  console.log('\n========================================');
  console.log('เสร็จสิ้น — ข้อมูลที่เหลือ:');
  console.log(`  Document: ${after.docs}  SO: ${after.sos}  PR: ${after.prs}  GR: ${after.grs}  Stock: ${after.stocks}`);
  console.log('========================================\n');
}

main()
  .catch((e) => { console.error('Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
