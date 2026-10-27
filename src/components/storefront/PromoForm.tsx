"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { applyPromo, type PromoState } from "@/features/cart/actions";

export function PromoForm() {
  const t = useTranslations("cart");
  const [state, action, pending] = useActionState<PromoState, FormData>(applyPromo, { status: "idle" });
  return (
    <form action={action} className="space-y-2">
      <div className="flex gap-2">
        <label htmlFor="promo" className="sr-only">{t("promoPlaceholder")}</label>
        <input id="promo" name="code" dir="ltr" autoCapitalize="characters" placeholder={t("promoPlaceholder")} className="h-11 flex-1 rounded-full border border-border bg-white px-4 text-sm uppercase" />
        <button type="submit" disabled={pending} className="h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{t("applyPromo")}</button>
      </div>
      {state.status === "error" && <p role="alert" className="text-sm text-destructive">{t(`promoErrors.${state.reason ?? "not_found"}`)}</p>}
    </form>
  );
}
