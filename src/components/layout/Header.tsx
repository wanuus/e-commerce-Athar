import { ShoppingBag } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/shared/Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { HeaderShell } from "./HeaderShell";
import { CartCount } from "./CartCount";
import { getBrand } from "@/features/settings/service";
import { getCartCount } from "@/features/cart/service";

export async function Header() {
  const [t, brand, locale, count] = await Promise.all([getTranslations("nav"), getBrand(), getLocale(), getCartCount()]);
  const link = "relative transition-colors hover:text-primary after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-300 hover:after:scale-x-100 rtl:after:origin-right";
  return (
    <HeaderShell>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 transition-[height] duration-300 group-data-[scrolled=true]:h-14 sm:px-6">
        <Logo tone="navy" logoUrl={brand.logoUrl} name={brand.nameAr} />
        <form action={`/${locale}/shop`} method="get" role="search" className="hidden flex-1 md:block md:max-w-xs">
          <label htmlFor="hdr-q" className="sr-only">{t("search")}</label>
          <input id="hdr-q" name="q" type="search" placeholder={t("search")} className="h-10 w-full rounded-full border border-border bg-warm px-4 text-sm transition-all duration-300 focus:bg-white focus:shadow-soft" />
        </form>
        <nav className="flex items-center gap-4 text-sm font-medium text-foreground sm:gap-5">
          <Link href="/shop" className={link}>{t("shop")}</Link>
          <Link href="/#story" className={`${link} hidden md:inline`}>{t("story")}</Link>
          <LanguageSwitcher />
          <Link href="/cart" aria-label={t("cart")} className="relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-warm">
            <ShoppingBag className="h-5 w-5" aria-hidden />
            <CartCount count={count} />
          </Link>
        </nav>
      </div>
    </HeaderShell>
  );
}
