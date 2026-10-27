"use server";

import { redirect as externalRedirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "@/i18n/navigation";
import { GOVERNORATE_KEYS } from "@/lib/config/egypt";
import { getCardProvider } from "@/lib/payments";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { loadCart, clearCart, type CartLine } from "@/features/cart/service";
import { buildQuote, type Quote } from "@/features/pricing/service";
import { sellStock, reserveStock } from "./inventory";
import { checkoutSchema, type CheckoutInput } from "./schema";
import { cancelUnpaidOrder, generateOrderNumber, isUniqueViolation, sendConfirmationSafe, startCardPayment } from "./service";

export type QuoteDTO =
  | {
      ok: true;
      subtotal: number;
      discountTotal: number;
      discountCode: string | null;
      shippingFee: number;
      freeShipping: boolean;
      total: number;
      zoneNameAr: string;
      zoneNameEn: string;
      estimatedDays: number;
    }
  | { ok: false; reason: "empty" | "no_zone" };

/** Called by the checkout form when the governorate changes, so the customer sees the exact fee before confirming. */
export async function getQuote(governorate: string): Promise<QuoteDTO> {
  const loaded = await loadCart();
  if (!loaded || loaded.lines.length === 0) return { ok: false, reason: "empty" };
  if (!GOVERNORATE_KEYS.includes(governorate)) return { ok: false, reason: "no_zone" };
  const q = await buildQuote(loaded.lines, loaded.cart.discountCode, governorate);
  if (!q.zone || q.shippingFee === null) return { ok: false, reason: "no_zone" };
  return {
    ok: true,
    subtotal: q.subtotal,
    discountTotal: q.discountTotal,
    discountCode: q.discountCode,
    shippingFee: q.shippingFee,
    freeShipping: q.freeShipping,
    total: q.total,
    zoneNameAr: q.zone.nameAr,
    zoneNameEn: q.zone.nameEn,
    estimatedDays: q.zone.estimatedDays,
  };
}

export type PlaceOrderState = {
  status: "idle" | "error";
  code?: "rate_limited" | "validation" | "empty_cart" | "stock" | "discount" | "price_changed" | "no_zone" | "payment_unavailable" | "payment_failed";
  fieldErrors?: Record<string, string>;
  newTotal?: number;
  values?: Record<string, string>;
};

class StockError extends Error {}
class DiscountError extends Error {}

async function createOrder(args: { input: CheckoutInput; lines: CartLine[]; quote: Quote; locale: "ar" | "en"; providerName: string }) {
  const { input, lines, quote, locale, providerName } = args;
  const method = input.paymentMethod;
  const n = (v?: string) => v ?? null;

  return prisma.$transaction(
    async (tx) => {
      for (const l of lines) {
        // COD sells immediately; card reserves until payment is confirmed.
        const ok = method === "COD" ? await sellStock(tx, l.variantId, l.quantity) : await reserveStock(tx, l.variantId, l.quantity);
        if (!ok) throw new StockError(l.sku);
        if (method === "COD") await tx.product.update({ where: { id: l.productId }, data: { soldCount: { increment: l.quantity } } });
      }
      if (quote.discountCode) {
        const used = await tx.$executeRaw`UPDATE "Discount" SET "usedCount" = "usedCount" + 1
          WHERE "code" = ${quote.discountCode} AND ("maxUses" IS NULL OR "usedCount" < "maxUses")`;
        if (used !== 1) throw new DiscountError();
      }

      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          locale,
          addressSnapshot: {
            country: "EG",
            governorate: input.governorate,
            city: input.city,
            district: n(input.district),
            street: input.street,
            building: n(input.building),
            apartment: n(input.apartment),
            floor: n(input.floor),
            landmark: n(input.landmark),
            postalCode: n(input.postalCode),
            instructions: n(input.instructions),
          },
          paymentMethod: method,
          subtotal: quote.subtotal,
          discountTotal: quote.discountTotal,
          discountCode: quote.discountCode,
          discountSnapshot: quote.discountCode ? { code: quote.discountCode, amount: quote.discountTotal } : undefined,
          shippingFee: quote.shippingFee ?? 0,
          total: quote.total,
          customerNote: input.customerNote,
          idempotencyKey: input.idempotencyKey,
          items: {
            create: lines.map((l) => ({
              variantId: l.variantId,
              productSnapshot: { productId: l.productId, slug: l.slug, image: l.image },
              sku: l.sku,
              nameAr: l.nameAr,
              nameEn: l.nameEn,
              colorName: l.colorName,
              size: l.size,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
              lineTotal: l.lineTotal,
            })),
          },
          events: { create: [{ type: "order_placed", message: method }] },
        },
      });
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          provider: method === "COD" ? "cod" : providerName,
          method,
          status: "PENDING",
          amount: quote.total,
          idempotencyKey: `${input.idempotencyKey}:1`,
        },
      });
      return { order, payment };
    },
    { timeout: 15000 },
  );
}

