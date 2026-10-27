import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductCard } from "@/components/storefront/ProductCard";
import { Reveal } from "@/components/shared/Reveal";
import { ProductView, type PVImage, type PVVariant } from "@/components/storefront/ProductView";
import { getProductBySlug, getRelated } from "@/features/catalog/queries";
import { MAX_LINE_QTY, SIZE_ORDER, siteUrl } from "@/lib/config/site";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return {};
  const en = locale === "en";
  const title = p.seoTitle ?? (en ? p.nameEn : p.nameAr);
  const description = p.seoDescription ?? (en ? p.shortDescEn : p.shortDescAr) ?? undefined;
  const image = p.images[0]?.url;
  return { title, description, alternates: { canonical: `/${locale}/products/${slug}`, languages: { ar: `/ar/products/${slug}`, en: `/en/products/${slug}` } }, openGraph: { title, description, images: image ? [image] : undefined } };
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const l = locale === "en" ? "en" : "ar";
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  const [t, related] = await Promise.all([getTranslations("product"), getRelated(p.id, p.categoryId)]);

  const name = l === "en" ? p.nameEn : p.nameAr;
  const description = l === "en" ? p.descEn : p.descAr;
  const care = l === "en" ? p.careEn : p.careAr;
  const variants: PVVariant[] = p.variants.map((v) => ({
    id: v.id, colorName: v.colorName, colorNameAr: v.colorNameAr, colorHex: v.colorHex, size: v.size,
    price: v.priceOverride ?? p.basePrice, available: Math.max(0, v.stock - v.reserved),
  }));
  const images: PVImage[] = p.images.map((i) => ({ url: i.url, alt: (l === "en" ? i.altEn : i.altAr) ?? name, colorName: i.colorName }));
  const inStock = variants.some((v) => v.available > 0);
  const avg = p.reviews.length ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length : 0;

  const guide = Array.isArray(p.sizeGuide) && p.sizeGuide.every((r) => r && typeof r === "object" && !Array.isArray(r)) ? (p.sizeGuide as Record<string, string | number>[]) : [];
  const cols = guide[0] ? Object.keys(guide[0]) : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    sku: p.sku,
    brand: { "@type": "Brand", name: p.brand },
    image: images.map((i) => i.url),
    description: (l === "en" ? p.shortDescEn : p.shortDescAr) ?? undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: p.currency,
      price: (p.basePrice / 100).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${siteUrl()}/${locale}/products/${p.slug}`,
    },
    ...(p.reviews.length ? { aggregateRating: { "@type": "AggregateRating", ratingValue: avg.toFixed(1), reviewCount: p.reviews.length } } : {}),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <h1 className="mb-6 text-3xl font-extrabold text-navy">{name}</h1>
      <ProductView locale={l} name={name} basePrice={p.basePrice} compareAt={p.compareAtPrice} variants={variants} images={images} sizeOrder={SIZE_ORDER} maxQty={MAX_LINE_QTY} />

      <Reveal>
      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          {description && (<section><h2 className="mb-2 text-lg font-bold text-navy">{t("description")}</h2><p className="whitespace-pre-line leading-8 text-muted-foreground">{description}</p></section>)}
          {(p.material || p.fit || care) && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              {p.material && (<><dt className="font-semibold">{t("material")}</dt><dd className="text-muted-foreground">{p.material}</dd></>)}
              {p.fit && (<><dt className="font-semibold">{t("fit")}</dt><dd className="text-muted-foreground">{p.fit}</dd></>)}
              {care && (<><dt className="font-semibold">{t("care")}</dt><dd className="text-muted-foreground">{care}</dd></>)}
            </dl>
          )}
          {cols.length > 0 && (
            <details className="rounded-2xl border border-border p-4">
              <summary className="cursor-pointer font-semibold">{t("sizeGuide")}</summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr>{cols.map((c) => <th key={c} className="px-2 py-1 text-start font-semibold">{c}</th>)}</tr></thead>
                  <tbody>{guide.map((row, i) => <tr key={i} className="border-t border-border">{cols.map((c) => <td key={c} className="px-2 py-1">{String(row[c] ?? "")}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </details>
          )}
        </div>
        <div className="space-y-6">
          <section><h2 className="mb-2 text-lg font-bold text-navy">{t("shippingTitle")}</h2><p className="leading-8 text-muted-foreground">{t("shippingInfo")}</p></section>
          <section><h2 className="mb-2 text-lg font-bold text-navy">{t("returnsTitle")}</h2><p className="leading-8 text-muted-foreground">{t("returnsInfo")}</p></section>
          <section>
            <h2 className="mb-2 text-lg font-bold text-navy">{t("reviews")}{p.reviews.length > 0 && <span className="ms-2 text-sm font-normal text-muted-foreground">★ {avg.toFixed(1)} ({p.reviews.length})</span>}</h2>
            {p.reviews.length === 0 ? <p className="text-muted-foreground">{t("noReviews")}</p> : (
              <ul className="space-y-4">{p.reviews.map((r) => (
                <li key={r.id} className="rounded-2xl bg-warm p-4 text-sm"><p className="font-semibold">{r.authorName} · {"★".repeat(r.rating)}</p>{r.body && <p className="mt-1 text-muted-foreground">{r.body}</p>}</li>
              ))}</ul>
            )}
          </section>
        </div>
      </div>

      </Reveal>

      {related.length > 0 && (
        <Reveal as="section" className="mt-16">
          <h2 className="mb-6 text-2xl font-bold text-navy">{t("related")}</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">{related.map((r, i) => <Reveal key={r.id} delay={i * 90}><ProductCard product={r} /></Reveal>)}</div>
        </Reveal>
      )}
    </div>
  );
}
