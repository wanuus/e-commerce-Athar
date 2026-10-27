import type { Role } from "@prisma/client";
import { getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "@/i18n/navigation";

export type Actor = { id: string; role: Role; email: string };

/**
 * Server-side access control for every admin page AND every admin Server Action.
 * The role is read from the database (not the session cookie), so deactivating a user
 * or changing a role takes effect immediately.
 */
export async function requireStaff(): Promise<Actor> {
  const session = await auth();
  const locale = await getLocale();
  if (!session?.user?.id) return redirect({ href: "/admin/login", locale });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true, role: true, isActive: true } });
  if (!user || !user.isActive || (user.role !== "ADMIN" && user.role !== "STAFF")) return redirect({ href: "/admin/login", locale });
  return { id: user.id, role: user.role, email: user.email };
}

export async function requireAdmin(): Promise<Actor> {
  const actor = await requireStaff();
  if (actor.role !== "ADMIN") return redirect({ href: "/admin/dashboard", locale: await getLocale() });
  return actor;
}

export async function audit(actor: Actor, action: string, entity: string, entityId?: string, meta?: Record<string, string | number | boolean | null>) {
  await prisma.auditLog.create({ data: { actorId: actor.id, action, entity, entityId, meta: meta ?? undefined } });
}

/** Redirects back to an admin page with a one-time message in the URL (?ok=... or ?error=...). */
export async function back(path: string, kind: "ok" | "error", code = "1"): Promise<never> {
  const sep = path.includes("?") ? "&" : "?";
  return redirect({ href: `${path}${sep}${kind}=${encodeURIComponent(code)}`, locale: await getLocale() });
}

/** Parses an EGP amount typed by an admin ("799" or "799.50") into piasters. */
export function egpToMinor(v: FormDataEntryValue | null | undefined): number | null {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
}
