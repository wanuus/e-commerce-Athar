import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductCard } from "@/components/storefront/ProductCard";
import { NewsletterForm } from "@/components/storefront/NewsletterForm";
import { Parallax } from "@/components/storefront/Parallax";
import { Reveal } from "@/components/shared/Reveal";
import { getBestSellers, getCategories, getNewArrivals } from "@/features/catalog/service";
import { getHero } from "@/features/settings/service";

type Props = { params: Promise<{ locale: string }> };
const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: { canonical: `/${locale}`, languages: { ar: "/ar", en: "/en" } } };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale === "en" ? "en" : "ar";
  const [t, hero, newArrivals, bestSellers, categories] = await Promise.all([
    getTranslations("home"),
    getHero(),
    getNewArrivals(8),
    getBestSellers(4),
    getCategories(),
  ]);
  const hasImg = !!(hero.desktopImage || hero.mobileImage);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-warm">
        {hasImg && (
          <>
            <Parallax className="absolute inset-0 -z-10">
              {hero.desktopImage && <Image src={hero.desktopImage} alt="" fill priority sizes="100vw" className={`object-cover ${hero.mobileImage ? "hidden md:block" : ""}`} />}
              {hero.mobileImage && <Image src={hero.mobileImage} alt="" fill priority sizes="100vw" className="object-cover md:hidden" />}
            </Parallax>
            <div className="absolute inset-0 -z-10 bg-navy/45" />
          </>
        )}
        <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-20 text-center sm:px-6 md:py-32">
          <h1 style={delay(0)} className={`animate-fade-up max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl md:text-6xl ${hasImg ? "text-white" : "text-navy"}`}>{hero.headline[l]}</h1>
          <p style={delay(140)} className={`animate-fade-up mt-5 max-w-xl text-lg ${hasImg ? "text-white/85" : "text-muted-foreground"}`}>{hero.subtitle[l]}</p>
          <a style={delay(280)} href={hero.ctaHref} className={`animate-fade-up mt-8 inline-flex h-12 items-center rounded-full px-8 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft ${hasImg ? "bg-white text-navy hover:bg-warm" : "bg-navy text-white hover:bg-navy-soft"}`}>
            {hero.ctaText[l]}
          </a>
        </div>
      </section>

      <section id="new-arrivals" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-16 sm:px-6">
        <Reveal><h2 className="mb-8 text-2xl font-bold text-navy">{t("newArrivals")}</h2></Reveal>
        {newArrivals.length === 0 ? (
          <p className="text-muted-foreground">{t("emptyProducts")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {newArrivals.map((p, i) => <Reveal key={p.id} delay={(i % 4) * 90}><ProductCard product={p} /></Reveal>)}
          </div>
        )}
      </section>

      {bestSellers.length > 0 && (
        <section id="best-sellers" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-16 sm:px-6">
          <Reveal><h2 className="mb-8 text-2xl font-bold text-navy">{t("bestSellers")}</h2></Reveal>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {bestSellers.map((p, i) => <Reveal key={p.id} delay={(i % 4) * 90}><ProductCard product={p} /></Reveal>)}
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
          <Reveal><h2 className="mb-8 text-2xl font-bold text-navy">{t("shopByCategory")}</h2></Reveal>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c, i) => (
              <li key={c.id}>
                <Reveal delay={i * 90}>
                  <div className="rounded-2xl bg-olive-light/25 px-6 py-10 text-center text-lg font-semibold text-olive-deep transition-all duration-300 hover:-translate-y-1 hover:bg-olive-light/40 hover:shadow-soft">
                    {l === "en" ? c.nameEn : c.nameAr}
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="story" className="mx-auto mt-16 max-w-3xl scroll-mt-20 px-4 text-center sm:px-6">
        <Reveal>
          <h2 className="text-2xl font-bold text-navy">{t("storyTitle")}</h2>
          <p className="mt-4 leading-8 text-muted-foreground">{t("storyBody")}</p>
        </Reveal>
      </section>

      <Reveal as="section" className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <div className="rounded-2xl bg-warm px-6 py-14 text-center">
          <h2 className="text-2xl font-bold text-navy">{t("newsletterTitle")}</h2>
          <p className="mb-6 mt-2 text-muted-foreground">{t("newsletterBody")}</p>
          <NewsletterForm />
        </div>
      </Reveal>
    </>
  );
}
