import { Prisma } from '@prisma/client';
import { monotonicFactory } from 'ulid';

const ulid = monotonicFactory();

export type StockDirection = 'IN' | 'OUT';

export interface StockMoveItem {
  productCode: string;
  productId: string;
  qty: number;
}

export interface StockMoveParams {
  items: StockMoveItem[];
  docNumber: string;
  docType: string;
  direction: StockDirection | 'INIT';
  companyId: string;
  docId?: string;
  userId?: string;
}

export async function recordStockMove(
  tx: Prisma.TransactionClient,
  params: StockMoveParams,
): Promise<void> {
  const { items, docNumber, docType, direction, companyId, docId, userId } = params;

  for (const item of items) {
    if (!item.productCode || item.qty <= 0) continue;

    const signed = direction === 'OUT' ? -Math.abs(item.qty) : Math.abs(item.qty);

    await tx.stockTransaction.create({
      data: {
        id: ulid(),
        productId: item.productId,
        productCode: item.productCode,
        companyId,
        docNumber,
        docType,
        docId: docId ?? null,
        type: direction === 'INIT' ? 'INIT' : direction === 'IN' ? 'IN' : 'OUT',
        qtyChange: signed,
        createdBy: userId ?? null,
      },
    });

    await tx.product.update({
      where: { id: item.productId },
      data: { stockQty: { increment: signed } },
    });
  }
}
