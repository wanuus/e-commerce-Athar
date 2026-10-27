import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_ANNOUNCEMENT, DEFAULT_BRAND, DEFAULT_HERO } from "@/lib/config/brand";

/**
 * Site settings are read on every page (title, header, footer, announcement, hero), so they are cached
 * and shared between requests. Saving anything in Admin -> Settings calls revalidateTag("settings"),
 * which makes the change visible immediately. Edits made directly in the database appear within a minute.
 */
export const SETTINGS_TAG = "settings";

const readSetting = unstable_cache(
  async (key: string) => {
    const row = await prisma.siteSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  },
  ["site-setting"],
  { tags: [SETTINGS_TAG], revalidate: 60 },
);

async function getSetting<T extends object>(key: string, fallback: T): Promise<T> {
  const value = await readSetting(key);
  if (typeof value !== "object" || value === null || Array.isArray(value)) return fallback;
  return { ...fallback, ...(value as object) } as T;
}

export const getBrand = () => getSetting("brand", DEFAULT_BRAND);
export const getHero = () => getSetting("home.hero", DEFAULT_HERO);
export const getAnnouncement = () => getSetting("home.announcement", DEFAULT_ANNOUNCEMENT);
