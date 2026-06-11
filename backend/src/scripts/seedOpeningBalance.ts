/**
 * One-time script: create INIT StockTransaction records for all products
 * that already have stockQty > 0 (opening balance before system go-live).
 *
 * Run once: npx ts-node --transpile-only src/scripts/seedOpeningBalance.ts
 */
import { monotonicFactory } from 'ulid';
import { prisma } from '../lib/prisma';

const ulid = monotonicFactory();

async function main() {
  const products = await prisma.product.findMany({
    where: { stockQty: { gt: 0 } },
    select: { id: true, productCode: true, companyId: true, stockQty: true },
  });

  if (products.length === 0) {
    console.log('No products with stockQty > 0. Nothing to seed.');
    return;
  }

  // Avoid duplicates — skip products that already have an INIT transaction
  const existing = await prisma.stockTransaction.findMany({
    where: { type: 'INIT', productId: { in: products.map((p) => p.id) } },
    select: { productId: true },
  });
  const alreadySeeded = new Set(existing.map((r) => r.productId));

  const toSeed = products.filter((p) => !alreadySeeded.has(p.id));
  if (toSeed.length === 0) {
    console.log('All products already have INIT records. Nothing to seed.');
    return;
  }

  console.log(`Seeding opening balance for ${toSeed.length} product(s)...`);

  await prisma.$transaction(async (tx) => {
    for (const p of toSeed) {
      await tx.stockTransaction.create({
        data: {
          id: ulid(),
          productId: p.id,
          productCode: p.productCode,
          companyId: p.companyId,
          docNumber: 'INIT',
          docType: 'INIT',
          docId: null,
          type: 'INIT',
          qtyChange: p.stockQty,
          createdBy: 'system',
        },
      });
      console.log(`  ✓ ${p.productCode} — qty ${p.stockQty}`);
    }
  });

  console.log('Done.');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
