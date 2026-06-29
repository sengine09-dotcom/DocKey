import { Prisma } from '@prisma/client';
import { monotonicFactory } from 'ulid';

const ulid = monotonicFactory();

type GRItemWithSN = {
  id: string;
  lineNo: number;
  productCode: string | null;
  serialNumber?: string | null;
};

type GRWithItems = {
  id: string;
  grNumber: string;
  items: GRItemWithSN[];
};

/**
 * Validate และ register Serial Numbers สำหรับ GR
 * ต้องเรียกภายใน prisma.$transaction เพื่อป้องกัน race condition
 *
 * Rules:
 * 1. S/N ต้องกรอกครบทุก line (ถ้าสินค้านั้นมี S/N อย่างน้อย 1 ตัวใน GR นี้)
 * 2. S/N ต้องไม่ซ้ำกันในใบ GR เดียวกัน
 * 3. S/N ต้องไม่ซ้ำใน DB
 * 4. สร้าง SerialNumber records สถานะ AVAILABLE
 */
export async function validateAndRegisterSerialNumbers(
  tx: Prisma.TransactionClient,
  gr: GRWithItems,
  companyId: string,
): Promise<void> {
  // แยก items ที่มี serialNumber (กรอกมาแล้ว) และ items ทั้งหมด
  const allItems = gr.items;
  const snItems = allItems.filter((i) => i.serialNumber && String(i.serialNumber).trim());

  // ถ้าไม่มี S/N เลย → ข้ามไปเลย (GR ที่สินค้าไม่ต้องการ S/N)
  if (snItems.length === 0) {
    return;
  }

  // 1. ตรวจ S/N ครบทุก line
  //    ถ้า GR มีอย่างน้อย 1 item ที่กรอก S/N แล้ว ทุก item ที่มี productCode ต้องกรอก S/N ด้วย
  const missingLines = allItems
    .filter((i) => i.productCode && !i.serialNumber)
    .map((i) => i.lineNo);

  if (missingLines.length > 0) {
    throw new Error(
      `กรุณากรอก Serial Number ให้ครบทุกรายการ (ขาดที่บรรทัด: ${missingLines.join(', ')})`
    );
  }

  // 2. ตรวจ S/N ซ้ำกันในใบเดียวกัน
  const snValues = snItems.map((i) => String(i.serialNumber).trim());
  const seen = new Map<string, number[]>(); // sn → line numbers
  const duplicates: string[] = [];

  snItems.forEach((item) => {
    const sn = String(item.serialNumber).trim();
    const lines = seen.get(sn) ?? [];
    lines.push(item.lineNo);
    seen.set(sn, lines);
    if (lines.length > 1 && !duplicates.includes(sn)) {
      duplicates.push(sn);
    }
  });

  if (duplicates.length > 0) {
    const dupSN = duplicates[0];
    const lines = seen.get(dupSN)!;
    throw new Error(
      `Serial Number '${dupSN}' ถูกใช้ซ้ำในรายการที่ ${lines.join(' และ ')}`
    );
  }

  // 3. ตรวจ S/N ซ้ำใน DB
  const existingInDB = await tx.serialNumber.findFirst({
    where: { companyId, serialNumber: { in: snValues } },
    select: { serialNumber: true, grNumber: true },
  });
  if (existingInDB) {
    throw new Error(
      `Serial Number '${existingInDB.serialNumber}' มีอยู่ในระบบแล้ว (GR: ${existingInDB.grNumber ?? 'ไม่ทราบ'})`
    );
  }

  // 4. resolve productId จาก productCode ก่อนสร้าง
  const productCodes = Array.from(new Set(snItems.map((i) => i.productCode).filter(Boolean))) as string[];
  const products = await tx.product.findMany({
    where: { companyId, productCode: { in: productCodes } },
    select: { id: true, productCode: true },
  });
  const productIdMap = new Map(products.map((p) => [p.productCode, p.id]));

  // ตรวจทุก productCode ต้อง resolve ได้
  const unresolved = snItems.filter((i) => !productIdMap.has(i.productCode!));
  if (unresolved.length > 0) {
    throw new Error(
      `ไม่พบสินค้าที่ productCode '${unresolved[0].productCode}' ในระบบ — กรุณาสร้างสินค้าก่อน`
    );
  }

  // 5. สร้าง SerialNumber records สถานะ AVAILABLE
  await tx.serialNumber.createMany({
    data: snItems.map((item) => ({
      id: ulid(),
      serialNumber: String(item.serialNumber).trim(),
      productCode: item.productCode ?? '',
      productId: productIdMap.get(item.productCode!) ?? '',
      companyId,
      status: 'AVAILABLE',
      grId: gr.id,
      grNumber: gr.grNumber,
      grItemId: item.id,
    })),
  });
}
