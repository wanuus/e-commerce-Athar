import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader, btnPrimary, card, td, th } from "@/components/admin/ui";
import { requireAdmin } from "@/features/admin/guard";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils/date";

export default async function SubscribersPage() {
  await requireAdmin();
  const [t, locale] = await Promise.all([getTranslations("adm"), getLocale()]);
  const [count, rows] = await Promise.all([
    prisma.newsletterSubscriber.count({ where: { isActive: true } }),
    prisma.newsletterSubscriber.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return (
    <>
      <PageHeader title={t("nav.subscribers")}><a href="/api/admin/subscribers/export" className={btnPrimary}>{t("subscribers.export")}</a></PageHeader>
      <p className="mb-3 text-sm text-muted-foreground">{t("subscribers.count", { count })}</p>
      <div className={`${card} overflow-x-auto p-0`}>
        <table className="w-full"><thead><tr><th className={th}>Email</th><th className={th}>{t("common.date")}</th></tr></thead>
          <tbody>{rows.length === 0 && <tr><td className={td} colSpan={2}>{t("common.none")}</td></tr>}
            {rows.map((r) => <tr key={r.id} className="border-t border-border"><td className={td} dir="ltr">{r.email}</td><td className={td}>{formatDate(r.createdAt, locale)}</td></tr>)}</tbody></table>
      </div>
    </>
  );
}
