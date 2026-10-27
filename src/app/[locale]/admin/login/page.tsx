import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Logo } from "@/components/shared/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <div className="flex min-h-screen items-center justify-center bg-warm px-4">
      <div className="animate-fade-up w-full max-w-sm rounded-2xl bg-white p-8 shadow-soft">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Logo tone="navy" href={null} />
          <h1 className="text-sm text-muted-foreground">{t("login")}</h1>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
