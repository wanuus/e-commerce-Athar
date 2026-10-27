import type { Prisma } from "@prisma/client";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Badge, Flash, PageHeader, btnGhost, card, inputCls, td, th } from "@/components/admin/ui";
import { LOW_STOCK_THRESHOLD } from "@/features/admin/order-rules";
import { updateStockOnly } from "@/features/admin/variant-actions";
import { prisma } from "@/lib/db/prisma";

type SP = { q?: string; filter?: string; page?: string; ok?: string; error?: string };
const PER = 30;

export default async function InventoryPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [t, locale] = await Promise.all([getTranslations("adm"), getLocale()]);
  const q = (sp.q ?? "").trim().slice(0, 100);
  const filter = sp.filter === "low" || sp.filter === "out" ? sp.filter : "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ProductVariantWhereInput = {
    isActive: true,
    ...(filter === "out" ? { stock: 0 } : filter === "low" ? { stock: { lte: LOW_STOCK_THRESHOLD } } : {}),
    ...(q ? { OR: [{ sku: { contains: q, mode: "insensitive" } }, { product: { nameAr: { contains: q, mode: "insensitive" } } }, { product: { nameEn: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  const [total, variants] = await Promise.all([
    prisma.productVariant.count({ where }),
    prisma.productVariant.findMany({ where, orderBy: [{ stock: "asc" }, { sku: "asc" }], skip: (page - 1) * PER, take: PER, include: { product: { select: { id: true, nameAr: true, nameEn: true } } } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER));
  const base = (p: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), ...(filter !== "all" ? { filter } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;
  const returnTo = `/admin/inventory${base(page) === "?" ? "" : base(page)}`;

  return (
    <>
      <PageHeader title={t("nav.inventory")} />
      <Flash ok={sp.ok} error={sp.error} />
      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder={t("common.search")} className={`${inputCls} max-w-xs`} aria-label={t("common.search")} />
        <select name="filter" defaultValue={filter} className={`${inputCls} max-w-[12rem]`} aria-label={t("common.filter")}>
          <option value="all">{t("common.all")}</option><option value="low">{t("inventory.low")}</option><option value="out">{t("inventory.out")}</option>
        </select>
        <button className={btnGhost}>{t("common.filter")}</button>
      </form>
      <p className="mb-3 text-sm text-muted-foreground">{t("inventory.hint")}</p>
      <div className={`${card} overflow-x-auto p-0`}>
        <table className="w-full">
          <thead><tr><th className={th}>{t("products.variant")}</th><th className={th}>SKU</th><th className={th}>{t("inventory.reservedCol")}</th><th className={th}>{t("products.available")}</th><th className={th}>{t("products.stock")}</th></tr></thead>
          <tbody>
            {variants.length === 0 && <tr><td className={td} colSpan={5}>{t("common.none")}</td></tr>}
            {variants.map((v) => {
              const avail = Math.max(0, v.stock - v.reserved);
              return (
                <tr key={v.id} className="border-t border-border">
                  <td className={td}><Link href={`/admin/products/${v.product.id}`} className="font-medium text-primary hover:underline">{locale === "en" ? v.product.nameEn : v.product.nameAr}</Link><span className="block text-xs text-muted-foreground">{locale === "en" ? v.colorName : v.colorNameAr} / {v.size}</span></td>
                  <td className={td} dir="ltr">{v.sku}</td>
                  <td className={td}>{v.reserved}</td>
                  <td className={td}><Badge tone={avail === 0 ? "red" : avail <= LOW_STOCK_THRESHOLD ? "amber" : "green"}>{avail}</Badge></td>
                  <td className={td}>
                    <form action={updateStockOnly} className="flex items-center gap-2">
                      <input type="hidden" name="variantId" value={v.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <input name="stock" type="number" min={0} defaultValue={v.stock} className={`${inputCls} w-24`} dir="ltr" aria-label={t("products.stock")} />
                      <SubmitButton className="h-9 px-4">{t("common.save")}</SubmitButton>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={`/admin/inventory${base(page - 1)}`} className={btnGhost}>{t("common.prev")}</Link>}
          <span className="text-muted-foreground">{page} / {pages}</span>
          {page < pages && <Link href={`/admin/inventory${base(page + 1)}`} className={btnGhost}>{t("common.next")}</Link>}
        </div>
      )}
    </>
  );
}
