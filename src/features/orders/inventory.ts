import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Stock model per variant:  available = stock - reserved.
 *  - Card orders RESERVE stock at checkout; it becomes a real sale (commit) only when payment is confirmed.
 *  - COD orders SELL stock immediately (stock is decremented).
 * All updates are single conditional SQL statements, so two customers can never oversell the last unit.
 */
export async function reserveStock(tx: Tx, variantId: string, qty: number): Promise<boolean> {
  const n = await tx.$executeRaw`UPDATE "ProductVariant" SET "reserved" = "reserved" + ${qty}
    WHERE "id" = ${variantId} AND "isActive" = true AND "stock" - "reserved" >= ${qty}`;
  return n === 1;
}

export async function sellStock(tx: Tx, variantId: string, qty: number): Promise<boolean> {
  const n = await tx.$executeRaw`UPDATE "ProductVariant" SET "stock" = "stock" - ${qty}
    WHERE "id" = ${variantId} AND "isActive" = true AND "stock" - "reserved" >= ${qty}`;
  return n === 1;
}

export async function commitReserved(tx: Tx, variantId: string, qty: number): Promise<boolean> {
  const n = await tx.$executeRaw`UPDATE "ProductVariant" SET "stock" = "stock" - ${qty}, "reserved" = "reserved" - ${qty}
    WHERE "id" = ${variantId} AND "reserved" >= ${qty} AND "stock" >= ${qty}`;
  return n === 1;
}

export async function releaseReserved(tx: Tx, variantId: string, qty: number): Promise<void> {
  await tx.$executeRaw`UPDATE "ProductVariant" SET "reserved" = GREATEST("reserved" - ${qty}, 0) WHERE "id" = ${variantId}`;
}

export async function restock(tx: Tx, variantId: string, qty: number): Promise<void> {
  await tx.$executeRaw`UPDATE "ProductVariant" SET "stock" = "stock" + ${qty} WHERE "id" = ${variantId}`;
}
