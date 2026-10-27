"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export type NewsletterState = { status: "idle" | "ok" | "exists" | "invalid" | "error" };

const schema = z.string().trim().toLowerCase().email().max(254);

export async function subscribeNewsletter(_prev: NewsletterState, formData: FormData): Promise<NewsletterState> {
  if (!rateLimit(`newsletter:${await clientIp()}`, 5, 10 * 60_000)) return { status: "error" };
  const parsed = schema.safeParse(formData.get("email"));
  if (!parsed.success) return { status: "invalid" };
  try {
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email: parsed.data } });
    if (existing?.isActive) return { status: "exists" };
    if (existing) {
      await prisma.newsletterSubscriber.update({ where: { id: existing.id }, data: { isActive: true } });
    } else {
      await prisma.newsletterSubscriber.create({ data: { email: parsed.data } });
    }
    return { status: "ok" };
  } catch {
    return { status: "error" };
  }
}
