"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("common");
  return (
    <Link
      href={pathname}
      locale={locale === "ar" ? "en" : "ar"}
      className="rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-warm"
    >
      {t("switchLanguage")}
    </Link>
  );
}
