import type { PaymentStatus } from "@prisma/client";

export type NormalizedPaymentEvent = {
  /** Unique per provider state change; used for idempotent webhook processing. */
  eventId: string;
  paymentId: string;
  outcome: "paid" | "failed" | "pending" | "refunded";
  amountMinor: number;
  refundedMinor?: number;
  providerTransactionId?: string;
};

export type SessionInput = {
  orderId: string;
  orderNumber: string;
  paymentId: string;
  amountMinor: number;
  currency: string;
  locale: "ar" | "en";
  publicToken: string;
  customer: { firstName: string; lastName: string; email: string; phone: string };
  address: { governorate: string; city: string; street: string; building?: string | null; apartment?: string | null; floor?: string | null };
};

export interface PaymentProvider {
  readonly name: string;
  createPaymentSession(input: SessionInput): Promise<{ redirectUrl: string; providerRef?: string }>;
  /** Authoritative status = what the verified server-to-server webhook recorded. A browser redirect is never proof of payment. */
  verifyPayment(paymentId: string): Promise<PaymentStatus>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  /** Authenticate + parse a provider callback. Throws InvalidWebhookError when the signature is wrong. */
  handleWebhook(req: Request): Promise<NormalizedPaymentEvent>;
  refundPayment(input: { providerTransactionId: string; amountMinor: number }): Promise<{ ok: boolean; ref?: string }>;
}

export class InvalidWebhookError extends Error {}
