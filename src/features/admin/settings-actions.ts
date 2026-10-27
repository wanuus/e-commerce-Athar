"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { BRAND_COLOR_VARS, type BrandColorKey } from "@/lib/config/brand";
import { isCloudinaryUrl } from "@/lib/storage/cloudinary";
import { SETTINGS_TAG, getAnnouncement, getBrand, getHero } from "@/features/settings/service";
import { audit, back, requireAdmin } from "./guard";
import { HEX, bool, str } from "./form";

const PATH = "/admin/settings";
const cloud = () => process.env.CLOUDINARY_CLOUD_NAME;
/** Blank => null. Otherwise it must be an image in OUR Cloudinary account. */
const imageField = (fd: FormData, k: string): string | null | "bad" => {
  const v = str(fd, k);
  if (!v) return null;
  return isCloudinaryUrl(v, cloud()) ? v : "bad";
};
const httpsOrEmpty = z.string().max(300).refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v));

async function put(key: string, value: object) {
  await prisma.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  revalidateTag(SETTINGS_TAG);
}

export async function saveBrand(fd: FormData): Promise<void> {
  const actor = await requireAdmin();
  const current = await getBrand();

  const logoUrl = imageField(fd, "logoUrl");
  const faviconUrl = imageField(fd, "faviconUrl");
  const ogImage = imageField(fd, "ogImage");
  if (logoUrl === "bad" || faviconUrl === "bad" || ogImage === "bad") return back(PATH, "error", "invalid:image");

  const colors: Partial<Record<BrandColorKey, string>> = {};
  for (const k of bool(fd, "resetColors") ? [] : (Object.keys(BRAND_COLOR_VARS) as BrandColorKey[])) {
    const v = str(fd, `color_${k}`);
    if (v) {
      if (!HEX.test(v)) return back(PATH, "error", `invalid:color_${k}`);
      colors[k] = v;
    }
  }
  const social = { instagram: str(fd, "instagram"), facebook: str(fd, "facebook"), tiktok: str(fd, "tiktok") };
  for (const [k, v] of Object.entries(social)) if (!httpsOrEmpty.safeParse(v).success) return back(PATH, "error", `invalid:${k}`);
  const email = str(fd, "email");
  if (email && !z.string().email().max(254).safeParse(email).success) return back(PATH, "error", "invalid:email");
  const nameAr = str(fd, "nameAr");
  const nameEn = str(fd, "nameEn");
  if (!nameAr || !nameEn || nameAr.length > 60 || nameEn.length > 60) return back(PATH, "error", "invalid:name");

  await put("brand", {
    ...current,
    nameAr, nameEn, logoUrl, faviconUrl, colors, social,
    description: { ar: str(fd, "descAr").slice(0, 300), en: str(fd, "descEn").slice(0, 300) },
    footerText: { ar: str(fd, "footerAr").slice(0, 200), en: str(fd, "footerEn").slice(0, 200) },
    contact: { email, phone: str(fd, "phone").slice(0, 30), whatsapp: str(fd, "whatsapp").replace(/[^\d+]/g, "").slice(0, 20) },
    seo: {
      ogImage,
      title: { ar: str(fd, "seoTitleAr").slice(0, 70), en: str(fd, "seoTitleEn").slice(0, 70) },
      description: { ar: str(fd, "seoDescAr").slice(0, 200), en: str(fd, "seoDescEn").slice(0, 200) },
    },
  });
  await audit(actor, "settings.brand", "SiteSetting", "brand");
  revalidatePath("/", "layout");
  return back(PATH, "ok", "saved");
}

export async function saveHero(fd: FormData): Promise<void> {
  const actor = await requireAdmin();
  const current = await getHero();
  const desktopImage = imageField(fd, "desktopImage");
  const mobileImage = imageField(fd, "mobileImage");
  if (desktopImage === "bad" || mobileImage === "bad") return back(PATH, "error", "invalid:image");
  const ctaHref = str(fd, "ctaHref") || "#new-arrivals";
  if (!/^(\/|#|https:\/\/)[^\s]*$/.test(ctaHref) || ctaHref.length > 300) return back(PATH, "error", "invalid:ctaHref");
  const headlineAr = str(fd, "headlineAr");
  const headlineEn = str(fd, "headlineEn");
  if (!headlineAr || !headlineEn) return back(PATH, "error", "invalid:headline");

  await put("home.hero", {
    ...current,
    headline: { ar: headlineAr.slice(0, 120), en: headlineEn.slice(0, 120) },
    subtitle: { ar: str(fd, "subtitleAr").slice(0, 240), en: str(fd, "subtitleEn").slice(0, 240) },
    ctaText: { ar: str(fd, "ctaAr").slice(0, 40), en: str(fd, "ctaEn").slice(0, 40) },
    ctaHref, desktopImage, mobileImage,
  });
  await audit(actor, "settings.hero", "SiteSetting", "home.hero");
  revalidatePath("/", "layout");
  return back(PATH, "ok", "saved");
}

export async function saveAnnouncement(fd: FormData): Promise<void> {
  const actor = await requireAdmin();
  await getAnnouncement();
  const messages = [1, 2, 3]
    .map((i) => ({ ar: str(fd, `msgAr${i}`).slice(0, 140), en: str(fd, `msgEn${i}`).slice(0, 140) }))
    .filter((m) => m.ar && m.en);
  await put("home.announcement", { enabled: bool(fd, "enabled"), messages });
  await audit(actor, "settings.announcement", "SiteSetting", "home.announcement");
  revalidatePath("/", "layout");
  return back(PATH, "ok", "saved");
}
