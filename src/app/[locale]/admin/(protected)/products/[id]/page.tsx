import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ProductForm } from "@/components/admin/ProductForm";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Badge, Flash, PageHeader, areaCls, btnDanger, btnGhost, card, inputCls } from "@/components/admin/ui";
import { addProductImage, deleteProductImage, setPrimaryImage } from "@/features/admin/product-actions";
import { generateVariants, updateVariant } from "@/features/admin/variant-actions";
import { prisma } from "@/lib/db/prisma";
import { SIZE_ORDER } from "@/lib/config/site";
import { cloudinaryConfigured } from "@/lib/storage/cloudinary";

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [t, locale] = await Promise.all([getTranslations("adm"), getLocale()]);
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } }, variants: { orderBy: [{ colorName: "asc" }, { size: "asc" }] } } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!product) notFound();
  const path = `/admin/products/${product.id}`;
  const colors = [...new Set(product.variants.map((v) => v.colorName))];
  const variants = [...product.variants].sort((a, b) => a.colorName.localeCompare(b.colorName) || SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size));

  return (
    <>
      <PageHeader title={locale === "en" ? product.nameEn : product.nameAr}>
        <Badge tone={product.status === "ACTIVE" ? "green" : "amber"}>{t(`productStatus.${product.status}`)}</Badge>
        {product.status === "ACTIVE" && <Link href={`/products/${product.slug}`} className={btnGhost}>{t("products.viewOnStore")}</Link>}
      </PageHeader>
      <Flash ok={sp.ok} error={sp.error} />
      <ProductForm product={product} categories={categories} locale={locale} />

      <section className={`${card} mt-8`}>
        <h2 className="mb-1 text-lg font-bold text-navy">{t("products.variants")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("products.variantsHint")}</p>
        {variants.length === 0 ? <p className="text-sm text-muted-foreground">{t("products.noVariants")}</p> : (
          <ul className="divide-y divide-border">
            <li className="hidden grid-cols-[1.4fr_1fr_6rem_6rem_5rem_6rem] gap-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
              <span>{t("products.variant")}</span><span>SKU</span><span>{t("products.stock")}</span><span>{t("products.overridePrice")}</span><span>{t("common.active")}</span><span />
            </li>
            {variants.map((v) => (
              <li key={v.id}>
                <form action={updateVariant} className="grid items-center gap-3 py-3 md:grid-cols-[1.4fr_1fr_6rem_6rem_5rem_6rem]">
                  <input type="hidden" name="variantId" value={v.id} />
                  <input type="hidden" name="returnTo" value={path} />
                  <span className="flex items-center gap-2 text-sm font-medium"><span className="inline-block h-4 w-4 rounded-full border border-border" style={{ backgroundColor: v.colorHex }} aria-hidden />{locale === "en" ? v.colorName : v.colorNameAr} / {v.size}</span>
                  <span className="text-xs text-muted-foreground" dir="ltr">{v.sku}</span>
                  <label className="text-sm"><span className="sr-only">{t("products.stock")}</span><input name="stock" type="number" min={0} defaultValue={v.stock} className={inputCls} dir="ltr" /><span className="mt-0.5 block text-[11px] text-muted-foreground">{t("products.reserved", { count: v.reserved })}</span></label>
                  <label className="text-sm"><span className="sr-only">{t("products.overridePrice")}</span><input name="priceOverride" type="number" min={0} step="0.01" defaultValue={v.priceOverride === null ? "" : v.priceOverride / 100} className={inputCls} dir="ltr" /></label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={v.isActive} className="h-4 w-4 accent-[#596c50]" /><span className="md:sr-only">{t("common.active")}</span></label>
                  <SubmitButton className="h-9 px-4">{t("common.save")}</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={generateVariants} className="mt-6 space-y-4 rounded-2xl bg-warm p-5">
          <input type="hidden" name="productId" value={product.id} />
          <h3 className="font-semibold text-navy">{t("products.generate")}</h3>
          <div>
            <label htmlFor="g-colors" className="mb-1 block text-sm font-medium">{t("products.colorsList")}</label>
            <textarea id="g-colors" name="colors" rows={4} dir="ltr" required className={areaCls} defaultValue={"Olive,زيتي,#7E9073\nWhite,أبيض,#FFFFFF\nBlack,أسود,#111111\nNavy,كحلي,#1F3044"} />
            <p className="mt-1 text-xs text-muted-foreground">{t("products.colorsHint")}</p>
          </div>
          <fieldset>
            <legend className="mb-1 text-sm font-medium">{t("products.sizes")}</legend>
            <div className="flex flex-wrap gap-3">
              {["XS", "S", "M", "L", "XL", "XXL"].map((s) => <label key={s} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="size" value={s} defaultChecked className="h-4 w-4 accent-[#596c50]" />{s}</label>)}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="g-stock" className="mb-1 block text-sm font-medium">{t("products.initialStock")}</label><input id="g-stock" name="stock" type="number" min={0} defaultValue={0} className={inputCls} dir="ltr" /></div>
            <div><label htmlFor="g-price" className="mb-1 block text-sm font-medium">{t("products.overridePrice")}</label><input id="g-price" name="priceOverride" type="number" min={0} step="0.01" className={inputCls} dir="ltr" /></div>
          </div>
          <SubmitButton pendingText={t("common.saving")}>{t("products.generateButton")}</SubmitButton>
        </form>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="mb-4 text-lg font-bold text-navy">{t("products.images")}</h2>
        {product.images.length > 0 && (
          <ul className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {product.images.map((im, i) => (
              <li key={im.id} className="rounded-2xl border border-border p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.url} alt={im.altEn ?? ""} className="aspect-[4/5] w-full rounded-xl object-cover" />
                <p className="mt-2 text-xs text-muted-foreground">{im.colorName ?? t("products.allColors")}{i === 0 && <> · <Badge tone="green">{t("products.primary")}</Badge></>}</p>
                <div className="mt-2 flex gap-2">
                  {i !== 0 && <form action={setPrimaryImage}><input type="hidden" name="imageId" value={im.id} /><button className={btnGhost}>{t("products.makePrimary")}</button></form>}
                  <form action={deleteProductImage}><input type="hidden" name="imageId" value={im.id} /><button className={btnDanger}>{t("common.delete")}</button></form>
                </div>
              </li>
            ))}
          </ul>
        )}
        {cloudinaryConfigured() ? (
          <form action={addProductImage} className="space-y-4 rounded-2xl bg-warm p-5">
            <input type="hidden" name="productId" value={product.id} />
            <ImageUploader name="url" label={t("products.addImage")} />
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="i-color" className="mb-1 block text-sm font-medium">{t("products.imageColor")}</label>
                <select id="i-color" name="colorName" className={inputCls} defaultValue=""><option value="">{t("products.allColors")}</option>{colors.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              </div>
              <div><label htmlFor="i-altAr" className="mb-1 block text-sm font-medium">{t("products.altAr")}</label><input id="i-altAr" name="altAr" dir="rtl" className={inputCls} /></div>
              <div><label htmlFor="i-altEn" className="mb-1 block text-sm font-medium">{t("products.altEn")}</label><input id="i-altEn" name="altEn" dir="ltr" className={inputCls} /></div>
            </div>
            <SubmitButton pendingText={t("common.saving")}>{t("products.saveImage")}</SubmitButton>
          </form>
        ) : <p className="rounded-2xl bg-warm p-4 text-sm text-muted-foreground">{t("upload.setup")}</p>}
      </section>
    </>
  );
}
