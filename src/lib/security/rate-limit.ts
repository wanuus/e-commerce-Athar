import { headers } from "next/headers";

/**
 * Small in-memory limiter against form spam (newsletter, promo codes, orders).
 * LIMITATION: memory is per server instance, so on serverless hosting it slows abuse but is not a hard guarantee.
 * For strict limits use a shared store (e.g. Upstash Redis) behind this same function.
 */
const buckets = new Map<string, { count: number; reset: number }>();

/** Returns true when the request is allowed. */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
