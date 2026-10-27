"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { subscribeNewsletter, type NewsletterState } from "@/features/newsletter/actions";

const initial: NewsletterState = { status: "idle" };

export function NewsletterForm() {
  const t = useTranslations("home");
  const [state, action, pending] = useActionState(subscribeNewsletter, initial);
  const messages: Record<string, string> = {
    ok: t("subscribed"),
    exists: t("alreadySubscribed"),
    invalid: t("invalidEmail"),
    error: t("error"),
  };
  return (
    <form action={action} className="mx-auto flex w-full max-w-md flex-col gap-3 sm:flex-row" noValidate>
      <label className="sr-only" htmlFor="nl-email">{t("emailPlaceholder")}</label>
      <input
        id="nl-email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder={t("emailPlaceholder")}
        className="h-12 flex-1 rounded-full border border-border bg-white px-5 text-sm"
        dir="ltr"
      />
      <button type="submit" disabled={pending} className="h-12 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-olive disabled:opacity-60">
        {t("subscribe")}
      </button>
      <p role="status" aria-live="polite" className={`text-sm sm:basis-full ${state.status === "ok" ? "text-success" : "text-destructive"}`}>
        {messages[state.status] ?? ""}
      </p>
    </form>
  );
}
