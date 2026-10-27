import { getLocale, getTranslations } from "next-intl/server";
import { Badge, Flash, PageHeader, btnDanger, btnGhost, card } from "@/components/admin/ui";
import { approveReview, deleteReview } from "@/features/admin/review-actions";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils/date";

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const [t, locale] = await Promise.all([getTranslations("adm"), getLocale()]);
  const reviews = await prisma.review.findMany({ orderBy: [{ approved: "asc" }, { createdAt: "desc" }], take: 100, include: { product: { select: { nameAr: true, nameEn: true } } } });
  return (
    <>
      <PageHeader title={t("nav.reviews")} />
      <Flash ok={sp.ok} error={sp.error} />
      {reviews.length === 0 ? <p className={`${card} text-sm text-muted-foreground`}>{t("reviews.empty")}</p> : (
        <ul className="space-y-3">{reviews.map((r) => (
          <li key={r.id} className={`${card} flex flex-wrap items-start justify-between gap-4`}>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">{r.authorName} · {"★".repeat(r.rating)} <Badge tone={r.approved ? "green" : "amber"}>{r.approved ? t("reviews.approved") : t("reviews.pending")}</Badge></p>
              <p className="text-xs text-muted-foreground">{locale === "en" ? r.product.nameEn : r.product.nameAr} · {formatDate(r.createdAt, locale)}</p>
              {r.body && <p className="mt-2 whitespace-pre-line">{r.body}</p>}
            </div>
            <div className="flex gap-2">
              {!r.approved && <form action={approveReview}><input type="hidden" name="reviewId" value={r.id} /><button className={btnGhost}>{t("reviews.approve")}</button></form>}
              <form action={deleteReview}><input type="hidden" name="reviewId" value={r.id} /><button className={btnDanger}>{t("common.delete")}</button></form>
            </div>
          </li>))}</ul>
      )}
    </>
  );
}
