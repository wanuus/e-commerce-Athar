import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export const cardSelect = {
  id: true,
  slug: true,
  nameAr: true,
  nameEn: true,
  basePrice: true,
  compareAtPrice: true,
  images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
  variants: {
    where: { isActive: true },
    select: { colorName: true, colorHex: true, stock: true, reserved: true },
  },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export function getNewArrivals(limit = 8) {
  return prisma.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: cardSelect,
  });
}

export function getBestSellers(limit = 4) {
  return prisma.product.findMany({
    where: { status: "ACTIVE", soldCount: { gt: 0 } },
    orderBy: { soldCount: "desc" },
    take: limit,
    select: cardSelect,
  });
}

export function getCategories() {
  return prisma.category.findMany({ where: { parentId: null }, orderBy: { sortOrder: "asc" } });
}
