import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader, btnGhost, card, inputCls, td, th } from "@/components/admin/ui";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils/date";
import { formatMoney } from "@/lib/utils/money";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const [t, locale] = await Promise.all([getTranslations("adm"), getLocale()]);
  const q = (sp.q ?? "").trim().slice(0, 100);
  // Customers are derived from orders (guest checkout has no account), grouped by email.
  const groups = await prisma.order.groupBy({
    by: ["email"],
    where: { status: { notIn: ["CANCELLED"] }, ...(q ? { email: { contains: q, mode: "insensitive" } } : {}) },
    _count: { _all: true },
    _sum: { total: true },
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: "desc" } },
    take: 100,
  });
  const people = await prisma.order.findMany({
    where: { email: { in: groups.map((g) => g.email) } },
    distinct: ["email"],
    orderBy: { createdAt: "desc" },
    select: { email: true, firstName: true, lastName: true, phone: true },
  });
  const byEmail = new Map(people.map((p) => [p.email, p]));

  return (
    <>
      <PageHeader title={t("nav.customers")} />
      <form method="get" className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder={t("common.search")} className={`${inputCls} max-w-xs`} aria-label={t("common.search")} />
        <button className={btnGhost}>{t("common.filter")}</button>
      </form>
      <div className={`${card} overflow-x-auto p-0`}>
        <table className="w-full">
          <thead><tr><th className={th}>{t("common.name")}</th><th className={th}>{t("orders.phone")}</th><th className={th}>{t("customers.orders")}</th><th className={th}>{t("customers.spent")}</th><th className={th}>{t("customers.last")}</th></tr></thead>
          <tbody>
            {groups.length === 0 && <tr><td className={td} colSpan={5}>{t("common.none")}</td></tr>}
            {groups.map((g) => {
              const p = byEmail.get(g.email);
              return (
                <tr key={g.email} className="border-t border-border">
                  <td className={td}><Link href={`/admin/orders?q=${encodeURIComponent(g.email)}`} className="font-medium text-primary hover:underline">{p ? `${p.firstName} ${p.lastName}` : g.email}</Link><span className="block text-xs text-muted-foreground" dir="ltr">{g.email}</span></td>
                  <td className={td} dir="ltr">{p?.phone}</td>
                  <td className={td}>{g._count._all}</td>
                  <td className={td}>{formatMoney(g._sum.total ?? 0, locale)}</td>
                  <td className={td}>{g._max.createdAt ? formatDate(g._max.createdAt, locale) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
