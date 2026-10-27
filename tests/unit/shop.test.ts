import { describe, expect, it } from "vitest";
import { parseShopParams } from "@/features/catalog/params";
import { shopQuery } from "@/lib/utils/shop-url";

describe("parseShopParams", () => {
  it("applies safe defaults", () => {
    const p = parseShopParams({});
    expect(p).toMatchObject({ sort: "featured", page: 1, inStock: false, sizes: [], colors: [] });
  });
  it("parses filters and ignores junk", () => {
    const p = parseShopParams({ q: " tee ", size: ["M", "L"], color: "Olive", minPrice: "100", maxPrice: "abc", sort: "hacked", page: "-3", inStock: "1" });
    expect(p).toMatchObject({ q: "tee", sizes: ["M", "L"], colors: ["Olive"], minPrice: 100, maxPrice: undefined, sort: "featured", page: 1, inStock: true });
  });
});

describe("shopQuery", () => {
  const p = parseShopParams({ q: "tee", size: ["M", "L"], sort: "newest" });
  it("round-trips filters into the URL", () => expect(shopQuery(p)).toBe("?q=tee&size=M&size=L&sort=newest"));
  it("drops a single value", () => expect(shopQuery(p, { drop: { key: "size", value: "M" } })).toBe("?q=tee&size=L&sort=newest"));
  it("adds page only after page 1", () => {
    expect(shopQuery(p, { page: 1 })).not.toContain("page");
    expect(shopQuery(p, { page: 3 })).toContain("page=3");
  });
});
