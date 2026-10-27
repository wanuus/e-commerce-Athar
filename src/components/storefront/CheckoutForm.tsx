"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { getQuote, placeOrder, type PlaceOrderState, type QuoteDTO } from "@/features/orders/actions";
import { formatMoney } from "@/lib/utils/money";

type Line = { id: string; name: string; color: string; size: string; quantity: number; lineTotal: number; image: string | null };
type Props = {
  locale: "ar" | "en";
  idempotencyKey: string;
  lines: Line[];
  governorates: { key: string; label: string }[];
  cardAvailable: boolean;
  cardIsTest: boolean;
};

export function CheckoutForm({ locale, idempotencyKey, lines, governorates, cardAvailable, cardIsTest }: Props) {
  const t = useTranslations("checkout");
  const [state, action, pending] = useActionState<PlaceOrderState, FormData>(placeOrder, { status: "idle" });
  const v = state.values ?? {};
  const [gov, setGov] = useState(v.governorate ?? "");
  const [quote, setQuote] = useState<QuoteDTO | null>(null);
  const [, startTransition] = useTransition();
  const m = (n: number) => formatMoney(n, locale);

  const refresh = (g: string) => {
    if (!g) return setQuote(null);
    startTransition(async () => setQuote(await getQuote(g)));
  };
  // Re-quote after a failed submit so the summary always matches what the server will charge.
  useEffect(() => {
    if (state.status === "error" && gov) refresh(gov);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const fe = state.fieldErrors ?? {};
  const err = (name: string) => (fe[name] ? <p className="mt-1 text-xs text-destructive">{fe[name] === "invalid_phone" ? t("errors.invalid_phone") : t("errors.field")}</p> : null);
  const input = "h-12 w-full rounded-xl border border-border bg-white px-4 text-sm";
  const F = (name: string, label: string, o: { required?: boolean; type?: string; auto?: string; ltr?: boolean } = {}) => (
    <div>
      <label htmlFor={`c-${name}`} className="mb-1 block text-sm font-medium">{label}{o.required && <span className="text-destructive"> *</span>}</label>
      <input id={`c-${name}`} name={name} type={o.type ?? "text"} autoComplete={o.auto} dir={o.ltr ? "ltr" : undefined} required={o.required} defaultValue={v[name] ?? ""} aria-invalid={!!fe[name]} className={input} />
      {err(name)}
    </div>
  );
  const ok = quote && quote.ok ? quote : null;

  return (
    <form action={action} className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="expectedTotal" value={ok ? ok.total : ""} />

      <div className="space-y-10">
        {state.status === "error" && state.code && (
          <p role="alert" className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
            {t(`errors.${state.code}`, { total: state.newTotal !== undefined ? m(state.newTotal) : "" })}
          </p>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-navy">{t("contact")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {F("firstName", t("firstName"), { required: true, auto: "given-name" })}
            {F("lastName", t("lastName"), { required: true, auto: "family-name" })}
            {F("email", t("email"), { required: true, type: "email", auto: "email", ltr: true })}
            {F("phone", t("phone"), { required: true, type: "tel", auto: "tel", ltr: true })}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-navy">{t("address")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-governorate" className="mb-1 block text-sm font-medium">{t("governorate")}<span className="text-destructive"> *</span></label>
              <select id="c-governorate" name="governorate" required defaultValue={v.governorate ?? ""} onChange={(e) => { setGov(e.target.value); refresh(e.target.value); }} className={input} aria-invalid={!!fe.governorate}>
                <option value="">{t("selectGovernorate")}</option>
                {governorates.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
              </select>
              {err("governorate")}
            </div>
            {F("city", t("city"), { required: true, auto: "address-level2" })}
            {F("district", t("district"))}
            {F("street", t("street"), { required: true, auto: "address-line1" })}
            {F("building", t("building"))}
            {F("apartment", t("apartment"))}
            {F("floor", t("floor"))}
            {F("landmark", t("landmark"))}
            {F("postalCode", t("postalCode"), { auto: "postal-code", ltr: true })}
          </div>
          <div>
            <label htmlFor="c-instructions" className="mb-1 block text-sm font-medium">{t("instructions")}</label>
            <textarea id="c-instructions" name="instructions" rows={2} defaultValue={v.instructions ?? ""} className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm" />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-navy">{t("delivery")}</h2>
          <div className="rounded-2xl border border-border p-4 text-sm">
            {!gov ? <p className="text-muted-foreground">{t("chooseGovernorate")}</p>
              : !quote ? <p className="text-muted-foreground">…</p>
              : !quote.ok ? <p className="text-destructive">{t("errors.no_zone")}</p>
              : <p><span className="font-semibold">{locale === "en" ? quote.zoneNameEn : quote.zoneNameAr}</span> · {quote.freeShipping ? t("freeShipping") : m(quote.shippingFee)} · {t("deliveryEta", { days: quote.estimatedDays })}</p>}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-navy">{t("payment")}</h2>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4 has-[:checked]:border-navy has-[:checked]:bg-warm">
            <input type="radio" name="paymentMethod" value="COD" defaultChecked={(v.paymentMethod ?? "COD") === "COD"} className="mt-1 accent-[#1f3044]" />
            <span><span className="block font-semibold">{t("cod")}</span><span className="text-sm text-muted-foreground">{t("codNote")}</span></span>
          </label>
          {cardAvailable && (
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4 has-[:checked]:border-navy has-[:checked]:bg-warm">
              <input type="radio" name="paymentMethod" value="CARD" defaultChecked={v.paymentMethod === "CARD"} className="mt-1 accent-[#1f3044]" />
              <span><span className="block font-semibold">{t("card")}</span><span className="text-sm text-muted-foreground">{t("cardNote")}</span>{cardIsTest && <span className="mt-1 block text-sm font-semibold text-destructive">{t("cardTest")}</span>}</span>
            </label>
          )}
          {err("paymentMethod")}
        </section>

        <section>
          <label htmlFor="c-note" className="mb-1 block text-sm font-medium">{t("customerNote")}</label>
          <textarea id="c-note" name="customerNote" rows={2} defaultValue={v.customerNote ?? ""} className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm" />
        </section>
      </div>

      <aside className="h-fit space-y-5 rounded-2xl bg-warm p-6 lg:sticky lg:top-24">
        <h2 className="text-xl font-bold text-navy">{t("summary")}</h2>
        <ul className="space-y-3">
          {lines.map((l) => (
            <li key={l.id} className="flex gap-3 text-sm">
              <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-white">{l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-cover" />}</span>
              <span className="flex-1"><span className="block font-medium">{l.name}</span><span className="text-muted-foreground">{l.color} · {l.size} × {l.quantity}</span></span>
              <span className="font-medium">{m(l.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t border-border pt-4 text-sm">
          {ok ? (
            <>
              <div className="flex justify-between"><dt>{t("subtotal")}</dt><dd>{m(ok.subtotal)}</dd></div>
              {ok.discountTotal > 0 && <div className="flex justify-between text-success"><dt>{ok.discountCode}</dt><dd>-{m(ok.discountTotal)}</dd></div>}
              <div className="flex justify-between"><dt>{t("delivery")}</dt><dd>{ok.freeShipping ? t("freeShipping") : m(ok.shippingFee)}</dd></div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-bold"><dt>{t("total")}</dt><dd>{m(ok.total)}</dd></div>
            </>
          ) : <p className="text-muted-foreground">{t("chooseGovernorate")}</p>}
        </dl>
        {ok && <p className="text-xs text-muted-foreground">{t("confirmTotal", { total: m(ok.total) })}</p>}
        <button type="submit" disabled={!ok || pending} className="h-12 w-full rounded-full bg-navy text-sm font-semibold text-white transition-colors hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-50">
          {pending ? t("placing") : t("placeOrder")}
        </button>
      </aside>
    </form>
  );
}
