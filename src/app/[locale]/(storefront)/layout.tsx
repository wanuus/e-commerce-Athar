import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ScrollProgress } from "@/components/layout/ScrollProgress";
import { BackToTop } from "@/components/layout/BackToTop";
import { Analytics } from "@/components/layout/Analytics";

const GA_ID = /^G-[A-Z0-9]{4,14}$/.test(process.env.NEXT_PUBLIC_GA_ID ?? "") ? process.env.NEXT_PUBLIC_GA_ID : undefined;

export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("common");
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-navy focus:px-4 focus:py-2 focus:text-sm focus:text-white">{t("skipToContent")}</a>
      <ScrollProgress />
      <AnnouncementBar />
      <Header />
      <main id="main" tabIndex={-1} className="outline-none">{children}</main>
      <Footer />
      <BackToTop />
      {GA_ID && <Analytics gaId={GA_ID} />}
    </>
  );
}
