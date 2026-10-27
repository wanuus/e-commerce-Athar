import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { siteUrl } from "@/lib/config/site";
import { sendEmail } from "@/lib/email";
import { orderConfirmationEmail } from "@/lib/email/templates";
import { getCardProvider } from "@/lib/payments";
import { releaseReserved } from "./inventory";

export function generateOrderNumber(): string {
  return `ATH-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
}

export function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/** Starts (or restarts) an online payment for an order. Returns the URL to send the customer to. */
export async function startCardPayment(paymentId: string): Promise<string> {
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { order: true } });
  const provider = getCardProvider();
  if (!provider || provider.name !== payment.provider) throw new Error("provider_unavailable");
  const o = payment.order;
  const addr = o.addressSnapshot as Record<string, string | null>;
  const session = await provider.createPaymentSession({
    orderId: o.id,
    orderNumber: o.orderNumber,
    paymentId: payment.id,
    amountMinor: payment.amount,
    currency: payment.currency,
    locale: o.locale === "en" ? "en" : "ar",
    publicToken: o.publicToken,
    customer: { firstName: o.firstName, lastName: o.lastName, email: o.email, phone: o.phone },
    address: {
      governorate: addr.governorate ?? "",
      city: addr.city ?? "",
      street: addr.street ?? "",
      building: addr.building,
      apartment: addr.apartment,
      floor: addr.floor,
    },
  });
  await prisma.$transaction([
    prisma.payment.update({ where: { id: payment.id }, data: { status: "PROCESSING", providerRef: session.providerRef ?? payment.providerRef } }),
    prisma.order.update({ where: { id: o.id }, data: { paymentStatus: "PROCESSING" } }),
  ]);
  return session.redirectUrl;
}

/** Cancels an order whose online payment never completed, releasing its reserved stock and discount use. */
export async function cancelUnpaidOrder(orderId: string, reason: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.status === "CANCELLED" || order.paymentStatus === "PAID") return false;
    if (order.paymentMethod === "CARD") {
      for (const it of order.items) if (it.variantId) await releaseReserved(tx, it.variantId, it.quantity);
    }
    if (order.discountCode) {
      await tx.$executeRaw`UPDATE "Discount" SET "usedCount" = GREATEST("usedCount" - 1, 0) WHERE "code" = ${order.discountCode}`;
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED", paymentStatus: "CANCELLED" } });
    await tx.payment.updateMany({ where: { orderId, status: { in: ["PENDING", "PROCESSING", "FAILED"] } }, data: { status: "CANCELLED" } });
    await tx.orderEvent.create({ data: { orderId, type: "order_cancelled", message: reason } });
    return true;
  });
}

/** Sends the confirmation email once. Failures are logged, never thrown (an email problem must not break an order). */
export async function sendConfirmationSafe(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, events: { where: { type: "confirmation_email_sent" } } } });
    if (!order || order.events.length > 0) return;
    const locale = order.locale === "en" ? "en" : "ar";
    const { subject, html } = orderConfirmationEmail({
      locale,
      brandName: "آثر",
      orderNumber: order.orderNumber,
      orderUrl: `${siteUrl()}/${locale}/orders/${order.publicToken}`,
      firstName: order.firstName,
      paymentMethod: order.paymentMethod,
      items: order.items.map((i) => ({ name: locale === "en" ? i.nameEn : i.nameAr, colorName: i.colorName, size: i.size, quantity: i.quantity, lineTotal: i.lineTotal })),
      subtotal: order.subtotal,
      discountTotal: order.discountTotal,
      shippingFee: order.shippingFee,
      total: order.total,
    });
    await sendEmail({ to: order.email, subject, html });
    await prisma.orderEvent.create({ data: { orderId, type: "confirmation_email_sent" } });
  } catch (e) {
    console.error("confirmation email failed", e instanceof Error ? e.message : e);
  }
}
