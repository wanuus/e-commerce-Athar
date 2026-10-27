"use server";

import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "@/i18n/navigation";
import { getCardProvider } from "@/lib/payments";
import { applyPaymentEvent } from "./payment-service";

/** DEVELOPMENT ONLY. Simulates the gateway's confirmation so the card flow can be tested without real money. */
export async function mockPaymentResult(formData: FormData): Promise<void> {
  if (process.env.NODE_ENV === "production" || getCardProvider()?.name !== "mock") notFound();
  const paymentId = String(formData.get("paymentId") ?? "");
  const result = formData.get("result") === "success" ? "success" : "fail";
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!payment) notFound();
  await applyPaymentEvent("mock", {
    eventId: `mock:${paymentId}:${result}:${Date.now()}`,
    paymentId,
    outcome: result === "success" ? "paid" : "failed",
    amountMinor: payment.amount,
  });
  redirect({ href: `/orders/${payment.order.publicToken}`, locale: await getLocale() });
}
