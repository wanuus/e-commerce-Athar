import crypto from "node:crypto";

export type Obj = Record<string, unknown>;

export function pick(obj: Obj, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Obj)[k] : undefined), obj);
}

/** The 20 fields Paymob signs, in the documented order. */
const HMAC_FIELDS = [
  "amount_cents", "created_at", "currency", "error_occured", "has_parent_transaction", "id", "integration_id",
  "is_3d_secure", "is_auth", "is_capture", "is_refunded", "is_standalone_payment", "is_voided", "order.id",
  "owner", "pending", "source_data.pan", "source_data.sub_type", "source_data.type", "success",
];

export function paymobHmacString(obj: Obj): string {
  return HMAC_FIELDS.map((f) => {
    const v = pick(obj, f);
    return v === undefined || v === null ? "" : String(v);
  }).join("");
}

export function verifyPaymobHmac(obj: Obj, receivedHmac: string, secret: string): boolean {
  const expected = crypto.createHmac("sha512", secret).update(paymobHmacString(obj)).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(receivedHmac.toLowerCase(), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
