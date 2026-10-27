/** Central brand defaults. Admin edits (Settings → Brand Identity) are stored in the DB and override these. */
export type Localized = { ar: string; en: string };

/** Brand colors editable in the admin. Each maps to a CSS variable used by every component. */
export const BRAND_COLOR_VARS = {
  navy: "--navy",
  navySoft: "--navy-soft",
  olive: "--olive",
  oliveLight: "--olive-light",
  oliveDeep: "--olive-deep",
  warm: "--warm",
  foreground: "--foreground",
} as const;
export type BrandColorKey = keyof typeof BRAND_COLOR_VARS;

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Builds the :root override. Only strict #RRGGBB values are emitted, so stored settings can never inject CSS. */
export function brandCss(colors: Partial<Record<string, string>> | null | undefined): string {
  if (!colors) return "";
  const rules = (Object.keys(BRAND_COLOR_VARS) as BrandColorKey[])
    .filter((k) => typeof colors[k] === "string" && HEX.test(colors[k] as string))
    .map((k) => `${BRAND_COLOR_VARS[k]}:${colors[k]};`);
  return rules.length ? `:root{${rules.join("")}}` : "";
}

export const DEFAULT_BRAND = {
  nameAr: "آثر",
  nameEn: "ATHAR",
  description: {
    ar: "علامة أزياء عصرية تؤمن بأن التفاصيل الصغيرة تصنع الفرق.",
    en: "A modern fashion label built on the belief that details make the difference.",
  } as Localized,
  logoUrl: null as string | null,
  faviconUrl: null as string | null,
  footerText: { ar: "", en: "" } as Localized,
  colors: {} as Partial<Record<BrandColorKey, string>>,
  social: { instagram: "", facebook: "", tiktok: "" },
  contact: { email: "", phone: "", whatsapp: "" },
  seo: {
    ogImage: null as string | null,
    title: { ar: "آثر | أزياء عصرية", en: "ATHAR | Modern Fashion" } as Localized,
    description: {
      ar: "تسوّق تيشيرتات عصرية بجودة عالية من آثر.",
      en: "Shop premium modern T-shirts from ATHAR.",
    } as Localized,
  },
};

export type Brand = typeof DEFAULT_BRAND;

export const DEFAULT_HERO = {
  headline: { ar: "آثر — تفاصيل تصنع الفرق", en: "ATHAR — Details that make the difference" } as Localized,
  subtitle: {
    ar: "تصاميم عصرية، جودة تستحقها، وتفاصيل تعكس شخصيتك.",
    en: "Modern designs, quality you deserve, and details that reflect your personality.",
  } as Localized,
  ctaText: { ar: "تسوّق المجموعة", en: "Shop the collection" } as Localized,
  ctaHref: "#new-arrivals",
  desktopImage: null as string | null,
  mobileImage: null as string | null,
};

export const DEFAULT_ANNOUNCEMENT = {
  enabled: true,
  messages: [
    { ar: "شحن مجاني للطلبات فوق 1500 جنيه", en: "Free shipping on orders above 1500 EGP" },
  ] as Localized[],
};
