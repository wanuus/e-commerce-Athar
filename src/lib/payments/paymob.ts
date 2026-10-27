import { siteUrl } from "@/lib/config/site";
import { paymobHmacString, pick, verifyPaymobHmac, type Obj } from "./paymob-hmac";
import { readPaymentStatus } from "./status";

export { paymobHmacString, verifyPaymobHmac };
import { InvalidWebhookError, type NormalizedPaymentEvent, type PaymentProvider, type SessionInput } from "./types";

const BASE = "https://accept.paymob.com";

type Config = { secretKey: string; publicKey: string; integrationId: number; hmacSecret: string };

export class PaymobProvider implements PaymentProvider {
  readonly name = "paymob";
  constructor(private cfg: Config) {}

  async createPaymentSession(i: SessionInput) {
    const na = (v?: string | null) => (v && v.trim() ? v : "NA");
    const res = await fetch(`${BASE}/v1/intention/`, {
      method: "POST",
      headers: { Authorization: `Token ${this.cfg.secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: i.amountMinor,
        currency: i.currency,
        payment_methods: [this.cfg.integrationId],
        items: [{ name: `Order ${i.orderNumber}`, amount: i.amountMinor, description: `Order ${i.orderNumber}`, quantity: 1 }],
        billing_data: {
          first_name: i.customer.firstName,
          last_name: i.customer.lastName,
          email: i.customer.email,
          phone_number: i.customer.phone,
          country: "EG",
          state: i.address.governorate,
          city: i.address.city,
          street: i.address.street,
          building: na(i.address.building),
          apartment: na(i.address.apartment),
          floor: na(i.address.floor),
          shipping_method: "NA",
          postal_code: "NA",
        },
        customer: { first_name: i.customer.firstName, last_name: i.customer.lastName, email: i.customer.email },
        special_reference: i.paymentId, // comes back as order.merchant_order_id in the callback
        notification_url: `${siteUrl()}/api/webhooks/paymob`,
        redirection_url: `${siteUrl()}/${i.locale}/orders/${i.publicToken}`,
      }),
    });
    if (!res.ok) throw new Error(`paymob_intention_${res.status}`);
    const data = (await res.json()) as { client_secret?: string; id?: string };
    if (!data.client_secret) throw new Error("paymob_no_client_secret");
    const redirectUrl = `${BASE}/unifiedcheckout/?publicKey=${encodeURIComponent(this.cfg.publicKey)}&clientSecret=${encodeURIComponent(data.client_secret)}`;
    return { redirectUrl, providerRef: data.id };
  }

  verifyPayment = readPaymentStatus;
  getPaymentStatus = readPaymentStatus;

  async handleWebhook(req: Request): Promise<NormalizedPaymentEvent> {
    const hmac = new URL(req.url).searchParams.get("hmac");
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new InvalidWebhookError("bad_json");
    }
    const obj = (body as { obj?: Obj } | null)?.obj;
    if (!hmac || !obj || typeof obj !== "object") throw new InvalidWebhookError("missing_fields");
    if (!verifyPaymobHmac(obj, hmac, this.cfg.hmacSecret)) throw new InvalidWebhookError("bad_signature");

    const flag = (k: string) => pick(obj, k) === true;
    const amountMinor = Number(pick(obj, "amount_cents") ?? 0);
    const refundedMinor = Number(pick(obj, "refunded_amount_cents") ?? 0);
    let outcome: NormalizedPaymentEvent["outcome"];
    if (flag("is_refunded") || flag("is_voided")) outcome = "refunded";
    else if (flag("pending") || (flag("is_auth") && !flag("is_capture"))) outcome = "pending";
    else if (flag("success") && !flag("error_occured")) outcome = "paid";
    else outcome = "failed";

    const txId = String(pick(obj, "id") ?? "");
    return {
      eventId: `${txId}:${outcome}`,
      paymentId: String(pick(obj, "order.merchant_order_id") ?? ""),
      outcome,
      amountMinor,
      refundedMinor: refundedMinor || undefined,
      providerTransactionId: txId || undefined,
    };
  }

  /** UNVERIFIED against live Paymob: test in sandbox before relying on it. */
  async refundPayment({ providerTransactionId, amountMinor }: { providerTransactionId: string; amountMinor: number }) {
    const res = await fetch(`${BASE}/api/acceptance/void_refund/refund`, {
      method: "POST",
      headers: { Authorization: `Token ${this.cfg.secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ transaction_id: providerTransactionId, amount_cents: amountMinor }),
    });
    return { ok: res.ok };
  }
}
