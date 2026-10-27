"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction, type LoginState } from "./actions";

export function LoginForm() {
  const t = useTranslations("admin");
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { error: false });
  const field = "h-12 w-full rounded-xl border border-border bg-white px-4 text-sm";
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">{t("email")}</label>
        <input id="email" name="email" type="email" required autoComplete="username" className={field} dir="ltr" />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">{t("password")}</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className={field} dir="ltr" />
      </div>
      {state.error && <p role="alert" className="text-sm text-destructive">{t("invalid")}</p>}
      <button type="submit" disabled={pending} className="h-12 w-full rounded-xl bg-navy text-sm font-semibold text-white hover:bg-navy-soft disabled:opacity-60">
        {t("signIn")}
      </button>
    </form>
  );
}
