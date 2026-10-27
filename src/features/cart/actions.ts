"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "@/i18n/navigation";
import { MAX_LINE_QTY } from "@/lib/config/site";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { evaluateDiscount } from "@/features/pricing/service";
import { ensureCart, loadCart } from "./service";

export type AddState = { status: "idle" | "ok" | "error"; code?: "invalid" | "unavailable" | "max_qty" };

const addSchema = z.object({
  variantId: z.string().min(1).max(40),
  quantity: z.coerce.number().int().min(1).max(MAX_LINE_QTY),
  intent: z.enum(["add", "buy"]).default("add"),
});

export async function addToCart(_prev: AddState, formData: FormData): Promise<AddState> {
  const parsed = addSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", code: "invalid" };
  const { variantId, quantity, intent } = parsed.data;

  const variant = await prisma.productVariant.findUnique({ where: { id: variantId }, include: { product: { select: { status: true } } } });
  if (!variant || !variant.isActive || variant.product.status !== "ACTIVE") return { status: "error", code: "unavailable" };
  const available = variant.stock - variant.reserved;
  if (available <= 0) return { status: "error", code: "unavailable" };

  const cart = await ensureCart();
  const existing = await prisma.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
  const desired = (existing?.quantity ?? 0) + quantity;
  if (desired > available || desired > MAX_LINE_QTY) return { status: "error", code: "max_qty" };

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, quantity },
    update: { quantity: desired },
  });
  revalidatePath("/", "layout");
  if (intent === "buy") redirect({ href: "/checkout", locale: await getLocale() });
  return { status: "ok" };
}

/** Sets a line quantity, clamped to what is really available. 0 removes the line. */
export async function setQuantity(formData: FormData): Promise<void> {
  const parsed = z.object({ itemId: z.string().min(1), quantity: z.coerce.number().int().min(0).max(MAX_LINE_QTY) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const loaded = await loadCart();
  const line = loaded?.lines.find((l) => l.itemId === parsed.data.itemId);
  if (!loaded || !line) return;
  const qty = Math.min(parsed.data.quantity, line.available);
  if (qty <= 0) await prisma.cartItem.delete({ where: { id: line.itemId } });
  else await prisma.cartItem.update({ where: { id: line.itemId }, data: { quantity: qty } });
  revalidatePath("/", "layout");
}

export async function removeItem(formData: FormData): Promise<void> {
  const itemId = String(formData.get("itemId") ?? "");
  const loaded = await loadCart();
  if (!loaded || !loaded.lines.some((l) => l.itemId === itemId)) return;
  await prisma.cartItem.delete({ where: { id: itemId } });
  revalidatePath("/", "layout");
}

export type PromoState = { status: "idle" | "ok" | "error"; reason?: string };

export async function applyPromo(_prev: PromoState, formData: FormData): Promise<PromoState> {
  if (!rateLimit(`promo:${await clientIp()}`, 15, 10 * 60_000)) return { status: "error", reason: "rate" };
  const code = String(formData.get("code") ?? "").trim().toUpperCase().slice(0, 40);
  const loaded = await loadCart();
  if (!loaded || loaded.lines.length === 0) return { status: "error", reason: "empty" };
  const subtotal = loaded.lines.reduce((s, l) => s + l.lineTotal, 0);
  const check = await evaluateDiscount(code, subtotal);
  if (!check.ok) return { status: "error", reason: check.reason };
  await prisma.cart.update({ where: { id: loaded.cart.id }, data: { discountCode: check.code } });
  revalidatePath("/", "layout");
  return { status: "ok" };
}

export async function removePromo(): Promise<void> {
  const loaded = await loadCart();
  if (!loaded) return;
  await prisma.cart.update({ where: { id: loaded.cart.id }, data: { discountCode: null } });
  revalidatePath("/", "layout");
}
