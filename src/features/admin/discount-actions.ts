"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { isUniqueViolation } from "@/features/orders/service";
import { audit, back, egpToMinor, requireAdmin } from "./guard";
import { bool, intOrNull, opt, str } from "./form";

const schema = z.object({
  code: z.string().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/),
  type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
});

function dateOrNull(v: string, endOfDay = false): Date | null | "bad" {
  if (!v) return null;
  const d = new Date(`${v}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  return Number.isNaN(d.getTime()) ? "bad" : d;
}

export async function saveDiscount(fd: FormData): Promise<void> {
  const actor = await requireAdmin();
  const id = opt(fd, "id");
  const path = id ? `/admin/discounts?edit=${id}` : "/admin/discounts";
  const parsed = schema.safeParse({ code: str(fd, "code"), type: str(fd, "type") });
  if (!parsed.success) return back(path, "error", `invalid:${String(parsed.error.issues[0]?.path[0] ?? "form")}`);

  let value = 0;
  if (parsed.data.type === "PERCENT") {
    value = Number(str(fd, "value"));
    if (!Number.isInteger(value) || value < 1 || value > 100) return back(path, "error", "invalid:value");
  } else if (parsed.data.type === "FIXED") {
    const m = egpToMinor(fd.get("value"));
    if (m === null || Number.isNaN(m) || m < 1) return back(path, "error", "invalid:value");
    value = m;
  }
  const minSubtotal = egpToMinor(fd.get("minSubtotal"));
  const maxUses = intOrNull(fd, "maxUses");
  const startsAt = dateOrNull(str(fd, "startsAt"));
  const endsAt = dateOrNull(str(fd, "endsAt"), true);
  if (Number.isNaN(minSubtotal)) return back(path, "error", "invalid:minSubtotal");
  if (maxUses !== null && (Number.isNaN(maxUses) || maxUses < 1)) return back(path, "error", "invalid:maxUses");
  if (startsAt === "bad" || endsAt === "bad" || (startsAt && endsAt && endsAt < startsAt)) return back(path, "error", "invalid:dates");

  const data = { ...parsed.data, value, minSubtotal, maxUses, startsAt, endsAt, isActive: bool(fd, "isActive") };
  try {
    if (id) await prisma.discount.update({ where: { id }, data });
    else await prisma.discount.create({ data });
  } catch (e) {
    if (isUniqueViolation(e)) return back(path, "error", "duplicate");
    throw e;
  }
  await audit(actor, id ? "discount.update" : "discount.create", "Discount", id, { code: data.code });
  revalidatePath("/", "layout");
  return back("/admin/discounts", "ok", "saved");
}
