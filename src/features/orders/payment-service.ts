import { prisma } from "@/lib/db/prisma";
import type { NormalizedPaymentEvent } from "@/lib/payments/types";
import { commitReserved } from "./inventory";
import { isUniqueViolation, sendConfirmationSafe } from "./service";

export type ApplyResult = "applied" | "noop" | "duplicate" | "unknown_payment" | "amount_mismatch";

/**
 * The ONLY place payment state changes from provider events.
 * Idempotent: the same event delivered twice is applied once (WebhookEvent unique key, same transaction as the changes).
 */
export async function applyPaymentEvent(provider: string, ev: NormalizedPaymentEvent): Promise<ApplyResult> {
  let result: ApplyResult = "applied";
  let confirmedOrderId: string | null = null;

  try {
    await prisma.$transaction(
      async (tx) => {
        if (await tx.webhookEvent.findUnique({ where: { provider_eventId: { provider, eventId: ev.eventId } } })) {
          result = "duplicate";
          return;
        }
        const payment = ev.paymentId
          ? await tx.payment.findUnique({ where: { id: ev.paymentId }, include: { order: { include: { items: true } } } })
          : null;
        if (!payment) {
          result = "unknown_payment";
          return;
        }
        await tx.webhookEvent.create({ data: { provider, eventId: ev.eventId } });
        const order = payment.order;
        const log = (type: string, message?: string) => tx.orderEvent.create({ data: { orderId: order.id, type, message } });

        if (ev.outcome === "paid") {
          if (payment.status === "PAID") {
            result = "noop";
            return;
          }
          if (ev.amountMinor !== payment.amount) {
            // Money moved but not the amount we expected: never auto-confirm. Flag for a human.
            await log("payment_amount_mismatch", `expected ${payment.amount}, received ${ev.amountMinor}`);
            result = "amount_mismatch";
            return;
          }
          const proof = { providerTransactionId: ev.providerTransactionId ?? null };
          if (order.paymentStatus === "PAID") {
            await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID", rawPayload: proof } });
            await log("duplicate_payment_needs_refund", payment.id);
            return;
          }
          if (order.status === "CANCELLED") {
            await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID", rawPayload: proof } });
            await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID" } });
            await log("paid_after_cancel_needs_attention", payment.id);
            return;
          }
          await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID", rawPayload: proof } });
          await tx.order.update({
            where: { id: order.id },
            data: { paymentStatus: "PAID", status: order.status === "PENDING" ? "CONFIRMED" : order.status },
          });
          if (order.paymentMethod === "CARD") {
            for (const it of order.items) {
              if (!it.variantId) continue;
              const ok = await commitReserved(tx, it.variantId, it.quantity);
              if (!ok) await log("stock_commit_failed", it.sku);
              const productId = (it.productSnapshot as { productId?: string } | null)?.productId;
              if (productId) await tx.product.update({ where: { id: productId }, data: { soldCount: { increment: it.quantity } } });
            }
          }
          await log("payment_confirmed", payment.id);
          confirmedOrderId = order.id;
          return;
        }

        if (ev.outcome === "failed") {
          if (payment.status === "PAID" || order.paymentStatus === "PAID") {
            result = "noop";
            return;
          }
          await tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
          await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } });
          await log("payment_failed", payment.id);
          return;
        }

        if (ev.outcome === "pending") {
          if (payment.status === "PENDING") await tx.payment.update({ where: { id: payment.id }, data: { status: "PROCESSING" } });
          return;
        }

        // refunded
        const partial = !!ev.refundedMinor && ev.refundedMinor < payment.amount;
        const status = partial ? "PARTIALLY_REFUNDED" : "REFUNDED";
        await tx.payment.update({ where: { id: payment.id }, data: { status } });
        await tx.order.update({ where: { id: order.id }, data: { paymentStatus: status } });
        await log("payment_refunded", String(ev.refundedMinor ?? payment.amount));
      },
      { timeout: 15000 },
    );
  } catch (e) {
    if (isUniqueViolation(e)) return "duplicate";
    throw e;
  }

  if (confirmedOrderId) await sendConfirmationSafe(confirmedOrderId);
  return result;
}
