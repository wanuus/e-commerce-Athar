"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { audit, back, egpToMinor, requireStaff } from "./guard";
import { HEX, bool, str } from "./form";
import { setVariantStock } from "./stock";

/** Creates every missing color x size combination for a product. Existing variants are left untouched. */
export async function generateVariants(fd: FormData): Promise<void> {
  const actor = await requireStaff();
  const productId = str(fd, "productId");
  const path = `/admin/products/${productId}`;
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { sku: true } });
  if (!product) return back("/admin/products", "error", "not_found");

  const colors = str(fd, "colors").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 12).map((line) => {
    const [name, nameAr, hex] = line.split(",").map((p) => p.trim());
    return { name, nameAr, hex };
  });
  if (colors.length === 0 || colors.some((c) => !c.name || !c.nameAr || !c.hex || !HEX.test(c.hex) || c.name.length > 30 || c.nameAr.length > 30)) {
    return back(path, "error", "invalid:colors");
  }
  const sizes = fd.getAll("size").map(String).filter((s) => /^[A-Z0-9]{1,5}$/.test(s)).slice(0, 10);
  if (sizes.length === 0) return back(path, "error", "invalid:sizes");
  const stock = Number(str(fd, "stock") || 0);
  if (!Number.isInteger(stock) || stock < 0 || stock > 100000) return back(path, "error", "invalid:stock");
  const override = egpToMinor(fd.get("priceOverride"));
  if (Number.isNaN(override)) return back(path, "error", "invalid:priceOverride");

  const rows = colors.flatMap((c) =>
    sizes.map((size) => ({
      productId,
      sku: `${product.sku}-${c.name!.toUpperCase().replace(/[^A-Z0-9]+/g, "")}-${size}`,
      colorName: c.name!, colorNameAr: c.nameAr!, colorHex: c.hex!, size, stock, priceOverride: override,
    })),
  );
  const res = await prisma.productVariant.createMany({ data: rows, skipDuplicates: true });
  await audit(actor, "variant.generate", "Product", productId, { created: res.count, requested: rows.length });
  revalidatePath("/", "layout");
  return back(path, "ok", `generated:${res.count}`);
}

export async function updateVariant(fd: FormData): Promise<void> {
  const actor = await requireStaff();
  const variantId = str(fd, "variantId");
  const returnTo = str(fd, "returnTo");
  const path = returnTo.startsWith("/admin/") ? returnTo : "/admin/inventory";
  const v = await prisma.productVariant.findUnique({ where: { id: variantId }, select: { id: true } });
  if (!v) return back(path, "error", "not_found");

  const override = egpToMinor(fd.get("priceOverride"));
  if (Number.isNaN(override)) return back(path, "error", "invalid:priceOverride");
  await prisma.productVariant.update({ where: { id: variantId }, data: { priceOverride: override, isActive: bool(fd, "isActive") } });

  const stock = setVariantStockInput(fd);
  if (stock !== null) {
    const r = await setVariantStock(variantId, stock, actor);
    if (r !== "ok") return back(path, "error", r === "below_reserved" ? "below_reserved" : "invalid:stock");
  }
  await audit(actor, "variant.update", "ProductVariant", variantId);
  revalidatePath("/", "layout");
  return back(path, "ok", "saved");
}

function setVariantStockInput(fd: FormData): number | null {
  const v = str(fd, "stock");
  if (v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : -1;
}

/** Inventory page: changes ONLY the stock number (never touches price or active state). */
export async function updateStockOnly(fd: FormData): Promise<void> {
  const actor = await requireStaff();
  const returnTo = str(fd, "returnTo");
  const path = returnTo.startsWith("/admin/") ? returnTo : "/admin/inventory";
  const stock = Number(str(fd, "stock"));
  const r = await setVariantStock(str(fd, "variantId"), stock, actor);
  if (r !== "ok") return back(path, "error", r === "below_reserved" ? "below_reserved" : r === "not_found" ? "not_found" : "invalid:stock");
  revalidatePath("/", "layout");
  return back(path, "ok", "saved");
}
