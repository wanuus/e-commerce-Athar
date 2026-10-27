import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Badge, Field, Flash, PageHeader, TextArea, btnDanger, card, orderTone, td, th } from "@/components/admin/ui";
import { changeOrderStatus, collectCod, recordRefund, saveAdminNote, saveTracking } from "@/features/admin/order-actions";
import { nextStatuses } from "@/features/admin/order-rules";
import { prisma } from "@/lib/db/prisma";
import { formatDateTime } from "@/lib/utils/date";
import { formatMoney } from "@/lib/utils/money";

const KNOWN_EVENTS = ["order_placed", "status_changed", "payment_confirmed", "payment_failed", "payment_refunded", "payment_amount_mismatch", "duplicate_payment_needs_refund", "paid_after_cancel_needs_attention", "stock_commit_failed", "cod_collected", "refund_required", "refund_recorded", "tracking_updated", "order_cancelled", "confirmation_email_sent"];
const ATTENTION = ["payment_amount_mismatch", "duplicate_payment_needs_refund", "paid_after_cancel_needs_attention", "stock_commit_failed"];

export default async function OrderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [t, locale] = await Promise.all([getTranslations("adm"), getLocale()]);
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true, payments: { orderBy: { createdAt: "asc" } }, events: { orderBy: { createdAt: "desc" } } } });
  if (!order) notFound();
  const m = (n: number) => formatMoney(n, locale);
  const addr = order.addressSnapshot as Record<string, string | null>;
  const next = nextStatuses(order.status);
  const forward = next.filter((s) => s !== "CANCELLED" && s !== "RETURNED");
  const eventTypes = order.events.map((e) => e.type);
  const attention = ATTENTION.filter((a) => eventTypes.includes(a));
  const refundDue = order.paymentStatus === "PAID" && (order.status === "CANCELLED" || order.status === "RETURNED");
  const canCollect = order.paymentMethod === "COD" && order.paymentStatus === "PENDING" && order.status !== "CANCELLED" && order.status !== "RETURNED";

  return (
    <>
      <PageHeader title={`${t("orders.order")} ${order.orderNumber}`}>
        <Badge tone={orderTone(order.status)}>{t(`orderStatus.${order.status}`)}</Badge>
        <Badge tone={orderTone(order.paymentStatus)}>{t(`paymentStatus.${order.paymentStatus}`)}</Badge>
      </PageHeader>
      <Flash ok={sp.ok} error={sp.error} />
      {attention.length > 0 && <p role="alert" className="mb-6 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">{t("orders.attention")}: {attention.map((a) => t(`events.${a}`)).join(" · ")}</p>}
      {refundDue && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f5e9c8] p-4 text-sm text-[#8a6a10]">
          <span>{t("orders.refundDue", { amount: m(order.total) })}</span>
          <form action={recordRefund}><input type="hidden" name="orderId" value={order.id} /><SubmitButton className="h-9">{t("orders.markRefunded")}</SubmitButton></form>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className={card}>
            <h2 className="mb-3 text-lg font-bold text-navy">{t("orders.items")}</h2>
            <div className="overflow-x-auto"><table className="w-full">
              <thead><tr><th className={th}>{t("orders.product")}</th><th className={th}>SKU</th><th className={th}>{t("orders.qty")}</th><th className={th}>{t("orders.unit")}</th><th className={th}>{t("orders.total")}</th></tr></thead>
              <tbody>{order.items.map((i) => (
                <tr key={i.id} className="border-t border-border">
                  <td className={td}>{locale === "en" ? i.nameEn : i.nameAr}<span className="block text-xs text-muted-foreground">{i.colorName} / {i.size}</span></td>
                  <td className={td} dir="ltr">{i.sku}</td><td className={td}>{i.quantity}</td><td className={td}>{m(i.unitPrice)}</td><td className={td}>{m(i.lineTotal)}</td>
                </tr>))}</tbody></table></div>
            <dl className="mt-4 ms-auto max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between"><dt>{t("orders.subtotal")}</dt><dd>{m(order.subtotal)}</dd></div>
              {order.discountTotal > 0 && <div className="flex justify-between text-success"><dt>{order.discountCode}</dt><dd>-{m(order.discountTotal)}</dd></div>}
              <div className="flex justify-between"><dt>{t("orders.shipping")}</dt><dd>{m(order.shippingFee)}</dd></div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><dt>{t("orders.total")}</dt><dd>{m(order.total)}</dd></div>
            </dl>
          </section>

          <section className={card}>
            <h2 className="mb-3 text-lg font-bold text-navy">{t("orders.payments")}</h2>
            <ul className="divide-y divide-border text-sm">{order.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{p.provider.toUpperCase()} · {m(p.amount)} · {formatDateTime(p.createdAt, locale)}{p.collectedAt && <> · {t("orders.collectedAt")} {formatDateTime(p.collectedAt, locale)}</>}</span>
                <Badge tone={orderTone(p.status)}>{t(`paymentStatus.${p.status}`)}</Badge>
              </li>))}</ul>
          </section>

          <section className={card}>
            <h2 className="mb-3 text-lg font-bold text-navy">{t("orders.history")}</h2>
            <ol className="space-y-2 text-sm">{order.events.map((e) => (
              <li key={e.id} className="flex flex-wrap gap-x-3"><span className="text-muted-foreground">{formatDateTime(e.createdAt, locale)}</span><span>{KNOWN_EVENTS.includes(e.type) ? t(`events.${e.type}`) : e.type}{e.message ? <span className="text-muted-foreground" dir="ltr"> · {e.message}</span> : null}</span></li>))}</ol>
          </section>
        </div>

        <div className="space-y-6">
          <section className={card}>
            <h2 className="mb-3 text-lg font-bold text-navy">{t("orders.actions")}</h2>
            <div className="flex flex-col gap-2">
              {forward.map((s) => (
                <form key={s} action={changeOrderStatus}><input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="to" value={s} /><SubmitButton className="w-full">{t("orders.moveTo", { status: t(`orderStatus.${s}`) })}</SubmitButton></form>
              ))}
              {canCollect && (
                <form action={collectCod}><input type="hidden" name="orderId" value={order.id} /><SubmitButton className="w-full bg-success hover:bg-success/90">{t("orders.markCollected", { amount: m(order.total) })}</SubmitButton></form>
              )}
              {next.includes("RETURNED") && (
                <details className="rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm font-medium">{t("orders.markReturned")}</summary>
                  <form action={changeOrderStatus} className="mt-3 space-y-3"><input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="to" value="RETURNED" />
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="restock" defaultChecked className="h-4 w-4 accent-[#596c50]" />{t("orders.restock")}</label>
                    <button className={btnDanger}>{t("orders.confirmReturn")}</button></form></details>
              )}
              {next.includes("CANCELLED") && (
                <details className="rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm font-medium text-destructive">{t("orders.cancelOrder")}</summary>
                  <form action={changeOrderStatus} className="mt-3 space-y-3"><input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="to" value="CANCELLED" />
                    <p className="text-xs text-muted-foreground">{t("orders.cancelHint")}</p><button className={btnDanger}>{t("orders.confirmCancel")}</button></form></details>
              )}
              {next.length === 0 && !canCollect && <p className="text-sm text-muted-foreground">{t("orders.final")}</p>}
            </div>
          </section>

          <section className={card}>
            <h2 className="mb-3 text-lg font-bold text-navy">{t("orders.customer")}</h2>
            <p className="text-sm leading-7">{order.firstName} {order.lastName}<br /><span dir="ltr">{order.email}</span><br /><span dir="ltr">{order.phone}</span></p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{[addr.street, addr.building, addr.apartment && `${t("orders.apt")} ${addr.apartment}`, addr.floor && `${t("orders.floor")} ${addr.floor}`, addr.district, addr.city, addr.governorate, addr.postalCode].filter(Boolean).join("، ")}
              {addr.landmark && <><br />{t("orders.landmark")}: {addr.landmark}</>}{addr.instructions && <><br />{t("orders.instructions")}: {addr.instructions}</>}</p>
            {order.customerNote && <p className="mt-3 rounded-xl bg-warm p-3 text-sm"><strong>{t("orders.customerNote")}:</strong> {order.customerNote}</p>}
          </section>

          <section className={card}>
            <h2 className="mb-3 text-lg font-bold text-navy">{t("orders.tracking")}</h2>
            <form action={saveTracking} className="space-y-3"><input type="hidden" name="orderId" value={order.id} />
              <Field label={t("orders.carrier")} name="carrier" defaultValue={order.trackingCarrier} maxLength={60} />
              <Field label={t("orders.trackingNumber")} name="trackingNumber" defaultValue={order.trackingNumber} dir="ltr" maxLength={100} />
              <SubmitButton>{t("common.save")}</SubmitButton></form>
          </section>

          <section className={card}>
            <h2 className="mb-3 text-lg font-bold text-navy">{t("orders.adminNote")}</h2>
            <form action={saveAdminNote} className="space-y-3"><input type="hidden" name="orderId" value={order.id} />
              <TextArea label={t("orders.adminNoteHint")} name="adminNote" defaultValue={order.adminNote} rows={3} />
              <SubmitButton>{t("common.save")}</SubmitButton></form>
          </section>
        </div>
      </div>
    </>
  );
}
