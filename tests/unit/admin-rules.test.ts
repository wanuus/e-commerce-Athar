import { describe, expect, it } from "vitest";
import { fulfillmentFor, nextStatuses } from "@/features/admin/order-rules";
import { BRAND_COLOR_VARS, brandCss } from "@/lib/config/brand";
import { isCloudinaryUrl, signUploadParams } from "@/lib/storage/cloudinary";
import crypto from "node:crypto";

describe("order status rules", () => {
  it("only allows forward steps and cancellation before shipping", () => {
    expect(nextStatuses("PENDING")).toEqual(["CONFIRMED", "CANCELLED"]);
    expect(nextStatuses("PACKED")).toContain("SHIPPED");
    expect(nextStatuses("SHIPPED")).not.toContain("CANCELLED");
    expect(nextStatuses("DELIVERED")).toEqual(["RETURNED"]);
  });
  it("final states have no exits", () => {
    expect(nextStatuses("CANCELLED")).toEqual([]);
    expect(nextStatuses("RETURNED")).toEqual([]);
  });
  it("derives fulfillment from status", () => {
    expect(fulfillmentFor("PENDING")).toBe("UNFULFILLED");
    expect(fulfillmentFor("PACKED")).toBe("PACKING");
    expect(fulfillmentFor("OUT_FOR_DELIVERY")).toBe("SHIPPED");
    expect(fulfillmentFor("DELIVERED")).toBe("DELIVERED");
  });
});

describe("brandCss", () => {
  it("emits only valid #RRGGBB colors for known keys", () => {
    expect(brandCss({ navy: "#112233", olive: "#ABCDEF" })).toBe(":root{--navy:#112233;--olive:#ABCDEF;}");
  });
  it("blocks CSS injection and unknown keys", () => {
    expect(brandCss({ navy: "red;} body{display:none", foo: "#000000", olive: "#12345" })).toBe("");
    expect(brandCss(null)).toBe("");
    expect(Object.keys(BRAND_COLOR_VARS)).toContain("navySoft");
  });
});

describe("cloudinary helpers", () => {
  it("signs sorted params with SHA-1 + secret", () => {
    const expected = crypto.createHash("sha1").update("folder=athar&timestamp=123secret").digest("hex");
    expect(signUploadParams({ timestamp: 123, folder: "athar" }, "secret")).toBe(expected);
  });
  it("accepts only our own Cloudinary account", () => {
    expect(isCloudinaryUrl("https://res.cloudinary.com/mine/image/upload/a.jpg", "mine")).toBe(true);
    expect(isCloudinaryUrl("https://res.cloudinary.com/other/image/upload/a.jpg", "mine")).toBe(false);
    expect(isCloudinaryUrl("http://res.cloudinary.com/mine/a.jpg", "mine")).toBe(false);
    expect(isCloudinaryUrl("https://evil.com/mine/a.jpg", "mine")).toBe(false);
    expect(isCloudinaryUrl("https://res.cloudinary.com/mine/a.jpg", undefined)).toBe(false);
  });
});