export async function placeOrder(_prev: PlaceOrderState, formData: FormData): Promise<PlaceOrderState> {
  const locale = (await getLocale()) === "en" ? "en" : "ar";
  if (!rateLimit(`order:${await clientIp()}`, 10, 10 * 60_000)) return { status: "error", code: "rate_limited" };
  const values: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") values[k] = v;

  const parsed = checkoutSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] = issue.message;
    return { status: "error", code: "validation", fieldErrors, values };
  }
  const input = parsed.data;

  // Double-click / retry safety: the same checkout form can only ever create one order.
  const prior = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: { publicToken: true } });
  if (prior) redirect({ href: `/orders/${prior.publicToken}`, locale });

  const loaded = await loadCart();
  if (!loaded || loaded.lines.length === 0) return { status: "error", code: "empty_cart", values };
  if (loaded.lines.some((l) => l.status !== "ok")) return { status: "error", code: "stock", values };

  const card = input.paymentMethod === "CARD" ? getCardProvider() : null;
  if (input.paymentMethod === "CARD" && !card) return { status: "error", code: "payment_unavailable", values };

  const quote = await buildQuote(loaded.lines, loaded.cart.discountCode, input.governorate);
  if (!quote.zone || quote.shippingFee === null) return { status: "error", code: "no_zone", values };
  if (card && quote.total <= 0) return { status: "error", code: "payment_unavailable", values };
  // The customer confirmed a specific amount. If anything changed, they must re-confirm the new one.
  if (quote.total !== input.expectedTotal) return { status: "error", code: "price_changed", newTotal: quote.total, values };

  let created;
  try {
    created = await createOrder({ input, lines: loaded.lines, quote, locale, providerName: card?.name ?? "cod" });
  } catch (e) {
    if (e instanceof StockError) return { status: "error", code: "stock", values };
    if (e instanceof DiscountError) return { status: "error", code: "discount", values };
    if (isUniqueViolation(e)) {
      const again = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: { publicToken: true } });
      if (again) redirect({ href: `/orders/${again.publicToken}`, locale });
    }
    throw e;
  }
  const { order, payment } = created;

  if (input.paymentMethod === "COD") {
    await clearCart(loaded.cart.id);
    await sendConfirmationSafe(order.id);
    redirect({ href: `/orders/${order.publicToken}`, locale });
  }

  let paymentUrl: string | null = null;
  try {
    paymentUrl = await startCardPayment(payment.id);
  } catch (e) {
    console.error("payment session failed", e instanceof Error ? e.message : e);
    await cancelUnpaidOrder(order.id, "payment_session_failed");
    return { status: "error", code: "payment_failed", values };
  }
  await clearCart(loaded.cart.id);
  externalRedirect(paymentUrl);
}

/** Lets a customer start a fresh payment attempt for an unpaid card order. */
export async function retryPayment(formData: FormData): Promise<void> {
  const locale = (await getLocale()) === "en" ? "en" : "ar";
  const token = String(formData.get("token") ?? "").slice(0, 60);
  const order = await prisma.order.findUnique({ where: { publicToken: token }, include: { payments: true } });
  const page = `/orders/${token}`;
  if (!order || order.paymentMethod !== "CARD" || order.status === "CANCELLED" || order.paymentStatus === "PAID") redirect({ href: page, locale });
  const provider = getCardProvider();
  if (!order || !provider) return redirect({ href: `${page}?error=payment`, locale });

  const payment = await prisma.payment.create({
    data: { orderId: order.id, provider: provider.name, method: "CARD", status: "PENDING", amount: order.total, idempotencyKey: `${order.id}:${order.payments.length + 1}` },
  });
  await prisma.payment.updateMany({ where: { orderId: order.id, id: { not: payment.id }, status: { in: ["PENDING", "PROCESSING", "FAILED"] } }, data: { status: "CANCELLED" } });

  let url: string | null = null;
  try {
    url = await startCardPayment(payment.id);
  } catch (e) {
    console.error("payment retry failed", e instanceof Error ? e.message : e);
  }
  if (!url) redirect({ href: `${page}?error=payment`, locale });
  externalRedirect(url as string);
}
