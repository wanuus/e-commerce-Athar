import type { Category, Product } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { saveProduct } from "@/features/admin/product-actions";
import { Field, TextArea, areaCls, card, inputCls } from "./ui";
import { SubmitButton } from "./SubmitButton";

const egp = (minor: number | null | undefined) => (minor === null || minor === undefined ? "" : String(minor / 100));

export async function ProductForm({ product, categories, locale }: { product: Product | null; categories: Category[]; locale: string }) {
  const t = await getTranslations("adm");
  const p = product;
  return (
    <form action={saveProduct} className={`${card} space-y-5`}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("products.nameAr")} name="nameAr" defaultValue={p?.nameAr} required dir="rtl" maxLength={160} />
        <Field label={t("products.nameEn")} name="nameEn" defaultValue={p?.nameEn} required dir="ltr" maxLength={160} />
        <Field label={t("products.slug")} name="slug" defaultValue={p?.slug} required dir="ltr" hint={t("products.slugHint")} maxLength={100} />
        <Field label="SKU" name="sku" defaultValue={p?.sku} required dir="ltr" maxLength={60} />
        <div>
          <label htmlFor="f-categoryId" className="mb-1 block text-sm font-medium">{t("products.category")}</label>
          <select id="f-categoryId" name="categoryId" defaultValue={p?.categoryId ?? categories[0]?.id} className={inputCls} required>
            {categories.map((c) => <option key={c.id} value={c.id}>{locale === "en" ? c.nameEn : c.nameAr}</option>)}
          </select>
        </div>
        {p && (
          <div>
            <label htmlFor="f-status" className="mb-1 block text-sm font-medium">{t("common.status")}</label>
            <select id="f-status" name="status" defaultValue={p.status} className={inputCls}>
              {(["DRAFT", "ACTIVE", "ARCHIVED"] as const).map((s) => <option key={s} value={s}>{t(`productStatus.${s}`)}</option>)}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">{t("products.statusHint")}</p>
          </div>
        )}
        <Field label={t("products.price")} name="basePrice" defaultValue={egp(p?.basePrice)} required type="number" step="0.01" min={0} dir="ltr" />
        <Field label={t("products.compareAt")} name="compareAtPrice" defaultValue={egp(p?.compareAtPrice)} type="number" step="0.01" min={0} dir="ltr" hint={t("products.compareAtHint")} />
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isFeatured" defaultChecked={p?.isFeatured} className="h-4 w-4 accent-[#596c50]" />{t("products.featured")}</label>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextArea label={t("products.shortAr")} name="shortDescAr" defaultValue={p?.shortDescAr} rows={2} dir="rtl" />
        <TextArea label={t("products.shortEn")} name="shortDescEn" defaultValue={p?.shortDescEn} rows={2} dir="ltr" />
        <TextArea label={t("products.descAr")} name="descAr" defaultValue={p?.descAr} rows={5} dir="rtl" />
        <TextArea label={t("products.descEn")} name="descEn" defaultValue={p?.descEn} rows={5} dir="ltr" />
        <Field label={t("products.material")} name="material" defaultValue={p?.material} />
        <Field label={t("products.fit")} name="fit" defaultValue={p?.fit} />
        <TextArea label={t("products.careAr")} name="careAr" defaultValue={p?.careAr} rows={2} dir="rtl" />
        <TextArea label={t("products.careEn")} name="careEn" defaultValue={p?.careEn} rows={2} dir="ltr" />
        <Field label={t("products.tags")} name="tags" defaultValue={p?.tags.join(", ")} hint={t("products.tagsHint")} className="sm:col-span-2" />
        <Field label={t("products.seoTitle")} name="seoTitle" defaultValue={p?.seoTitle} maxLength={70} />
        <div>
          <label htmlFor="f-seoDescription" className="mb-1 block text-sm font-medium">{t("products.seoDesc")}</label>
          <textarea id="f-seoDescription" name="seoDescription" rows={2} maxLength={200} defaultValue={p?.seoDescription ?? ""} className={areaCls} />
        </div>
      </div>
      <SubmitButton pendingText={t("common.saving")}>{p ? t("common.save") : t("products.create")}</SubmitButton>
    </form>
  );
}
