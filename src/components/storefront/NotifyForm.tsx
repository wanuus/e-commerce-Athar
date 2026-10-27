"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { requestBackInStock, type NotifyState } from "@/features/catalog/actions";

export function NotifyForm({ variantId }: { variantId: string }) {
  const t = useTranslations("product");
  const [state, action, pending] = useActionState<NotifyState, FormData>(requestBackInStock, { status: "idle" });
  const msg: Record<string, string> = { ok: t("notifyOk"), exists: t("notifyExists"), invalid: t("notifyInvalid"), error: t("notifyError") };
  return (
    <form action={action} className="mt-4 rounded-2xl bg-warm p-4" noValidate>
      <p className="mb-2 text-sm font-semibold">{t("notifyTitle")}</p>
      <input type="hidden" name="variantId" value={variantId} />
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="nf-email">{t("notifyPlaceholder")}</label>
        <input id="nf-email" name="email" type="email" autoComplete="email" dir="ltr" placeholder={t("notifyPlaceholder")} className="h-11 flex-1 rounded-full border border-border bg-white px-4 text-sm" />
        <button type="submit" disabled={pending} className="h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{t("notifyButton")}</button>
      </div>
      <p role="status" aria-live="polite" className={`mt-2 text-sm ${state.status === "ok" ? "text-success" : "text-destructive"}`}>{msg[state.status] ?? ""}</p>
    </form>
  );
}
