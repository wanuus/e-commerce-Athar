"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export type NotifyState = { status: "idle" | "ok" | "exists" | "invalid" | "error" };

const schema = z.object({ variantId: z.string().min(1).max(40), email: z.string().trim().toLowerCase().email().max(254) });

/** "Notify me when available". One request per email + exact variant (unique in the database). */
export async function requestBackInStock(_prev: NotifyState, formData: FormData): Promise<NotifyState> {
  if (!rateLimit(`notify:${await clientIp()}`, 10, 10 * 60_000)) return { status: "error" };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "invalid" };
  try {
    const variant = await prisma.productVariant.findUnique({ where: { id: parsed.data.variantId }, select: { id: true } });
    if (!variant) return { status: "invalid" };
    const existing = await prisma.stockNotification.findUnique({ where: { email_variantId: { email: parsed.data.email, variantId: variant.id } } });
    if (existing && !existing.notifiedAt) return { status: "exists" };
    await prisma.stockNotification.upsert({
      where: { email_variantId: { email: parsed.data.email, variantId: variant.id } },
      create: { email: parsed.data.email, variantId: variant.id, locale: (await getLocale()) === "en" ? "en" : "ar" },
      update: { notifiedAt: null },
    });
    return { status: "ok" };
  } catch {
    return { status: "error" };
  }
}
