import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ProductCardData } from "@/features/catalog/service";
import { discountPercent, formatMoney } from "@/lib/utils/money";

export async function ProductCard({ product }: { product: ProductCardData }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("common")]);
  const name = locale === "en" ? product.nameEn : product.nameAr;
  const img = product.images[0]?.url;
  const inStock = product.variants.some((v) => v.stock - v.reserved > 0);
  const pct = discountPercent(product.basePrice, product.compareAtPrice);
  const swatches = [...new Map(product.variants.map((v) => [v.colorName, v.colorHex])).entries()];

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-warm">
        {img ? (
          <Image src={img} alt={name} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl font-extrabold text-olive-light/60" aria-hidden>
            {name.charAt(0)}
          </div>
        )}
        {!inStock && <span className="absolute start-3 top-3 rounded-full bg-navy px-3 py-1 text-xs text-white">{t("soldOut")}</span>}
        {pct > 0 && inStock && <span className="absolute start-3 top-3 rounded-full bg-primary px-3 py-1 text-xs text-white">-{pct}%</span>}
      </div>
      <div className="mt-3 space-y-1.5">
        <h3 className="text-base font-semibold">{name}</h3>
        <p className="flex items-baseline gap-2 text-sm">
          <span className="font-semibold text-primary">{formatMoney(product.basePrice, locale)}</span>
          {pct > 0 && <span className="text-muted-foreground line-through">{formatMoney(product.compareAtPrice!, locale)}</span>}
        </p>
        <ul className="flex gap-1.5" aria-label="colors">
          {swatches.map(([colorName, hex]) => (
            <li key={colorName} title={colorName} className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: hex }} />
          ))}
        </ul>
      </div>
    </Link>
  );
}
