import { getLocale } from "next-intl/server";
import { getAnnouncement } from "@/features/settings/service";

export async function AnnouncementBar() {
  const [locale, a] = await Promise.all([getLocale(), getAnnouncement()]);
  const l = locale === "en" ? "en" : "ar";
  const msg = a.messages[0];
  if (!a.enabled || !msg) return null;
  return <div className="bg-navy px-4 py-2 text-center text-sm text-white">{msg[l]}</div>;
}
