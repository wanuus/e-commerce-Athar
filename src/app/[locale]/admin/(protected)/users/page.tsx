import { getLocale, getTranslations } from "next-intl/server";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Badge, Field, Flash, PageHeader, btnGhost, card, inputCls, td, th } from "@/components/admin/ui";
import { requireAdmin } from "@/features/admin/guard";
import { createStaff, resetUserPassword, setUserActive, setUserRole } from "@/features/admin/user-actions";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils/date";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const actor = await requireAdmin();
  const sp = await searchParams;
  const [t, locale] = await Promise.all([getTranslations("adm"), getLocale()]);
  const users = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "STAFF"] } }, orderBy: { createdAt: "asc" } });

  return (
    <>
      <PageHeader title={t("nav.users")} />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className={`${card} overflow-x-auto p-0`}>
          <table className="w-full">
            <thead><tr><th className={th}>{t("users.user")}</th><th className={th}>{t("users.role")}</th><th className={th}>{t("common.status")}</th><th className={th} /></tr></thead>
            <tbody>
              {users.map((u) => {
                const self = u.id === actor.id;
                const locked = u.lockedUntil && u.lockedUntil > new Date();
                return (
                  <tr key={u.id} className="border-t border-border align-top">
                    <td className={td}><span dir="ltr" className="font-medium">{u.email}</span><span className="block text-xs text-muted-foreground">{u.name ?? ""} · {formatDate(u.createdAt, locale)}</span></td>
                    <td className={td}>
                      {self ? <Badge tone="blue">{t(`role.${u.role}`)}</Badge> : (
                        <form action={setUserRole} className="flex items-center gap-2"><input type="hidden" name="userId" value={u.id} />
                          <select name="role" defaultValue={u.role} className={`${inputCls} w-28`} aria-label={t("users.role")}><option value="STAFF">{t("role.STAFF")}</option><option value="ADMIN">{t("role.ADMIN")}</option></select>
                          <button className={btnGhost}>{t("common.save")}</button></form>)}
                    </td>
                    <td className={td}><Badge tone={u.isActive ? "green" : "gray"}>{u.isActive ? t("common.active") : t("common.inactive")}</Badge>{locked && <span className="ms-2"><Badge tone="red">{t("users.locked")}</Badge></span>}</td>
                    <td className={td}>
                      <div className="flex flex-col gap-2">
                        {!self && <form action={setUserActive}><input type="hidden" name="userId" value={u.id} /><input type="hidden" name="active" value={u.isActive ? "0" : "1"} /><button className={btnGhost}>{u.isActive ? t("users.deactivate") : t("users.activate")}</button></form>}
                        <details><summary className="cursor-pointer text-xs text-muted-foreground">{t("users.resetPassword")}</summary>
                          <form action={resetUserPassword} className="mt-2 flex gap-2"><input type="hidden" name="userId" value={u.id} />
                            <input name="password" type="password" minLength={12} required autoComplete="new-password" placeholder={t("users.newPassword")} className={`${inputCls} w-44`} dir="ltr" aria-label={t("users.newPassword")} />
                            <button className={btnGhost}>{t("common.save")}</button></form></details>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <form action={createStaff} className={`${card} h-fit space-y-4`}>
          <h2 className="text-lg font-bold text-navy">{t("users.new")}</h2>
          <Field label="Email" name="email" type="email" required dir="ltr" maxLength={254} />
          <Field label={t("common.name")} name="name" maxLength={80} />
          <div><label htmlFor="u-role" className="mb-1 block text-sm font-medium">{t("users.role")}</label>
            <select id="u-role" name="role" defaultValue="STAFF" className={inputCls}><option value="STAFF">{t("role.STAFF")}</option><option value="ADMIN">{t("role.ADMIN")}</option></select>
            <p className="mt-1 text-xs text-muted-foreground">{t("users.roleHint")}</p></div>
          <div><label htmlFor="u-pass" className="mb-1 block text-sm font-medium">{t("users.password")}</label>
            <input id="u-pass" name="password" type="password" minLength={12} required autoComplete="new-password" className={inputCls} dir="ltr" />
            <p className="mt-1 text-xs text-muted-foreground">{t("users.passwordHint")}</p></div>
          <SubmitButton pendingText={t("common.saving")}>{t("users.create")}</SubmitButton>
        </form>
      </div>
    </>
  );
}
