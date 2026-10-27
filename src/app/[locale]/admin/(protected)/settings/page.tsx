import { getTranslations } from "next-intl/server";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Field, Flash, PageHeader, TextArea, card } from "@/components/admin/ui";
import { requireAdmin } from "@/features/admin/guard";
import { saveAnnouncement, saveBrand, saveHero } from "@/features/admin/settings-actions";
import { getAnnouncement, getBrand, getHero } from "@/features/settings/service";
import { BRAND_COLOR_VARS, type BrandColorKey } from "@/lib/config/brand";
import { cloudinaryConfigured } from "@/lib/storage/cloudinary";

const COLOR_DEFAULTS: Record<BrandColorKey, string> = { navy: "#1f3044", navySoft: "#34465a", olive: "#7e9073", oliveLight: "#a8b59a", oliveDeep: "#596c50", warm: "#f8f9f6", foreground: "#202820" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const t = await getTranslations("adm");
  const [brand, hero, ann] = await Promise.all([getBrand(), getHero(), getAnnouncement()]);
  const upload = cloudinaryConfigured();
  const h2 = "text-lg font-bold text-navy";

  return (
    <>
      <PageHeader title={`${t("nav.settings")} → ${t("settings.brandIdentity")}`} />
      <Flash ok={sp.ok} error={sp.error} />
      {!upload && <p className="mb-6 rounded-2xl bg-warm p-4 text-sm text-muted-foreground">{t("upload.setup")}</p>}

      <form action={saveBrand} className={`${card} mb-8 space-y-6`}>
        <h2 className={h2}>{t("settings.brand")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("settings.nameAr")} name="nameAr" defaultValue={brand.nameAr} required dir="rtl" maxLength={60} hint={t("settings.nameHint")} />
          <Field label={t("settings.nameEn")} name="nameEn" defaultValue={brand.nameEn} required dir="ltr" maxLength={60} />
          <TextArea label={t("settings.descAr")} name="descAr" defaultValue={brand.description.ar} rows={2} dir="rtl" />
          <TextArea label={t("settings.descEn")} name="descEn" defaultValue={brand.description.en} rows={2} dir="ltr" />
          <TextArea label={t("settings.footerAr")} name="footerAr" defaultValue={brand.footerText.ar} rows={2} dir="rtl" />
          <TextArea label={t("settings.footerEn")} name="footerEn" defaultValue={brand.footerText.en} rows={2} dir="ltr" />
        </div>
        {upload && (
          <div className="grid gap-6 sm:grid-cols-3">
            <ImageUploader name="logoUrl" label={t("settings.logo")} initial={brand.logoUrl} />
            <ImageUploader name="faviconUrl" label={t("settings.favicon")} initial={brand.faviconUrl} />
            <ImageUploader name="ogImage" label={t("settings.ogImage")} initial={brand.seo.ogImage} />
          </div>
        )}
        <div>
          <h3 className="mb-1 font-semibold">{t("settings.colors")}</h3>
          <p className="mb-3 text-xs text-muted-foreground">{t("settings.colorsHint")}</p>
          <div className="flex flex-wrap gap-4">
            {(Object.keys(BRAND_COLOR_VARS) as BrandColorKey[]).map((k) => (
              <label key={k} className="flex flex-col items-center gap-1 text-xs"><input type="color" name={`color_${k}`} defaultValue={brand.colors[k] ?? COLOR_DEFAULTS[k]} className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-white p-1" />{t(`settings.color.${k}`)}</label>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" name="resetColors" className="h-4 w-4 accent-[#596c50]" />{t("settings.resetColors")}</label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Instagram" name="instagram" defaultValue={brand.social.instagram} dir="ltr" hint="https://…" />
          <Field label="Facebook" name="facebook" defaultValue={brand.social.facebook} dir="ltr" hint="https://…" />
          <Field label="TikTok" name="tiktok" defaultValue={brand.social.tiktok} dir="ltr" hint="https://…" />
          <Field label={t("settings.contactEmail")} name="email" type="email" defaultValue={brand.contact.email} dir="ltr" />
          <Field label={t("settings.contactPhone")} name="phone" defaultValue={brand.contact.phone} dir="ltr" />
          <Field label="WhatsApp" name="whatsapp" defaultValue={brand.contact.whatsapp} dir="ltr" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("settings.seoTitleAr")} name="seoTitleAr" defaultValue={brand.seo.title.ar} dir="rtl" maxLength={70} />
          <Field label={t("settings.seoTitleEn")} name="seoTitleEn" defaultValue={brand.seo.title.en} dir="ltr" maxLength={70} />
          <TextArea label={t("settings.seoDescAr")} name="seoDescAr" defaultValue={brand.seo.description.ar} rows={2} dir="rtl" />
          <TextArea label={t("settings.seoDescEn")} name="seoDescEn" defaultValue={brand.seo.description.en} rows={2} dir="ltr" />
        </div>
        <SubmitButton pendingText={t("common.saving")}>{t("common.save")}</SubmitButton>
      </form>

      <form action={saveHero} className={`${card} mb-8 space-y-4`}>
        <h2 className={h2}>{t("settings.hero")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("settings.headlineAr")} name="headlineAr" defaultValue={hero.headline.ar} required dir="rtl" maxLength={120} />
          <Field label={t("settings.headlineEn")} name="headlineEn" defaultValue={hero.headline.en} required dir="ltr" maxLength={120} />
          <TextArea label={t("settings.subtitleAr")} name="subtitleAr" defaultValue={hero.subtitle.ar} rows={2} dir="rtl" />
          <TextArea label={t("settings.subtitleEn")} name="subtitleEn" defaultValue={hero.subtitle.en} rows={2} dir="ltr" />
          <Field label={t("settings.ctaAr")} name="ctaAr" defaultValue={hero.ctaText.ar} dir="rtl" maxLength={40} />
          <Field label={t("settings.ctaEn")} name="ctaEn" defaultValue={hero.ctaText.en} dir="ltr" maxLength={40} />
          <Field label={t("settings.ctaHref")} name="ctaHref" defaultValue={hero.ctaHref} dir="ltr" hint={t("settings.ctaHrefHint")} className="sm:col-span-2" />
        </div>
        {upload && <div className="grid gap-6 sm:grid-cols-2"><ImageUploader name="desktopImage" label={t("settings.heroDesktop")} initial={hero.desktopImage} /><ImageUploader name="mobileImage" label={t("settings.heroMobile")} initial={hero.mobileImage} /></div>}
        <SubmitButton pendingText={t("common.saving")}>{t("common.save")}</SubmitButton>
      </form>

      <form action={saveAnnouncement} className={`${card} space-y-4`}>
        <h2 className={h2}>{t("settings.announcement")}</h2>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={ann.enabled} className="h-4 w-4 accent-[#596c50]" />{t("settings.annEnabled")}</label>
        {[1, 2, 3].map((i) => (
          <div key={i} className="grid gap-4 sm:grid-cols-2">
            <Field label={`${t("settings.annAr")} ${i}`} name={`msgAr${i}`} defaultValue={ann.messages[i - 1]?.ar} dir="rtl" maxLength={140} />
            <Field label={`${t("settings.annEn")} ${i}`} name={`msgEn${i}`} defaultValue={ann.messages[i - 1]?.en} dir="ltr" maxLength={140} />
          </div>
        ))}
        <p className="text-xs text-muted-foreground">{t("settings.annHint")}</p>
        <SubmitButton pendingText={t("common.saving")}>{t("common.save")}</SubmitButton>
      </form>
    </>
  );
}
