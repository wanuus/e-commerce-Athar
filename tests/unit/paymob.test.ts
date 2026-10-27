import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { paymobHmacString, verifyPaymobHmac } from "@/lib/payments/paymob-hmac";

const obj = {
  amount_cents: 100000, created_at: "2024-06-13T11:33:44.592345", currency: "EGP", error_occured: false,
  has_parent_transaction: false, id: 2556706, integration_id: 4214, is_3d_secure: true, is_auth: false,
  is_capture: false, is_refunded: false, is_standalone_payment: true, is_voided: false,
  order: { id: 4778239 }, owner: 302852, pending: false,
  source_data: { pan: "2346", sub_type: "MasterCard", type: "card" }, success: true,
};
const secret = "test-hmac-secret";
const sign = (o: object) => crypto.createHmac("sha512", secret).update(paymobHmacString(o as Record<string, unknown>)).digest("hex");

describe("paymob hmac", () => {
  it("concatenates the 20 documented fields in order", () => {
    expect(paymobHmacString(obj)).toBe("1000002024-06-13T11:33:44.592345EGPfalsefalse25567064214truefalsefalsefalsetruefalse4778239302852false2346MasterCardcardtrue");
  });
  it("accepts a correct signature (case-insensitive hex)", () => {
    const h = sign(obj);
    expect(verifyPaymobHmac(obj, h, secret)).toBe(true);
    expect(verifyPaymobHmac(obj, h.toUpperCase(), secret)).toBe(true);
  });
  it("rejects tampered amount, wrong secret and garbage", () => {
    const h = sign(obj);
    expect(verifyPaymobHmac({ ...obj, amount_cents: 1 }, h, secret)).toBe(false);
    expect(verifyPaymobHmac(obj, h, "other-secret")).toBe(false);
    expect(verifyPaymobHmac(obj, "abc", secret)).toBe(false);
    expect(verifyPaymobHmac(obj, "", secret)).toBe(false);
  });
});
