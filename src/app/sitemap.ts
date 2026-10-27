import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";
import { siteUrl } from "@/lib/config/site";

export const dynamic = "force-dynamic";
const LOCALES = ["ar", "en"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const entry = (path: string, lastModified?: Date, priority = 0.6): MetadataRoute.Sitemap[number] => ({
    url: `${base}/ar${path}`,
    lastModified,
    priority,
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${base}/${l}${path}`])) },
  });
  const products = await prisma.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } });
  const entries = [entry("", undefined, 1), entry("/shop", undefined, 0.8), ...products.map((p) => entry(`/products/${p.slug}`, p.updatedAt, 0.7))];
  // One URL per language, each pointing at its alternates.
  return entries.flatMap((e) => LOCALES.map((l) => ({ ...e, url: e.url.replace("/ar", `/${l}`) })));
}
