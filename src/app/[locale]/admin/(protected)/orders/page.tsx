import type { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge, PageHeader, btnGhost, card, inputCls, orderTone, td, th } from "@/components/admin/ui";
import { prisma } from "@/lib/db/prisma";
import { formatDateTime } from "@/lib/utils/date";
import { formatMoney } from "@/lib/utils/money";

type SP = { q?: string; status?: string; payment?: string; method?: string; page?: string };
const PER = 20;
const ORDER_STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED"];
const PAY_STATUSES: PaymentStatus[] = ["PENDING", "PROCESSING", "PAID", "FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [t, locale] = await Promise.all([getTranslations("adm"), getLocale()]);
  const q = (sp.q ?? "").trim().slice(0, 100);
  const status = ORDER_STATUSES.find((s) => s === sp.status);
  const payment = PAY_STATUSES.find((s) => s === sp.payment);
  const method: PaymentMethod | undefined = sp.method === "COD" || sp.method === "CARD" ? sp.method : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(payment ? { paymentStatus: payment } : {}),
    ...(method ? { paymentMethod: method } : {}),
    ...(q ? { OR: [{ orderNumber: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { lastName: { contains: q, mode: "insensitive" } }, { firstName: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER));
  const qs = (p: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), ...(payment ? { payment } : {}), ...(method ? { method } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader title={t("nav.orders")} />
      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder={t("orders.searchHint")} className={`${inputCls} max-w-xs`} aria-label={t("common.search")} />
        <select name="status" defaultValue={status ?? ""} className={`${inputCls} max-w-[11rem]`} aria-label={t("orders.status")}>
          <option value="">{t("orders.anyStatus")}</option>{ORDER_STATUSES.map((s) => <option key={s} value={s}>{t(`orderStatus.${s}`)}</option>)}
        </select>
        <select name="payment" defaultValue={payment ?? ""} className={`${inputCls} max-w-[11rem]`} aria-label={t("orders.paymentStatus")}>
          <option value="">{t("orders.anyPayment")}</option>{PAY_STATUSES.map((s) => <option key={s} value={s}>{t(`paymentStatus.${s}`)}</option>)}
        </select>
        <select name="method" defaultValue={method ?? ""} className={`${inputCls} max-w-[10rem]`} aria-label={t("orders.method")}>
          <option value="">{t("orders.anyMethod")}</option><option value="COD">{t("method.COD")}</option><option value="CARD">{t("method.CARD")}</option>
        </select>
        <button className={btnGhost}>{t("common.filter")}</button>
      </form>
      <p className="mb-2 text-sm text-muted-foreground">{t("orders.count", { count: total })}</p>
      <div className={`${card} overflow-x-auto p-0`}>
        <table className="w-full">
          <thead><tr><th className={th}>#</th><th className={th}>{t("common.date")}</th><th className={th}>{t("orders.customer")}</th><th className={th}>{t("orders.total")}</th><th className={th}>{t("orders.method")}</th><th className={th}>{t("orders.paymentStatus")}</th><th className={th}>{t("orders.status")}</th></tr></thead>
          <tbody>
            {orders.length === 0 && <tr><td className={td} colSpan={7}>{t("common.none")}</td></tr>}
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className={td}><Link href={`/admin/orders/${o.id}`} className="font-semibold text-primary hover:underline" dir="ltr">{o.orderNumber}</Link></td>
                <td className={td}>{formatDateTime(o.createdAt, locale)}</td>
                <td className={td}>{o.firstName} {o.lastName}<span className="block text-xs text-muted-foreground" dir="ltr">{o.phone}</span></td>
                <td className={td}>{formatMoney(o.total, locale)}</td>
                <td className={td}>{t(`method.${o.paymentMethod}`)}</td>
                <td className={td}><Badge tone={orderTone(o.paymentStatus)}>{t(`paymentStatus.${o.paymentStatus}`)}</Badge></td>
                <td className={td}><Badge tone={orderTone(o.status)}>{t(`orderStatus.${o.status}`)}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={`/admin/orders${qs(page - 1)}`} className={btnGhost}>{t("common.prev")}</Link>}
          <span className="text-muted-foreground">{page} / {pages}</span>
          {page < pages && <Link href={`/admin/orders${qs(page + 1)}`} className={btnGhost}>{t("common.next")}</Link>}
        </div>
      )}
    </>
  );
}
