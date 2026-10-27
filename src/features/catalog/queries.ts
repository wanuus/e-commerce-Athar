import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { PAGE_SIZE, SIZE_ORDER } from "@/lib/config/site";
import { cardSelect } from "./service";
import { SORTS, parseShopParams, type ShopParams, type SortKey } from "./params";

export { SORTS, parseShopParams };
export type { ShopParams, SortKey };

export async function listProducts(p: ShopParams, locale: string) {
  const variantFilter: Prisma.ProductVariantWhereInput = {
    isActive: true,
    ...(p.sizes.length ? { size: { in: p.sizes } } : {}),
    ...(p.colors.length ? { colorName: { in: p.colors } } : {}),
    ...(p.inStock ? { stock: { gt: 0 } } : {}),
  };
  const needsVariant = p.sizes.length > 0 || p.colors.length > 0 || p.inStock;
  const price: Prisma.IntFilter = {};
  if (p.minPrice !== undefined) price.gte = Math.round(p.minPrice * 100);
  if (p.maxPrice !== undefined) price.lte = Math.round(p.maxPrice * 100);

  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    ...(p.category ? { category: { slug: p.category } } : {}),
    ...(p.collection ? { collections: { some: { slug: p.collection } } } : {}),
    ...(Object.keys(price).length ? { basePrice: price } : {}),
    ...(p.q
      ? { OR: [{ nameAr: { contains: p.q, mode: "insensitive" } }, { nameEn: { contains: p.q, mode: "insensitive" } }, { tags: { has: p.q.toLowerCase() } }] }
      : {}),
    ...(needsVariant ? { variants: { some: variantFilter } } : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    p.sort === "newest" ? [{ createdAt: "desc" }]
    : p.sort === "price_asc" ? [{ basePrice: "asc" }]
    : p.sort === "price_desc" ? [{ basePrice: "desc" }]
    : p.sort === "best" ? [{ soldCount: "desc" }]
    : p.sort === "alpha" ? [locale === "en" ? { nameEn: "asc" } : { nameAr: "asc" }]
    : [{ isFeatured: "desc" }, { createdAt: "desc" }];

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, orderBy, skip: (p.page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: cardSelect }),
  ]);
  return { products, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getFilterOptions() {
  const [categories, sizeRows, colorRows] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.productVariant.findMany({ where: { isActive: true, product: { status: "ACTIVE" } }, distinct: ["size"], select: { size: true } }),
    prisma.productVariant.findMany({
      where: { isActive: true, product: { status: "ACTIVE" } },
      distinct: ["colorName"],
      select: { colorName: true, colorNameAr: true, colorHex: true },
    }),
  ]);
  const rank = (s: string) => (SIZE_ORDER.includes(s) ? SIZE_ORDER.indexOf(s) : 99);
  return { categories, sizes: sizeRows.map((r) => r.size).sort((a, b) => rank(a) - rank(b)), colors: colorRows };
}

export function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: [{ colorName: "asc" }, { size: "asc" }] },
      reviews: { where: { approved: true }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

export function getRelated(productId: string, categoryId: string, limit = 4) {
  return prisma.product.findMany({
    where: { status: "ACTIVE", categoryId, id: { not: productId } },
    orderBy: [{ isFeatured: "desc" }, { soldCount: "desc" }],
    take: limit,
    select: cardSelect,
  });
}
