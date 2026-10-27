import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Badge, Field, Flash, PageHeader, btnDanger, btnGhost, card, td, th } from "@/components/admin/ui";
import { requireAdmin } from "@/features/admin/guard";
import { deleteZone, saveZone } from "@/features/admin/shipping-actions";
import { GOVERNORATES } from "@/lib/config/egypt";
import { prisma } from "@/lib/db/prisma";
import { formatMoney } from "@/lib/utils/money";

export default async function ShippingPage({ searchParams }: { searchParams: Promise<{ edit?: string; ok?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [t, locale] = await Promise.all([getTranslations("adm"), getLocale()]);
  const l = locale === "en" ? "en" : "ar";
  const zones = await prisma.shippingZone.findMany({ orderBy: { fee: "asc" } });
  const editing = zones.find((z) => z.id === sp.edit) ?? null;
  const m = (n: number) => formatMoney(n, locale);
  const hasCatchAll = zones.some((z) => z.isActive && z.governorates.length === 0);

  return (
    <>
      <PageHeader title={t("nav.shipping")} />
      <Flash ok={sp.ok} error={sp.error} />
      {!hasCatchAll && <p role="alert" className="mb-6 rounded-2xl bg-[#f5e9c8] p-4 text-sm text-[#8a6a10]">{t("shipping.noCatchAll")}</p>}
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className={`${card} overflow-x-auto p-0`}>
          <table className="w-full">
            <thead><tr><th className={th}>{t("common.name")}</th><th className={th}>{t("shipping.fee")}</th><th className={th}>{t("shipping.freeOver")}</th><th className={th}>{t("shipping.days")}</th><th className={th} /></tr></thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z.id} className="border-t border-border align-top">
                  <td className={td}><strong>{l === "en" ? z.nameEn : z.nameAr}</strong> {!z.isActive && <Badge>{t("common.inactive")}</Badge>}
                    <span className="mt-1 block text-xs text-muted-foreground">{z.governorates.length === 0 ? t("shipping.catchAll") : z.governorates.map((g) => GOVERNORATES.find((x) => x.key === g)?.[l] ?? g).join("، ")}</span></td>
                  <td className={td}>{m(z.fee)}</td>
                  <td className={td}>{z.freeThreshold ? m(z.freeThreshold) : "—"}</td>
                  <td className={td}>{z.estimatedDays}</td>
                  <td className={td}><div className="flex gap-2"><Link href={`/admin/shipping?edit=${z.id}`} className={btnGhost}>{t("common.edit")}</Link>
                    <form action={deleteZone}><input type="hidden" name="id" value={z.id} /><button className={btnDanger}>{t("common.delete")}</button></form></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form action={saveZone} key={editing?.id ?? "new"} className={`${card} h-fit space-y-4`}>
          <h2 className="text-lg font-bold text-navy">{editing ? t("shipping.edit") : t("shipping.new")}</h2>
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <Field label={t("products.nameAr")} name="nameAr" defaultValue={editing?.nameAr} required dir="rtl" maxLength={80} />
          <Field label={t("products.nameEn")} name="nameEn" defaultValue={editing?.nameEn} required dir="ltr" maxLength={80} />
          <Field label={t("shipping.fee")} name="fee" type="number" step="0.01" min={0} required dir="ltr" defaultValue={editing ? editing.fee / 100 : ""} />
          <Field label={t("shipping.freeOver")} name="freeThreshold" type="number" step="0.01" min={0} dir="ltr" defaultValue={editing?.freeThreshold ? editing.freeThreshold / 100 : ""} hint={t("shipping.freeHint")} />
          <Field label={t("shipping.days")} name="estimatedDays" type="number" min={1} max={30} required dir="ltr" defaultValue={editing?.estimatedDays ?? 3} />
          <fieldset><legend className="mb-1 text-sm font-medium">{t("shipping.governorates")}</legend><p className="mb-2 text-xs text-muted-foreground">{t("shipping.govHint")}</p>
            <div className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border border-border p-3">
              {GOVERNORATES.map((g) => <label key={g.key} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="gov" value={g.key} defaultChecked={editing?.governorates.includes(g.key)} className="h-4 w-4 accent-[#596c50]" />{g[l]}</label>)}
            </div></fieldset>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} className="h-4 w-4 accent-[#596c50]" />{t("common.active")}</label>
          <div className="flex items-center gap-3"><SubmitButton pendingText={t("common.saving")}>{t("common.save")}</SubmitButton>{editing && <Link href="/admin/shipping" className="text-sm text-muted-foreground hover:underline">{t("common.cancel")}</Link>}</div>
        </form>
      </div>
    </>
  );
}
