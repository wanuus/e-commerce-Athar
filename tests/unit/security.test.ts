import { describe, expect, it } from "vitest";
import { buildCsp } from "@/lib/security/csp";
import { parseDsn, sanitizePath } from "@/lib/monitoring/sentry";


describe("rateLimit", () => {
  it("allows up to the limit, then blocks, then recovers after the window", async () => {
    const { rateLimit } = await import("@/lib/security/rate-limit");
    const t0 = 1_000_000;
    expect([1, 2, 3].map(() => rateLimit("k1", 3, 1000, t0))).toEqual([true, true, true]);
    expect(rateLimit("k1", 3, 1000, t0 + 10)).toBe(false);
    expect(rateLimit("k2", 3, 1000, t0 + 10)).toBe(true);
    expect(rateLimit("k1", 3, 1000, t0 + 1001)).toBe(true);
  });
});

describe("buildCsp", () => {
  it("is strict by default", () => {
    const c = buildCsp();
    expect(c).toContain("frame-ancestors 'none'");
    expect(c).toContain("object-src 'none'");
    expect(c).not.toContain("upgrade-insecure-requests"); // would break `npm run start` on localhost
    expect(c).not.toContain("googletagmanager");
    expect(c).not.toContain("unsafe-eval");
  });
  it("adds Google Analytics only when configured", () => {
    expect(buildCsp({ gaId: "G-ABCD1234" })).toContain("https://www.googletagmanager.com");
  });
});

describe("sentry helpers", () => {
  it("parses a DSN into an endpoint and key", () => {
    expect(parseDsn("https://abc123@o1.ingest.sentry.io/4501")).toEqual({ endpoint: "https://o1.ingest.sentry.io/api/4501/store/", key: "abc123" });
  });
  it("rejects bad DSNs", () => {
    expect(parseDsn(undefined)).toBeNull();
    expect(parseDsn("not a url")).toBeNull();
    expect(parseDsn("https://key@host/notnumber")).toBeNull();
  });
  it("masks order tokens and drops query strings", () => {
    expect(sanitizePath("/ar/orders/cmabc123secret?x=1")).toBe("/ar/orders/:token");
  });
});
