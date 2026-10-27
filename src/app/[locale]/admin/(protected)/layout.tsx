import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { signOut } from "@/lib/auth";
import { requireStaff } from "@/features/admin/guard";
import { Logo } from "@/components/shared/Logo";
import { AdminNav } from "@/components/admin/AdminNav";
import { ScrollProgress } from "@/components/layout/ScrollProgress";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  // Every admin page sits behind this server-side role check (re-read from the database).
  const actor = await requireStaff();
  const [t, locale] = await Promise.all([getTranslations("adm"), getLocale()]);

  const staffItems = [
    { href: "/admin/dashboard", label: t("nav.dashboard") },
    { href: "/admin/orders", label: t("nav.orders") },
    { href: "/admin/products", label: t("nav.products") },
    { href: "/admin/inventory", label: t("nav.inventory") },
    { href: "/admin/customers", label: t("nav.customers") },
    { href: "/admin/reviews", label: t("nav.reviews") },
  ];
  const adminItems = [
    { href: "/admin/discounts", label: t("nav.discounts") },
    { href: "/admin/shipping", label: t("nav.shipping") },
    { href: "/admin/subscribers", label: t("nav.subscribers") },
    { href: "/admin/settings", label: t("nav.settings") },
    { href: "/admin/users", label: t("nav.users") },
    { href: "/admin/audit", label: t("nav.audit") },
  ];
  const items = actor.role === "ADMIN" ? [...staffItems, ...adminItems] : staffItems;

  return (
    <div className="admin-shell min-h-screen bg-warm">
      <ScrollProgress />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-navy focus:px-4 focus:py-2 focus:text-sm focus:text-white">{t("nav.skip")}</a>
      <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo tone="navy" href="/admin/dashboard" />
          <div className="flex items-center gap-4 text-sm">
            <a href={`/${locale}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">{t("nav.viewStore")}</a>
            <span className="hidden text-muted-foreground sm:inline" dir="ltr">{actor.email}</span>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/admin/login" }); }}>
              <button className="font-medium text-muted-foreground hover:text-foreground">{t("nav.signOut")}</button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[200px_1fr]">
        <aside className="md:sticky md:top-24 md:h-fit"><AdminNav items={items} /></aside>
        <main id="main" tabIndex={-1} className="min-w-0 outline-none">{children}</main>
      </div>
    </div>
  );
}
