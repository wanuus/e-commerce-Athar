import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { mockPaymentResult } from "@/features/orders/mock-actions";
import { prisma } from "@/lib/db/prisma";
import { getCardProvider } from "@/lib/payments";
import { formatMoney } from "@/lib/utils/money";

export const metadata = { robots: { index: false, follow: false } };

/** DEVELOPMENT ONLY test gateway page. Returns 404 in production or whenever a real gateway is configured. */
export default async function MockPayPage({ params }: { params: Promise<{ locale: string; paymentId: string }> }) {
  const { locale, paymentId } = await params;
  setRequestLocale(locale);
  if (process.env.NODE_ENV === "production" || getCardProvider()?.name !== "mock") notFound();
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!payment) notFound();
  if (payment.status === "PAID") redirect({ href: `/orders/${payment.order.publicToken}`, locale });
  const t = await getTranslations("mock");

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <div className="rounded-2xl border-2 border-dashed border-destructive p-8 text-center">
        <h1 className="text-xl font-extrabold text-destructive">{t("title")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("warning")}</p>
        <p className="mt-6 text-sm">{t("amount")}: <strong>{formatMoney(payment.amount, locale)}</strong> · <span dir="ltr">{payment.order.orderNumber}</span></p>
        <form action={mockPaymentResult} className="mt-6 flex flex-col gap-3">
          <input type="hidden" name="paymentId" value={payment.id} />
          <button name="result" value="success" className="h-12 rounded-full bg-primary text-sm font-semibold text-white">{t("success")}</button>
          <button name="result" value="fail" className="h-12 rounded-full border border-destructive text-sm font-semibold text-destructive">{t("fail")}</button>
        </form>
      </div>
    </div>
  );
}
