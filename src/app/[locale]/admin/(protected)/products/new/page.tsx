import { getLocale, getTranslations } from "next-intl/server";
import { Flash, PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";
import { prisma } from "@/lib/db/prisma";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const [t, locale, categories] = await Promise.all([getTranslations("adm"), getLocale(), prisma.category.findMany({ orderBy: { sortOrder: "asc" } })]);
  return (
    <>
      <PageHeader title={t("products.newTitle")} />
      <Flash ok={sp.ok} error={sp.error} />
      <p className="mb-4 text-sm text-muted-foreground">{t("products.newHint")}</p>
      <ProductForm product={null} categories={categories} locale={locale} />
    </>
  );
}
