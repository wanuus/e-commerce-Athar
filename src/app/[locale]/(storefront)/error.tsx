"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-extrabold text-navy">{t("title")}</h1>
      <p className="mt-4 text-muted-foreground">{t("body")}</p>
      {error.digest && <p className="mt-2 text-xs text-muted-foreground">{t("ref")}: <span dir="ltr">{error.digest}</span></p>}
      <button onClick={reset} className="mt-8 inline-flex h-12 items-center rounded-full bg-navy px-8 text-sm font-semibold text-white hover:bg-navy-soft">{t("retry")}</button>
    </div>
  );
}
