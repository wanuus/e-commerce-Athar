import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AutoRefresh } from "@/components/storefront/AutoRefresh";
import { TrackPurchase } from "@/components/storefront/TrackPurchase";
import { retryPayment } from "@/features/orders/actions";
import { prisma } from "@/lib/db/prisma";
import { formatMoney } from "@/lib/utils/money";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = { params: Promise<{ locale: string; token: string }>; searchParams: Promise<{ error?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const l = locale === "en" ? "en" : "ar";
  // The unguessable token in the URL is the access key for guest orders.
  const order = token.length > 10 ? await prisma.order.findUnique({ where: { publicToken: token }, include: { items: true } }) : null;
  if (!order) notFound();
  const t = await getTranslations("order");
  const { error } = await searchParams;
  const m = (n: number) => formatMoney(n, l);
  const addr = order.addressSnapshot as Record<string, string | null>;
  const gov = addr.governorate ?? "";

  const isCard = order.paymentMethod === "CARD";
  const cancelled = order.status === "CANCELLED";
  const paid = order.paymentStatus === "PAID";
  const waiting = isCard && !paid && !cancelled && (order.paymentStatus === "PENDING" || order.paymentStatus === "PROCESSING");
  const failed = isCard && !paid && !cancelled && order.paymentStatus === "FAILED";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {waiting && <AutoRefresh />}
      {(paid || (!isCard && !cancelled)) && (
        <TrackPurchase orderNumber={order.orderNumber} total={order.total} items={order.items.map((i) => ({ sku: i.sku, name: i.nameEn, price: i.unitPrice, quantity: i.quantity }))} />
      )}
      <h1 className="text-3xl font-extrabold text-navy">{t("thanks")}</h1>
      <p className="mt-2 text-muted-foreground">{t("number")}: <strong className="text-foreground" dir="ltr">{order.orderNumber}</strong></p>

      <div className="mt-6 space-y-3" role="status" aria-live="polite">
        {error === "payment" && <p className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">{t("paymentError")}</p>}
        {cancelled && <p className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">{t("cancelledMsg")}</p>}
        {!isCard && !cancelled && <p className="rounded-2xl bg-warm p-4 text-sm">{t("codMsg", { total: m(order.total) })} {t("emailNote")}</p>}
        {isCard && paid && <p className="rounded-2xl bg-success/10 p-4 text-sm text-success">{t("paidMsg")} {t("emailNote")}</p>}
        {waiting && <p className="rounded-2xl bg-warm p-4 text-sm">{t("processing")}</p>}
        {failed && <p className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">{t("failedMsg")}</p>}
      </div>

      {isCard && !paid && !cancelled && (
        <form action={retryPayment} className="mt-4">
          <input type="hidden" name="token" value={order.publicToken} />
          <button className="h-12 rounded-full bg-navy px-8 text-sm font-semibold text-white hover:bg-navy-soft">{t("retry")}</button>
        </form>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold text-navy">{t("items")}</h2>
        <ul className="divide-y divide-border border-y border-border text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4 py-3">
              <span>{l === "en" ? i.nameEn : i.nameAr} · {i.colorName} / {i.size} × {i.quantity}</span>
              <span className="font-medium">{m(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between"><dt>{l === "en" ? "Subtotal" : "المجموع الفرعي"}</dt><dd>{m(order.subtotal)}</dd></div>
          {order.discountTotal > 0 && <div className="flex justify-between text-success"><dt>{order.discountCode}</dt><dd>-{m(order.discountTotal)}</dd></div>}
          <div className="flex justify-between"><dt>{l === "en" ? "Shipping" : "الشحن"}</dt><dd>{m(order.shippingFee)}</dd></div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><dt>{l === "en" ? "Total" : "الإجمالي"}</dt><dd>{m(order.total)}</dd></div>
        </dl>
      </section>

      <section className="mt-8 grid gap-6 text-sm sm:grid-cols-2">
        <div>
          <h2 className="mb-2 text-lg font-bold text-navy">{t("address")}</h2>
          <p className="leading-7 text-muted-foreground">
            {order.firstName} {order.lastName}<br />
            {[addr.street, addr.building, addr.apartment && `${l === "en" ? "Apt" : "شقة"} ${addr.apartment}`, addr.city, gov].filter(Boolean).join("، ")}
          </p>
        </div>
        <div>
          <h2 className="mb-2 text-lg font-bold text-navy">{t("payment")}</h2>
          <p className="leading-7 text-muted-foreground">
            {t("method")}: {t(`methods.${order.paymentMethod}`)}<br />
            {t("paymentStatus")}: {t(`paymentStatuses.${order.paymentStatus}`)}<br />
            {t("status")}: {t(`orderStatuses.${order.status}`)}
          </p>
        </div>
      </section>
    </div>
  );
}
