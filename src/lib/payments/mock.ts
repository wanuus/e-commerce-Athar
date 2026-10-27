import { siteUrl } from "@/lib/config/site";
import { readPaymentStatus } from "./status";
import { InvalidWebhookError, type PaymentProvider, type SessionInput } from "./types";

/**
 * DEVELOPMENT-ONLY test gateway. It moves NO money. It exists so the whole card flow
 * (reserve stock -> pay -> webhook-style confirmation) can be tested without Paymob keys.
 * It is never returned in production (see payments/index.ts).
 */
export class MockCardProvider implements PaymentProvider {
  readonly name = "mock";
  async createPaymentSession(i: SessionInput) {
    return { redirectUrl: `${siteUrl()}/${i.locale}/pay/mock/${i.paymentId}`, providerRef: `mock_${i.paymentId}` };
  }
  verifyPayment = readPaymentStatus;
  getPaymentStatus = readPaymentStatus;
  async handleWebhook(): Promise<never> {
    throw new InvalidWebhookError("mock provider has no webhook");
  }
  async refundPayment() {
    return { ok: false };
  }
}
