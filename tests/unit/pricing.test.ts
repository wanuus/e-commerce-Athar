import { describe, expect, it } from "vitest";
import { computeDiscountAmount, pickZone } from "@/features/pricing/pure";

describe("computeDiscountAmount", () => {
  it("percent rounds to piasters and never exceeds subtotal", () => {
    expect(computeDiscountAmount("PERCENT", 10, 79900)).toBe(7990);
    expect(computeDiscountAmount("PERCENT", 10, 12345)).toBe(1235);
    expect(computeDiscountAmount("PERCENT", 250, 5000)).toBe(5000);
  });
  it("fixed is capped at the subtotal", () => {
    expect(computeDiscountAmount("FIXED", 20000, 15000)).toBe(15000);
    expect(computeDiscountAmount("FIXED", 5000, 15000)).toBe(5000);
  });
  it("free-shipping codes do not reduce the subtotal", () => {
    expect(computeDiscountAmount("FREE_SHIPPING", 0, 15000)).toBe(0);
  });
  it("ignores negative values", () => {
    expect(computeDiscountAmount("FIXED", -500, 15000)).toBe(0);
    expect(computeDiscountAmount("PERCENT", -10, 15000)).toBe(0);
  });
});

describe("pickZone", () => {
  const zones = [
    { id: "cairo", governorates: ["Cairo", "Giza"] },
    { id: "alex", governorates: ["Alexandria"] },
    { id: "rest", governorates: [] as string[] },
  ];
  it("matches a listed governorate", () => expect(pickZone(zones, "Giza")?.id).toBe("cairo"));
  it("falls back to the catch-all zone", () => expect(pickZone(zones, "Aswan")?.id).toBe("rest"));
  it("returns null with no catch-all and no match", () => expect(pickZone(zones.slice(0, 2), "Aswan")).toBeNull());
});
