import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { siteUrl } from "@/lib/config/site";
import { sendEmail } from "@/lib/email";
import { shippedEmail } from "@/lib/email/templates";
import { releaseReserved, restock } from "@/features/orders/inventory";
import { audit, type Actor } from "./guard";
import { fulfillmentFor, nextStatuses } from "./order-rules";
import { notifyIfBackInStock } from "./stock";

export type TransitionResult = "ok" | "not_found" | "invalid_transition";

/**
 * Moves an order to a new status and keeps stock, discount usage and payment state consistent:
 *  - cancel: sold stock (COD, or card already paid) goes back on the shelf; unpaid card reservations are released.
 *  - return: stock goes back only if the admin ticks "restock".
 *  - a cancelled order that was already paid is flagged "refund_required" (refunds are made in Paymob / in cash).
 */
export async function transitionOrder(orderId: string, to: OrderStatus, actor: Actor, opts: { restock?: boolean } = {}): Promise<TransitionResult> {
  const restocked = new Set<string>();

  const result = await prisma.$transaction(async (tx): Promise<TransitionResult> => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return "not_found";
    if (!nextStatuses(order.status).includes(to)) return "invalid_transition";

    let paymentStatus = order.paymentStatus;
    const wasSold = order.paymentMethod === "COD" || order.paymentStatus === "PAID";

    if (to === "CANCELLED") {
      for (const it of order.items) {
        if (!it.variantId) continue;
        if (wasSold) {
          await restock(tx, it.variantId, it.quantity);
          restocked.add(it.variantId);
        } else {
          await releaseReserved(tx, it.variantId, it.quantity);
        }
      }
      if (order.discountCode) {
        await tx.$executeRaw`UPDATE "Discount" SET "usedCount" = GREATEST("usedCount" - 1, 0) WHERE "code" = ${order.discountCode}`;
      }
    }
    if (to === "RETURNED" && opts.restock) {
      for (const it of order.items) {
        if (!it.variantId) continue;
        await restock(tx, it.variantId, it.quantity);
        restocked.add(it.variantId);
      }
    }
    if (to === "CANCELLED" || to === "RETURNED") {
      if (order.paymentStatus === "PAID") {
        await tx.orderEvent.create({ data: { orderId, type: "refund_required", message: to } });
      } else if (order.paymentStatus !== "REFUNDED" && order.paymentStatus !== "PARTIALLY_REFUNDED") {
        paymentStatus = "CANCELLED";
        await tx.payment.updateMany({ where: { orderId, status: { in: ["PENDING", "PROCESSING", "FAILED"] } }, data: { status: "CANCELLED" } });
      }
    }

    await tx.order.update({ where: { id: orderId }, data: { status: to, fulfillmentStatus: fulfillmentFor(to), paymentStatus } });
    await tx.orderEvent.create({ data: { orderId, type: "status_changed", message: `${order.status} -> ${to}`, actorId: actor.id } });
    return "ok";
  });

  if (result === "ok") {
    await audit(actor, "order.status", "Order", orderId, { to });
    for (const id of restocked) await notifyIfBackInStock(id);
    if (to === "SHIPPED") await sendShippedEmailSafe(orderId);
  }
  return result;
}

async function sendShippedEmailSafe(orderId: string) {
  try {
    const o = await prisma.order.findUnique({ where: { id: orderId } });
    if (!o) return;
    const locale = o.locale === "en" ? "en" : "ar";
    const { subject, html } = shippedEmail({
      locale,
      orderNumber: o.orderNumber,
      orderUrl: `${siteUrl()}/${locale}/orders/${o.publicToken}`,
      carrier: o.trackingCarrier,
      trackingNumber: o.trackingNumber,
    });
    await sendEmail({ to: o.email, subject, html });
  } catch (e) {
    console.error("shipped email failed", e instanceof Error ? e.message : e);
  }
}

/** Admin confirms the courier handed over the cash. Never automatic. */
export async function markCodCollected(orderId: string, actor: Actor): Promise<"ok" | "not_found" | "not_allowed"> {
  const r = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { payments: true } });
    if (!order) return "not_found" as const;
    const payment = order.payments.find((p) => p.provider === "cod" && p.status === "PENDING");
    if (order.paymentMethod !== "COD" || !payment || order.status === "CANCELLED" || order.status === "RETURNED") return "not_allowed" as const;
    const now = new Date();
    await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID", collectedAt: now, collectedById: actor.id } });
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "PAID" } });
    await tx.orderEvent.create({ data: { orderId, type: "cod_collected", message: String(order.total), actorId: actor.id } });
    return "ok" as const;
  });
  if (r === "ok") await audit(actor, "order.cod_collected", "Order", orderId);
  return r;
}

/** Records that a refund was paid out (in Paymob's dashboard, or in cash) for a cancelled/returned paid order. */
export async function markRefunded(orderId: string, actor: Actor): Promise<"ok" | "not_found" | "not_allowed"> {
  const r = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) return "not_found" as const;
    if (order.paymentStatus !== "PAID" || (order.status !== "CANCELLED" && order.status !== "RETURNED")) return "not_allowed" as const;
    await tx.payment.updateMany({ where: { orderId, status: "PAID" }, data: { status: "REFUNDED" } });
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "REFUNDED" } });
    await tx.orderEvent.create({ data: { orderId, type: "refund_recorded", actorId: actor.id } });
    return "ok" as const;
  });
  if (r === "ok") await audit(actor, "order.refund_recorded", "Order", orderId);
  return r;
}
