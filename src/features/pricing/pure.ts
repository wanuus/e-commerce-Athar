import type { DiscountType } from "@prisma/client";

/** All amounts are integers in piasters. */
export function computeDiscountAmount(type: DiscountType, value: number, subtotal: number): number {
  if (type === "PERCENT") return Math.min(subtotal, Math.round((subtotal * Math.min(Math.max(value, 0), 100)) / 100));
  if (type === "FIXED") return Math.min(subtotal, Math.max(value, 0));
  return 0; // FREE_SHIPPING discounts shipping, not the subtotal
}

/** A zone listing the governorate wins; otherwise the zone with an empty list is the catch-all. */
export function pickZone<T extends { governorates: string[] }>(zones: T[], governorate: string): T | null {
  return zones.find((z) => z.governorates.includes(governorate)) ?? zones.find((z) => z.governorates.length === 0) ?? null;
}
