import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge, PageHeader, card, orderTone, td, th } from "@/components/admin/ui";
import { LOW_STOCK_THRESHOLD } from "@/features/admin/order-rules";
import { prisma } from "@/lib/db/prisma";
import { formatDateTime } from "@/lib/utils/date";
import { formatMoney } from "@/lib/utils/money";

export default async function DashboardPage() {
  const [t, locale] = await Promise.all([getTranslations("adm"), getLocale()]);
  const day = new Date(Date.now() - 24 * 3600 * 1000);
  const month = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const live = { status: { notIn: ["CANCELLED", "RETURNED"] as ("CANCELLED" | "RETURNED")[] } };

  const [pending, today, sales, codToCollect, activeProducts, lowStock, recent] = await Promise.all([
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { createdAt: { gte: day }, ...live } }),
    prisma.order.aggregate({ _sum: { total: true }, _count: true, where: { createdAt: { gte: month }, ...live } }),
    prisma.order.aggregate({ _sum: { total: true }, _count: true, where: { paymentMethod: "COD", paymentStatus: "PENDING", status: "DELIVERED" } }),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.productVariant.findMany({
      where: { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD }, product: { status: "ACTIVE" } },
      orderBy: { stock: "asc" }, take: 8, include: { product: { select: { id: true, nameAr: true, nameEn: true } } },
    }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  const m = (n: number) => formatMoney(n, locale);
  const stats = [
    { label: t("dashboard.pending"), value: String(pending), href: "/admin/orders?status=PENDING" },
    { label: t("dashboard.today"), value: String(today), href: "/admin/orders" },
    { label: t("dashboard.sales30"), value: m(sales._sum.total ?? 0), sub: t("dashboard.ordersCount", { count: sales._count }) },
    { label: t("dashboard.codToCollect"), value: m(codToCollect._sum.total ?? 0), sub: t("dashboard.ordersCount", { count: codToCollect._count }), href: "/admin/orders?status=DELIVERED&method=COD&payment=PENDING" },
    { label: t("dashboard.activeProducts"), value: String(activeProducts), href: "/admin/products" },
  ];

  return (
    <>
      <PageHeader title={t("nav.dashboard")} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((s, i) => (
          <div key={s.label} style={{ "--delay": `${i * 70}ms` } as React.CSSProperties} className={`${card} animate-fade-up transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md`}>
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-2 text-3xl font-extrabold text-navy">{s.value}</p>
            {s.sub && <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>}
            {s.href && <Link href={s.href} className="mt-2 inline-block text-xs text-primary underline-offset-4 hover:underline">{t("common.view")}</Link>}
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section style={{ "--delay": "300ms" } as React.CSSProperties} className={`${card} animate-fade-up`}>
          <h2 className="mb-3 text-lg font-bold text-navy">{t("dashboard.recentOrders")}</h2>
          {recent.length === 0 ? <p className="text-sm text-muted-foreground">{t("common.none")}</p> : (
            <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className={th}>#</th><th className={th}>{t("orders.status")}</th><th className={th}>{t("orders.total")}</th><th className={th}>{t("common.date")}</th></tr></thead>
              <tbody>{recent.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className={td}><Link href={`/admin/orders/${o.id}`} className="font-semibold text-primary hover:underline" dir="ltr">{o.orderNumber}</Link></td>
                  <td className={td}><Badge tone={orderTone(o.status)}>{t(`orderStatus.${o.status}`)}</Badge></td>
                  <td className={td}>{m(o.total)}</td>
                  <td className={td}>{formatDateTime(o.createdAt, locale)}</td>
                </tr>))}</tbody></table></div>
          )}
        </section>
        <section style={{ "--delay": "380ms" } as React.CSSProperties} className={`${card} animate-fade-up`}>
          <h2 className="mb-3 text-lg font-bold text-navy">{t("dashboard.lowStock")}</h2>
          {lowStock.length === 0 ? <p className="text-sm text-muted-foreground">{t("common.none")}</p> : (
            <ul className="divide-y divide-border text-sm">{lowStock.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/admin/products/${v.product.id}`} className="hover:underline">{locale === "en" ? v.product.nameEn : v.product.nameAr} · {v.colorName} / {v.size}</Link>
                <Badge tone={v.stock === 0 ? "red" : "amber"}>{v.stock}</Badge>
              </li>))}</ul>
          )}
        </section>
      </div>
    </>
  );
}
