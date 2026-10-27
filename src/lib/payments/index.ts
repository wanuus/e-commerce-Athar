import { CashOnDeliveryProvider } from "./cod";
import { MockCardProvider } from "./mock";
import { PaymobProvider } from "./paymob";
import type { PaymentProvider } from "./types";

export function getCardProvider(): PaymentProvider | null {
  const { PAYMOB_SECRET_KEY: sk, PAYMOB_PUBLIC_KEY: pk, PAYMOB_INTEGRATION_ID: iid, PAYMOB_HMAC_SECRET: hs } = process.env;
  const integrationId = Number(iid);
  if (sk && pk && hs && Number.isInteger(integrationId) && integrationId > 0) {
    return new PaymobProvider({ secretKey: sk, publicKey: pk, integrationId, hmacSecret: hs });
  }
  // No real gateway configured: only ever fall back to the test gateway outside production.
  if (process.env.NODE_ENV !== "production") return new MockCardProvider();
  return null;
}

export function getProviderByName(name: string): PaymentProvider | null {
  if (name === "cod") return new CashOnDeliveryProvider();
  const card = getCardProvider();
  return card && card.name === name ? card : null;
}

export { CashOnDeliveryProvider };
