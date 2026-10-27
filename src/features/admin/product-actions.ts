"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { isUniqueViolation } from "@/features/orders/service";
import { isCloudinaryUrl } from "@/lib/storage/cloudinary";
import { audit, back, egpToMinor, requireStaff } from "./guard";
import { bool, opt, str } from "./form";

const productSchema = z.object({
  nameAr: z.string().min(1).max(160),
  nameEn: z.string().min(1).max(160),
  slug: z.string().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  sku: z.string().min(2).max(60),
  categoryId: z.string().min(1),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
});

function tagsFrom(v: string): string[] {
  return [...new Set(v.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 20);
}

export async function saveProduct(fd: FormData): Promise<void> {
  const actor = await requireStaff();
  const id = opt(fd, "id");
  const path = id ? `/admin/products/${id}` : "/admin/products/new";

  const parsed = productSchema.safeParse({
    nameAr: str(fd, "nameAr"), nameEn: str(fd, "nameEn"), slug: str(fd, "slug"), sku: str(fd, "sku"),
    categoryId: str(fd, "categoryId"), status: id ? str(fd, "status") : "DRAFT",
  });
  if (!parsed.success) return back(path, "error", `invalid:${String(parsed.error.issues[0]?.path[0] ?? "form")}`);
  const base = egpToMinor(fd.get("basePrice"));
  const compare = egpToMinor(fd.get("compareAtPrice"));
  if (base === null || Number.isNaN(base)) return back(path, "error", "invalid:basePrice");
  if (Number.isNaN(compare) || (compare !== null && compare <= base)) return back(path, "error", "invalid:compareAtPrice");

  const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId }, select: { id: true } });
  if (!category) return back(path, "error", "invalid:categoryId");

  const data = {
    ...parsed.data,
    basePrice: base,
    compareAtPrice: compare,
    isFeatured: bool(fd, "isFeatured"),
    material: opt(fd, "material") ?? null,
    fit: opt(fd, "fit") ?? null,
    careAr: opt(fd, "careAr") ?? null,
    careEn: opt(fd, "careEn") ?? null,
    shortDescAr: opt(fd, "shortDescAr") ?? null,
    shortDescEn: opt(fd, "shortDescEn") ?? null,
    descAr: opt(fd, "descAr") ?? null,
    descEn: opt(fd, "descEn") ?? null,
    seoTitle: opt(fd, "seoTitle") ?? null,
    seoDescription: opt(fd, "seoDescription") ?? null,
    tags: tagsFrom(str(fd, "tags")),
  };

  try {
    if (id) {
      if (data.status === "ACTIVE") {
        const active = await prisma.productVariant.count({ where: { productId: id, isActive: true } });
        if (active === 0) return back(path, "error", "needs_variant");
      }
      await prisma.product.update({ where: { id }, data });
      await audit(actor, "product.update", "Product", id, { sku: data.sku, status: data.status });
      revalidatePath("/", "layout");
      return back(path, "ok", "saved");
    }
    const created = await prisma.product.create({ data });
    await audit(actor, "product.create", "Product", created.id, { sku: data.sku });
    revalidatePath("/", "layout");
    return back(`/admin/products/${created.id}`, "ok", "created");
  } catch (e) {
    if (isUniqueViolation(e)) return back(path, "error", "duplicate");
    throw e;
  }
}

export async function addProductImage(fd: FormData): Promise<void> {
  const actor = await requireStaff();
  const productId = str(fd, "productId");
  const path = `/admin/products/${productId}`;
  const url = str(fd, "url");
  if (!isCloudinaryUrl(url, process.env.CLOUDINARY_CLOUD_NAME)) return back(path, "error", "invalid:image");
  const colorName = opt(fd, "colorName") ?? null;
  if (colorName) {
    const exists = await prisma.productVariant.findFirst({ where: { productId, colorName }, select: { id: true } });
    if (!exists) return back(path, "error", "invalid:colorName");
  }
  const last = await prisma.productImage.findFirst({ where: { productId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  await prisma.productImage.create({
    data: { productId, url, colorName, altAr: opt(fd, "altAr") ?? null, altEn: opt(fd, "altEn") ?? null, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });
  await audit(actor, "product.image_add", "Product", productId);
  revalidatePath("/", "layout");
  return back(path, "ok", "image_added");
}

export async function deleteProductImage(fd: FormData): Promise<void> {
  const actor = await requireStaff();
  const img = await prisma.productImage.findUnique({ where: { id: str(fd, "imageId") } });
  if (!img) return back("/admin/products", "error", "not_found");
  await prisma.productImage.delete({ where: { id: img.id } });
  await audit(actor, "product.image_delete", "Product", img.productId);
  revalidatePath("/", "layout");
  return back(`/admin/products/${img.productId}`, "ok", "image_deleted");
}

export async function setPrimaryImage(fd: FormData): Promise<void> {
  const actor = await requireStaff();
  const img = await prisma.productImage.findUnique({ where: { id: str(fd, "imageId") } });
  if (!img) return back("/admin/products", "error", "not_found");
  const first = await prisma.productImage.findFirst({ where: { productId: img.productId }, orderBy: { sortOrder: "asc" }, select: { sortOrder: true } });
  await prisma.productImage.update({ where: { id: img.id }, data: { sortOrder: (first?.sortOrder ?? 0) - 1 } });
  await audit(actor, "product.image_primary", "Product", img.productId);
  revalidatePath("/", "layout");
  return back(`/admin/products/${img.productId}`, "ok", "saved");
}
