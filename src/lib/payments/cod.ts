import { siteUrl } from "@/lib/config/site";
import { readPaymentStatus } from "./status";
import { InvalidWebhookError, type PaymentProvider, type SessionInput } from "./types";

/** Cash on Delivery: no online session. Payment stays PENDING until an admin records the cash collection. */
export class CashOnDeliveryProvider implements PaymentProvider {
  readonly name = "cod";
  async createPaymentSession(i: SessionInput) {
    return { redirectUrl: `${siteUrl()}/${i.locale}/orders/${i.publicToken}` };
  }
  verifyPayment = readPaymentStatus;
  getPaymentStatus = readPaymentStatus;
  async handleWebhook(): Promise<never> {
    throw new InvalidWebhookError("COD has no webhooks");
  }
  async refundPayment() {
    return { ok: false };
  }
}
