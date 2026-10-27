"use server";

import { revalidatePath } from "next/cache";
import { GOVERNORATE_KEYS } from "@/lib/config/egypt";
import { prisma } from "@/lib/db/prisma";
import { audit, back, egpToMinor, requireAdmin } from "./guard";
import { bool, intOrNull, opt, str } from "./form";

export async function saveZone(fd: FormData): Promise<void> {
  const actor = await requireAdmin();
  const id = opt(fd, "id");
  const path = id ? `/admin/shipping?edit=${id}` : "/admin/shipping";
  const nameAr = str(fd, "nameAr");
  const nameEn = str(fd, "nameEn");
  if (!nameAr || !nameEn || nameAr.length > 80 || nameEn.length > 80) return back(path, "error", "invalid:name");
  const fee = egpToMinor(fd.get("fee"));
  const freeThreshold = egpToMinor(fd.get("freeThreshold"));
  const days = intOrNull(fd, "estimatedDays");
  if (fee === null || Number.isNaN(fee)) return back(path, "error", "invalid:fee");
  if (Number.isNaN(freeThreshold)) return back(path, "error", "invalid:freeThreshold");
  if (days === null || Number.isNaN(days) || days < 1 || days > 30) return back(path, "error", "invalid:estimatedDays");
  const governorates = fd.getAll("gov").map(String).filter((g) => GOVERNORATE_KEYS.includes(g));

  const data = { nameAr, nameEn, governorates, fee, freeThreshold, estimatedDays: days, isActive: bool(fd, "isActive") };
  if (id) await prisma.shippingZone.update({ where: { id }, data });
  else await prisma.shippingZone.create({ data });
  await audit(actor, id ? "shipping.update" : "shipping.create", "ShippingZone", id);
  revalidatePath("/", "layout");
  return back("/admin/shipping", "ok", "saved");
}

export async function deleteZone(fd: FormData): Promise<void> {
  const actor = await requireAdmin();
  const id = str(fd, "id");
  if ((await prisma.shippingZone.count()) <= 1) return back("/admin/shipping", "error", "last_zone");
  await prisma.shippingZone.delete({ where: { id } });
  await audit(actor, "shipping.delete", "ShippingZone", id);
  revalidatePath("/", "layout");
  return back("/admin/shipping", "ok", "deleted");
}
