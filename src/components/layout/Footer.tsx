import { getLocale, getTranslations } from "next-intl/server";
import { Logo } from "@/components/shared/Logo";
import { getBrand } from "@/features/settings/service";

export async function Footer() {
  const [t, brand, locale] = await Promise.all([getTranslations("footer"), getBrand(), getLocale()]);
  const footerText = brand.footerText[locale === "en" ? "en" : "ar"];
  const socials = Object.entries(brand.social).filter(([, url]) => url);
  return (
    <footer className="mt-24 bg-navy text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Logo tone="white" logoUrl={brand.logoUrl} name={brand.nameAr} />
          {footerText && <p className="max-w-sm text-sm text-white/70">{footerText}</p>}
        </div>
        {socials.length > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-white/70">{t("follow")}</span>
            {socials.map(([name, url]) => (
              <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="capitalize underline-offset-4 hover:underline">
                {name}
              </a>
            ))}
          </div>
        )}
        <p className="text-sm text-white/70">
          © {new Date().getFullYear()} {brand.nameAr} · {t("rights")}
        </p>
      </div>
    </footer>
  );
}
