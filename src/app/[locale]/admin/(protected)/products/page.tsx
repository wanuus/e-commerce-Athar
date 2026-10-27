import type { Prisma } from "@prisma/client";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge, Flash, PageHeader, btnGhost, btnPrimary, card, inputCls, td, th } from "@/components/admin/ui";
import { prisma } from "@/lib/db/prisma";
import { formatMoney } from "@/lib/utils/money";

type SP = { q?: string; status?: string; page?: string; ok?: string; error?: string };
const PER = 25;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [t, locale] = await Promise.all([getTranslations("adm"), getLocale()]);
  const q = (sp.q ?? "").trim().slice(0, 100);
  const status = ["DRAFT", "ACTIVE", "ARCHIVED"].includes(sp.status ?? "") ? (sp.status as "DRAFT" | "ACTIVE" | "ARCHIVED") : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ProductWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ nameAr: { contains: q, mode: "insensitive" } }, { nameEn: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { variants: { select: { stock: true, reserved: true, isActive: true } } } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER));
  const qs = (p: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader title={t("nav.products")}><Link href="/admin/products/new" className={btnPrimary}>{t("products.new")}</Link></PageHeader>
      <Flash ok={sp.ok} error={sp.error} />
      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder={t("common.search")} className={`${inputCls} max-w-xs`} aria-label={t("common.search")} />
        <select name="status" defaultValue={status ?? ""} className={`${inputCls} max-w-[10rem]`} aria-label={t("common.status")}>
          <option value="">{t("common.all")}</option>
          {(["DRAFT", "ACTIVE", "ARCHIVED"] as const).map((s) => <option key={s} value={s}>{t(`productStatus.${s}`)}</option>)}
        </select>
        <button className={btnGhost}>{t("common.filter")}</button>
      </form>
      <div className={`${card} overflow-x-auto p-0`}>
        <table className="w-full">
          <thead><tr><th className={th}>{t("common.name")}</th><th className={th}>SKU</th><th className={th}>{t("common.status")}</th><th className={th}>{t("products.price")}</th><th className={th}>{t("products.available")}</th></tr></thead>
          <tbody>
            {products.length === 0 && <tr><td className={td} colSpan={5}>{t("common.none")}</td></tr>}
            {products.map((p) => {
              const avail = p.variants.filter((v) => v.isActive).reduce((s, v) => s + Math.max(0, v.stock - v.reserved), 0);
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className={td}><Link href={`/admin/products/${p.id}`} className="font-semibold text-primary hover:underline">{locale === "en" ? p.nameEn : p.nameAr}</Link>{p.isFeatured && <span className="ms-2 text-xs text-muted-foreground">★</span>}</td>
                  <td className={td} dir="ltr">{p.sku}</td>
                  <td className={td}><Badge tone={p.status === "ACTIVE" ? "green" : p.status === "DRAFT" ? "amber" : "gray"}>{t(`productStatus.${p.status}`)}</Badge></td>
                  <td className={td}>{formatMoney(p.basePrice, locale)}</td>
                  <td className={td}><Badge tone={avail === 0 ? "red" : avail <= 5 ? "amber" : "green"}>{avail}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={`/admin/products${qs(page - 1)}`} className={btnGhost}>{t("common.prev")}</Link>}
          <span className="text-muted-foreground">{page} / {pages}</span>
          {page < pages && <Link href={`/admin/products${qs(page + 1)}`} className={btnGhost}>{t("common.next")}</Link>}
        </div>
      )}
    </>
  );
}
