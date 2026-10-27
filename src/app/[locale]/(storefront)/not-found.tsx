import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-olive-light">404</p>
      <h1 className="mt-4 text-3xl font-extrabold text-navy">{t("notFoundTitle")}</h1>
      <p className="mt-4 text-muted-foreground">{t("notFoundBody")}</p>
      <Link href="/" className="mt-8 inline-flex h-12 items-center rounded-full bg-navy px-8 text-sm font-semibold text-white hover:bg-navy-soft">{t("home")}</Link>
    </div>
  );
}
