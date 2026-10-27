import type { DiscountType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { computeDiscountAmount, pickZone } from "./pure";

export { computeDiscountAmount, pickZone };

export type Zone = {
  id: string;
  nameAr: string;
  nameEn: string;
  governorates: string[];
  fee: number;
  freeThreshold: number | null;
  estimatedDays: number;
};

export type DiscountReason = "not_found" | "inactive" | "expired" | "min_subtotal" | "used_up";
export type DiscountCheck =
  | { ok: true; code: string; amount: number; freeShipping: boolean }
  | { ok: false; reason: DiscountReason };

export async function evaluateDiscount(rawCode: string, subtotal: number, now = new Date()): Promise<DiscountCheck> {
  const code = rawCode.trim().toUpperCase();
  const d = code ? await prisma.discount.findUnique({ where: { code } }) : null;
  if (!d) return { ok: false, reason: "not_found" };
  if (!d.isActive) return { ok: false, reason: "inactive" };
  if ((d.startsAt && d.startsAt > now) || (d.endsAt && d.endsAt < now)) return { ok: false, reason: "expired" };
  if (d.maxUses !== null && d.usedCount >= d.maxUses) return { ok: false, reason: "used_up" };
  if (d.minSubtotal !== null && subtotal < d.minSubtotal) return { ok: false, reason: "min_subtotal" };
  return { ok: true, code: d.code, amount: computeDiscountAmount(d.type, d.value, subtotal), freeShipping: d.type === "FREE_SHIPPING" };
}

export type Quote = {
  subtotal: number;
  discountTotal: number;
  discountCode: string | null;
  discountError: DiscountReason | null;
  shippingFee: number | null; // null until a governorate is known
  freeShipping: boolean;
  zone: Zone | null;
  total: number;
};

/** The single source of truth for what a customer pays. Never trust totals sent by the browser. */
export async function buildQuote(lines: { lineTotal: number }[], discountCode: string | null, governorate?: string): Promise<Quote> {
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  let discountTotal = 0;
  let appliedCode: string | null = null;
  let discountError: DiscountReason | null = null;
  let freeByCode = false;
  if (discountCode) {
    const check = await evaluateDiscount(discountCode, subtotal);
    if (check.ok) {
      discountTotal = check.amount;
      appliedCode = check.code;
      freeByCode = check.freeShipping;
    } else {
      discountError = check.reason;
    }
  }

  let zone: Zone | null = null;
  let shippingFee: number | null = null;
  let freeShipping = false;
  if (governorate) {
    const zones = await prisma.shippingZone.findMany({ where: { isActive: true } });
    zone = pickZone(zones, governorate);
    if (zone) {
      // Free-shipping threshold is checked against the pre-discount subtotal.
      freeShipping = freeByCode || (zone.freeThreshold !== null && subtotal >= zone.freeThreshold);
      shippingFee = freeShipping ? 0 : zone.fee;
    }
  }

  return { subtotal, discountTotal, discountCode: appliedCode, discountError, shippingFee, freeShipping, zone, total: subtotal - discountTotal + (shippingFee ?? 0) };
}
