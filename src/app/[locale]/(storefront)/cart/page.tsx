import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PromoForm } from "@/components/storefront/PromoForm";
import { removeItem, removePromo, setQuantity } from "@/features/cart/actions";
import { loadCart } from "@/features/cart/service";
import { buildQuote } from "@/features/pricing/service";
import { formatMoney } from "@/lib/utils/money";

export const metadata: Metadata = { robots: { index: false } };

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale === "en" ? "en" : "ar";
  const t = await getTranslations("cart");
  const loaded = await loadCart();

  if (!loaded || loaded.lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-3xl font-extrabold text-navy">{t("title")}</h1>
        <p className="mt-4 text-muted-foreground">{t("empty")}</p>
        <Link href="/shop" className="mt-8 inline-flex h-12 items-center rounded-full bg-navy px-8 text-sm font-semibold text-white hover:bg-navy-soft">{t("continue")}</Link>
      </div>
    );
  }

  const { cart, lines } = loaded;
  const quote = await buildQuote(lines, cart.discountCode);
  const hasIssues = lines.some((x) => x.status !== "ok");
  const m = (v: number) => formatMoney(v, l);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-extrabold text-navy">{t("title")}</h1>
      {hasIssues && <p role="alert" className="mb-6 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">{t("issues")}</p>}
      {cart.discountCode && quote.discountError && <p role="status" className="mb-6 rounded-2xl bg-warm p-4 text-sm">{t("promoDropped")}</p>}

      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y divide-border border-y border-border">
          {lines.map((line) => (
            <li key={line.itemId} className="flex gap-4 py-5">
              <Link href={`/products/${line.slug}`} className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-warm">
                {line.image ? <Image src={line.image} alt="" fill sizes="96px" className="object-cover" /> : <span className="flex h-full items-center justify-center text-3xl font-extrabold text-olive-light/60" aria-hidden>{(l === "en" ? line.nameEn : line.nameAr).charAt(0)}</span>}
              </Link>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link href={`/products/${line.slug}`} className="font-semibold hover:text-primary">{l === "en" ? line.nameEn : line.nameAr}</Link>
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-block h-3.5 w-3.5 rounded-full border border-border" style={{ backgroundColor: line.colorHex }} aria-hidden />
                    {l === "en" ? line.colorName : line.colorNameAr} · {line.size} · {m(line.unitPrice)}
                  </p>
                  {line.status === "low_stock" && <p className="mt-1 text-sm text-destructive">{t("lowStock", { available: line.available })}</p>}
                  {line.status === "unavailable" && <p className="mt-1 text-sm text-destructive">{t("unavailable")}</p>}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <form action={setQuantity} className="inline-flex items-center rounded-full border border-border">
                    <input type="hidden" name="itemId" value={line.itemId} />
                    <button name="quantity" value={line.quantity - 1} aria-label="−" className="h-10 w-10 text-lg">−</button>
                    <span className="w-8 text-center text-sm font-semibold tabular-nums">{line.quantity}</span>
                    <button name="quantity" value={line.quantity + 1} disabled={line.quantity >= line.available} aria-label="+" className="h-10 w-10 text-lg disabled:opacity-40">+</button>
                  </form>
                  <p className="font-semibold">{m(line.lineTotal)}</p>
                  <form action={removeItem}>
                    <input type="hidden" name="itemId" value={line.itemId} />
                    <button className="text-sm text-muted-foreground underline-offset-4 hover:text-destructive hover:underline">{t("remove")}</button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit space-y-5 rounded-2xl bg-warm p-6">
          {quote.discountCode ? (
            <form action={removePromo} className="flex items-center justify-between rounded-full bg-white px-4 py-2 text-sm">
              <span className="text-success">{t("promoApplied", { code: quote.discountCode })}</span>
              <button className="text-muted-foreground underline-offset-4 hover:underline">{t("removePromo")}</button>
            </form>
          ) : <PromoForm />}
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>{t("subtotal")}</dt><dd>{m(quote.subtotal)}</dd></div>
            {quote.discountTotal > 0 && <div className="flex justify-between text-success"><dt>{t("discount")}</dt><dd>-{m(quote.discountTotal)}</dd></div>}
            <div className="flex justify-between text-muted-foreground"><dt>{t("shipping")}</dt><dd className="text-end text-xs">{t("shippingNote")}</dd></div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-bold"><dt>{t("total")}</dt><dd>{m(quote.total)}</dd></div>
          </dl>
          {hasIssues ? (
            <button disabled className="h-12 w-full cursor-not-allowed rounded-full bg-navy/40 text-sm font-semibold text-white">{t("checkout")}</button>
          ) : (
            <Link href="/checkout" className="flex h-12 w-full items-center justify-center rounded-full bg-navy text-sm font-semibold text-white hover:bg-navy-soft">{t("checkout")}</Link>
          )}
          <Link href="/shop" className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline">{t("continue")}</Link>
        </aside>
      </div>
    </div>
  );
}
