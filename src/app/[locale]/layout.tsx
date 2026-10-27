import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import "@fontsource-variable/cairo";
import "@fontsource-variable/inter";
// @ts-expect-error Next.js handles global CSS imports at runtime.
import "../globals.css";
import { routing } from "@/i18n/routing";
import { brandCss } from "@/lib/config/brand";
import { getBrand } from "@/features/settings/service";

export const dynamic = "force-dynamic";

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const brand = await getBrand();
  const l = locale === "en" ? "en" : "ar";
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: brand.seo.title[l], template: `%s | ${brand.nameAr}` },
    description: brand.seo.description[l],
    icons: { icon: brand.faviconUrl ?? "/icon.svg" },
    openGraph: { siteName: brand.nameAr, images: brand.seo.ogImage ? [brand.seo.ogImage] : undefined },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as never)) notFound();
  setRequestLocale(locale);
  const [messages, brand] = await Promise.all([getMessages(), getBrand()]);
  const css = brandCss(brand.colors);

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body>
        {/* Brand color overrides from Admin -> Settings. Never put a manual <head> here: it makes Next drop the stylesheet. */}
        {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
