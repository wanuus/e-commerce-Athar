import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/components/storefront/ProductCard";
import { Reveal } from "@/components/shared/Reveal";
import { SORTS, getFilterOptions, listProducts, parseShopParams } from "@/features/catalog/queries";
import { shopQuery } from "@/lib/utils/shop-url";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "en" ? "Shop" : "المتجر", alternates: { canonical: `/${locale}/shop`, languages: { ar: "/ar/shop", en: "/en/shop" } } };
}

export default async function ShopPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale === "en" ? "en" : "ar";
  const p = parseShopParams(await searchParams);
  const [t, { products, total, pages }, opts] = await Promise.all([getTranslations("shop"), listProducts(p, locale), getFilterOptions()]);
  const page = Math.min(p.page, pages);

  const chips: { label: string; href: string }[] = [];
  const chip = (label: string, key: Parameters<typeof shopQuery>[1] extends infer O ? (O extends { drop?: infer D } ? NonNullable<D> : never) : never) =>
    chips.push({ label, href: `/shop${shopQuery(p, { drop: key })}` });
  if (p.q) chip(`"${p.q}"`, { key: "q" });
  if (p.category) {
    const c = opts.categories.find((x) => x.slug === p.category);
    chip(c ? (l === "en" ? c.nameEn : c.nameAr) : p.category, { key: "category" });
  }
  if (p.minPrice !== undefined) chip(`≥ ${p.minPrice}`, { key: "minPrice" });
  if (p.maxPrice !== undefined) chip(`≤ ${p.maxPrice}`, { key: "maxPrice" });
  for (const s of p.sizes) chip(s, { key: "size", value: s });
  for (const c of p.colors) {
    const o = opts.colors.find((x) => x.colorName === c);
    chip(o ? (l === "en" ? o.colorName : o.colorNameAr) : c, { key: "color", value: c });
  }
  if (p.inStock) chip(t("inStockOnly"), { key: "inStock" });

  const field = "h-10 w-full rounded-xl border border-border bg-white px-3 text-sm";
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-extrabold text-navy">{t("title")}</h1>
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside>
          <form method="get" className="space-y-5 rounded-2xl bg-warm p-5">
            <div>
              <label htmlFor="f-q" className="mb-1 block text-sm font-medium">{t("searchPlaceholder")}</label>
              <input id="f-q" name="q" type="search" defaultValue={p.q} className={field} />
            </div>
            <div>
              <label htmlFor="f-cat" className="mb-1 block text-sm font-medium">{t("category")}</label>
              <select id="f-cat" name="category" defaultValue={p.category ?? ""} className={field}>
                <option value="">{t("allCategories")}</option>
                {opts.categories.map((c) => <option key={c.id} value={c.slug}>{l === "en" ? c.nameEn : c.nameAr}</option>)}
              </select>
            </div>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">{t("price")}</legend>
              <div className="flex gap-2">
                <input name="minPrice" type="number" min={0} inputMode="numeric" placeholder={t("min")} defaultValue={p.minPrice} className={field} aria-label={t("min")} />
                <input name="maxPrice" type="number" min={0} inputMode="numeric" placeholder={t("max")} defaultValue={p.maxPrice} className={field} aria-label={t("max")} />
              </div>
            </fieldset>
            {opts.sizes.length > 0 && (
              <fieldset>
                <legend className="mb-2 text-sm font-medium">{t("size")}</legend>
                <div className="flex flex-wrap gap-2">
                  {opts.sizes.map((s) => (
                    <label key={s} className="cursor-pointer">
                      <input type="checkbox" name="size" value={s} defaultChecked={p.sizes.includes(s)} className="peer sr-only" />
                      <span className="inline-flex h-9 min-w-10 items-center justify-center rounded-full border border-border bg-white px-3 text-sm peer-checked:border-navy peer-checked:bg-navy peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-ring">{s}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {opts.colors.length > 0 && (
              <fieldset>
                <legend className="mb-2 text-sm font-medium">{t("color")}</legend>
                <div className="flex flex-wrap gap-2">
                  {opts.colors.map((c) => (
                    <label key={c.colorName} className="cursor-pointer" title={l === "en" ? c.colorName : c.colorNameAr}>
                      <input type="checkbox" name="color" value={c.colorName} defaultChecked={p.colors.includes(c.colorName)} className="peer sr-only" />
                      <span className="block h-8 w-8 rounded-full border border-border ring-offset-2 peer-checked:ring-2 peer-checked:ring-navy peer-focus-visible:ring-2 peer-focus-visible:ring-ring" style={{ backgroundColor: c.colorHex }} />
                      <span className="sr-only">{l === "en" ? c.colorName : c.colorNameAr}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="inStock" value="1" defaultChecked={p.inStock} className="h-4 w-4 accent-[#596c50]" />
              {t("inStockOnly")}
            </label>
            <div>
              <label htmlFor="f-sort" className="mb-1 block text-sm font-medium">{t("sort")}</label>
              <select id="f-sort" name="sort" defaultValue={p.sort} className={field}>
                {SORTS.map((s) => <option key={s} value={s}>{t(`sorts.${s}`)}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className="h-10 flex-1 rounded-full bg-navy text-sm font-semibold text-white hover:bg-navy-soft">{t("apply")}</button>
              <Link href="/shop" className="text-sm text-muted-foreground underline-offset-4 hover:underline">{t("clear")}</Link>
            </div>
          </form>
        </aside>

        <section>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <p className="me-auto text-sm text-muted-foreground" aria-live="polite">{t("results", { count: total })}</p>
            {chips.map((c) => (
              <Link key={c.label + c.href} href={c.href} aria-label={`${t("removeFilter")} ${c.label}`} className="inline-flex items-center gap-1 rounded-full bg-olive-light/30 px-3 py-1 text-xs font-medium text-olive-deep hover:bg-olive-light/50">
                {c.label} <span aria-hidden>×</span>
              </Link>
            ))}
          </div>
          {products.length === 0 ? (
            <p className="rounded-2xl bg-warm p-10 text-center text-muted-foreground">{t("noResults")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 xl:grid-cols-3">
              {products.map((pr, i) => <Reveal key={pr.id} delay={(i % 3) * 80}><ProductCard product={pr} /></Reveal>)}
            </div>
          )}
          {pages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-4 text-sm" aria-label="pagination">
              {page > 1 ? <Link href={`/shop${shopQuery(p, { page: page - 1 })}`} className="rounded-full border border-border px-4 py-2 hover:bg-warm">{t("prev")}</Link> : <span className="px-4 py-2 text-muted-foreground/50">{t("prev")}</span>}
              <span className="text-muted-foreground">{t("page", { page, pages })}</span>
              {page < pages ? <Link href={`/shop${shopQuery(p, { page: page + 1 })}`} className="rounded-full border border-border px-4 py-2 hover:bg-warm">{t("next")}</Link> : <span className="px-4 py-2 text-muted-foreground/50">{t("next")}</span>}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
