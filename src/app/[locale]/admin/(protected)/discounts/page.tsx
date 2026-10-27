import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Badge, Field, Flash, PageHeader, btnGhost, card, inputCls, td, th } from "@/components/admin/ui";
import { requireAdmin } from "@/features/admin/guard";
import { saveDiscount } from "@/features/admin/discount-actions";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils/date";
import { formatMoney } from "@/lib/utils/money";

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function DiscountsPage({ searchParams }: { searchParams: Promise<{ edit?: string; ok?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [t, locale] = await Promise.all([getTranslations("adm"), getLocale()]);
  const discounts = await prisma.discount.findMany({ orderBy: { createdAt: "desc" } });
  const editing = discounts.find((d) => d.id === sp.edit) ?? null;
  const m = (n: number) => formatMoney(n, locale);

  return (
    <>
      <PageHeader title={t("nav.discounts")} />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className={`${card} overflow-x-auto p-0`}>
          <table className="w-full">
            <thead><tr><th className={th}>{t("discounts.code")}</th><th className={th}>{t("discounts.value")}</th><th className={th}>{t("discounts.used")}</th><th className={th}>{t("discounts.valid")}</th><th className={th}>{t("common.status")}</th><th className={th} /></tr></thead>
            <tbody>
              {discounts.length === 0 && <tr><td className={td} colSpan={6}>{t("common.none")}</td></tr>}
              {discounts.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className={td} dir="ltr"><strong>{d.code}</strong></td>
                  <td className={td}>{d.type === "PERCENT" ? `${d.value}%` : d.type === "FIXED" ? m(d.value) : t("discounts.type.FREE_SHIPPING")}{d.minSubtotal ? <span className="block text-xs text-muted-foreground">{t("discounts.minimum")} {m(d.minSubtotal)}</span> : null}</td>
                  <td className={td}>{d.usedCount}{d.maxUses ? ` / ${d.maxUses}` : ""}</td>
                  <td className={td}>{d.startsAt ? formatDate(d.startsAt, locale) : "—"} → {d.endsAt ? formatDate(d.endsAt, locale) : "—"}</td>
                  <td className={td}><Badge tone={d.isActive ? "green" : "gray"}>{d.isActive ? t("common.active") : t("common.inactive")}</Badge></td>
                  <td className={td}><Link href={`/admin/discounts?edit=${d.id}`} className={btnGhost}>{t("common.edit")}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form action={saveDiscount} key={editing?.id ?? "new"} className={`${card} h-fit space-y-4`}>
          <h2 className="text-lg font-bold text-navy">{editing ? t("discounts.edit") : t("discounts.new")}</h2>
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <Field label={t("discounts.code")} name="code" defaultValue={editing?.code} required dir="ltr" maxLength={30} hint={t("discounts.codeHint")} />
          <div>
            <label htmlFor="d-type" className="mb-1 block text-sm font-medium">{t("discounts.typeLabel")}</label>
            <select id="d-type" name="type" defaultValue={editing?.type ?? "PERCENT"} className={inputCls}>
              {(["PERCENT", "FIXED", "FREE_SHIPPING"] as const).map((x) => <option key={x} value={x}>{t(`discounts.type.${x}`)}</option>)}
            </select>
          </div>
          <Field label={t("discounts.valueLabel")} name="value" type="number" step="0.01" min={0} dir="ltr" defaultValue={editing ? (editing.type === "FIXED" ? editing.value / 100 : editing.value) : ""} hint={t("discounts.valueHint")} />
          <Field label={t("discounts.minSubtotal")} name="minSubtotal" type="number" step="0.01" min={0} dir="ltr" defaultValue={editing?.minSubtotal ? editing.minSubtotal / 100 : ""} />
          <Field label={t("discounts.maxUses")} name="maxUses" type="number" min={1} dir="ltr" defaultValue={editing?.maxUses} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("discounts.startsAt")} name="startsAt" type="date" dir="ltr" defaultValue={iso(editing?.startsAt ?? null)} />
            <Field label={t("discounts.endsAt")} name="endsAt" type="date" dir="ltr" defaultValue={iso(editing?.endsAt ?? null)} />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} className="h-4 w-4 accent-[#596c50]" />{t("common.active")}</label>
          <div className="flex items-center gap-3"><SubmitButton pendingText={t("common.saving")}>{t("common.save")}</SubmitButton>{editing && <Link href="/admin/discounts" className="text-sm text-muted-foreground hover:underline">{t("common.cancel")}</Link>}</div>
        </form>
      </div>
    </>
  );
}
