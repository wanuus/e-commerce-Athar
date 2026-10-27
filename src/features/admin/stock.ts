import { prisma } from "@/lib/db/prisma";
import { siteUrl } from "@/lib/config/site";
import { sendEmail } from "@/lib/email";
import { backInStockEmail } from "@/lib/email/templates";
import { audit, type Actor } from "./guard";

/** Emails everyone waiting for this exact variant once it is available again. Each request is sent once. */
export async function notifyIfBackInStock(variantId: string): Promise<void> {
  const v = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { slug: true, nameAr: true, nameEn: true, status: true } } },
  });
  if (!v || !v.isActive || v.product.status !== "ACTIVE" || v.stock - v.reserved <= 0) return;
  const pending = await prisma.stockNotification.findMany({ where: { variantId, notifiedAt: null }, take: 200 });
  for (const n of pending) {
    try {
      const locale = n.locale === "en" ? "en" : "ar";
      const { subject, html } = backInStockEmail({
        locale,
        productName: locale === "en" ? v.product.nameEn : v.product.nameAr,
        variantLabel: `${locale === "en" ? v.colorName : v.colorNameAr} / ${v.size}`,
        url: `${siteUrl()}/${locale}/products/${v.product.slug}`,
      });
      await sendEmail({ to: n.email, subject, html });
      await prisma.stockNotification.update({ where: { id: n.id }, data: { notifiedAt: new Date() } });
    } catch (e) {
      console.error("back-in-stock email failed", e instanceof Error ? e.message : e);
    }
  }
}

/** Sets the physical stock of a variant. Stock can never drop below what is reserved for unpaid card orders. */
export async function setVariantStock(variantId: string, stock: number, actor: Actor): Promise<"ok" | "not_found" | "below_reserved" | "invalid"> {
  if (!Number.isInteger(stock) || stock < 0 || stock > 100000) return "invalid";
  const v = await prisma.productVariant.findUnique({ where: { id: variantId }, select: { stock: true, reserved: true, sku: true } });
  if (!v) return "not_found";
  if (stock < v.reserved) return "below_reserved";
  await prisma.productVariant.update({ where: { id: variantId }, data: { stock } });
  await audit(actor, "stock.set", "ProductVariant", variantId, { sku: v.sku, from: v.stock, to: stock });
  await notifyIfBackInStock(variantId);
  return "ok";
}
