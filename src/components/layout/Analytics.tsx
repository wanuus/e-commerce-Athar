"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useTranslations } from "next-intl";

const KEY = "athar_consent";

/** Google Analytics 4 that loads ONLY after the visitor accepts. Declining (or ignoring the banner) keeps it off. */
export function Analytics({ gaId }: { gaId: string }) {
  const t = useTranslations("consent");
  const [choice, setChoice] = useState<"granted" | "denied" | "ask" | "loading">("loading");
  useEffect(() => {
    let v: string | null = null;
    try {
      v = localStorage.getItem(KEY);
    } catch {}
    setChoice(v === "granted" || v === "denied" ? v : "ask");
  }, []);
  const decide = (v: "granted" | "denied") => {
    try {
      localStorage.setItem(KEY, v);
    } catch {}
    setChoice(v);
  };
  return (
    <>
      {choice === "granted" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {choice === "ask" && (
        <div role="dialog" aria-live="polite" className="animate-fade-up fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl flex-col gap-3 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-border sm:flex-row sm:items-center">
          <p className="flex-1 text-sm">{t("text")}</p>
          <div className="flex gap-2">
            <button onClick={() => decide("denied")} className="h-10 rounded-full border border-border px-5 text-sm">{t("decline")}</button>
            <button onClick={() => decide("granted")} className="h-10 rounded-full bg-navy px-5 text-sm font-semibold text-white">{t("accept")}</button>
          </div>
        </div>
      )}
    </>
  );
}
