import { describe, expect, it } from "vitest";
import { normalizeEgyptPhone } from "@/lib/validation/phone";
import { discountPercent, formatMoney } from "@/lib/utils/money";

describe("normalizeEgyptPhone", () => {
  it.each(["01012345678", "+201012345678", "00201012345678", "201012345678", "010 1234 5678"])("accepts %s", (v) => {
    expect(normalizeEgyptPhone(v)).toBe("+201012345678");
  });
  it.each(["01312345678", "0101234567", "abc", "", "+971501234567"])("rejects %s", (v) => {
    expect(normalizeEgyptPhone(v)).toBeNull();
  });
});

describe("money", () => {
  it("computes discount percent", () => {
    expect(discountPercent(79900, 99900)).toBe(20);
    expect(discountPercent(100, null)).toBe(0);
    expect(discountPercent(100, 90)).toBe(0);
  });
  it("formats EGP", () => {
    expect(formatMoney(79900, "en")).toContain("799");
  });
});
