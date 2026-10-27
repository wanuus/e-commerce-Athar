import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader, card, td, th } from "@/components/admin/ui";
import { requireAdmin } from "@/features/admin/guard";
import { prisma } from "@/lib/db/prisma";
import { formatDateTime } from "@/lib/utils/date";

export default async function AuditPage() {
  await requireAdmin();
  const [t, locale] = await Promise.all([getTranslations("adm"), getLocale()]);
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 150 });
  const actors = await prisma.user.findMany({ where: { id: { in: [...new Set(logs.map((l) => l.actorId).filter((x): x is string => !!x))] } }, select: { id: true, email: true } });
  const email = new Map(actors.map((a) => [a.id, a.email]));
  return (
    <>
      <PageHeader title={t("nav.audit")} />
      <div className={`${card} overflow-x-auto p-0`}>
        <table className="w-full">
          <thead><tr><th className={th}>{t("common.date")}</th><th className={th}>{t("audit.who")}</th><th className={th}>{t("audit.action")}</th><th className={th}>{t("audit.target")}</th><th className={th}>{t("audit.details")}</th></tr></thead>
          <tbody>
            {logs.length === 0 && <tr><td className={td} colSpan={5}>{t("common.none")}</td></tr>}
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-border">
                <td className={td}>{formatDateTime(l.createdAt, locale)}</td>
                <td className={td} dir="ltr">{l.actorId ? email.get(l.actorId) ?? "—" : "—"}</td>
                <td className={td} dir="ltr">{l.action}</td>
                <td className={td} dir="ltr">{l.entity}{l.entityId ? ` · ${l.entityId.slice(0, 8)}` : ""}</td>
                <td className={td} dir="ltr"><code className="text-xs">{l.meta ? JSON.stringify(l.meta) : ""}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
