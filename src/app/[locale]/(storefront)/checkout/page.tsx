import type { Metadata } from "next";
import crypto from "node:crypto";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { CheckoutForm } from "@/components/storefront/CheckoutForm";
import { loadCart } from "@/features/cart/service";
import { GOVERNORATES } from "@/lib/config/egypt";
import { getCardProvider } from "@/lib/payments";

export const metadata: Metadata = { robots: { index: false } };

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale === "en" ? "en" : "ar";
  const loaded = await loadCart();
  // Empty or stale carts go back to the cart, where problems are explained.
  if (!loaded || loaded.lines.length === 0 || loaded.lines.some((x) => x.status !== "ok")) redirect({ href: "/cart", locale });
  const t = await getTranslations("checkout");
  const card = getCardProvider();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-extrabold text-navy">{t("title")}</h1>
      <CheckoutForm
        locale={l}
        idempotencyKey={crypto.randomUUID()}
        lines={loaded!.lines.map((x) => ({
          id: x.itemId,
          name: l === "en" ? x.nameEn : x.nameAr,
          color: l === "en" ? x.colorName : x.colorNameAr,
          size: x.size,
          quantity: x.quantity,
          lineTotal: x.lineTotal,
          image: x.image,
        }))}
        governorates={GOVERNORATES.map((g) => ({ key: g.key, label: g[l] }))}
        cardAvailable={card !== null}
        cardIsTest={card?.name === "mock"}
      />
    </div>
  );
}
