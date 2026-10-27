"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { isUniqueViolation } from "@/features/orders/service";
import { audit, back, requireAdmin } from "./guard";
import { str } from "./form";

const PATH = "/admin/users";
const roleSchema = z.enum(["STAFF", "ADMIN"]);

async function otherActiveAdmins(exceptId: string) {
  return prisma.user.count({ where: { role: "ADMIN", isActive: true, id: { not: exceptId } } });
}

export async function createStaff(fd: FormData): Promise<void> {
  const actor = await requireAdmin();
  const email = z.string().trim().toLowerCase().email().max(254).safeParse(str(fd, "email"));
  const role = roleSchema.safeParse(str(fd, "role"));
  const password = str(fd, "password");
  if (!email.success) return back(PATH, "error", "invalid:email");
  if (!role.success) return back(PATH, "error", "invalid:role");
  if (password.length < 12 || password.length > 100) return back(PATH, "error", "invalid:password");
  try {
    const u = await prisma.user.create({
      data: { email: email.data, name: str(fd, "name").slice(0, 80) || null, role: role.data, passwordHash: await bcrypt.hash(password, 12) },
    });
    await audit(actor, "user.create", "User", u.id, { role: role.data });
  } catch (e) {
    if (isUniqueViolation(e)) return back(PATH, "error", "duplicate");
    throw e;
  }
  return back(PATH, "ok", "saved");
}

export async function setUserRole(fd: FormData): Promise<void> {
  const actor = await requireAdmin();
  const id = str(fd, "userId");
  const role = roleSchema.safeParse(str(fd, "role"));
  if (!role.success) return back(PATH, "error", "invalid:role");
  if (id === actor.id) return back(PATH, "error", "self");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return back(PATH, "error", "not_found");
  if (target.role === "ADMIN" && role.data !== "ADMIN" && (await otherActiveAdmins(id)) === 0) return back(PATH, "error", "last_admin");
  await prisma.user.update({ where: { id }, data: { role: role.data } });
  await audit(actor, "user.role", "User", id, { role: role.data });
  return back(PATH, "ok", "saved");
}

export async function setUserActive(fd: FormData): Promise<void> {
  const actor = await requireAdmin();
  const id = str(fd, "userId");
  const active = str(fd, "active") === "1";
  if (id === actor.id) return back(PATH, "error", "self");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return back(PATH, "error", "not_found");
  if (!active && target.role === "ADMIN" && (await otherActiveAdmins(id)) === 0) return back(PATH, "error", "last_admin");
  await prisma.user.update({ where: { id }, data: { isActive: active, failedLogins: 0, lockedUntil: null } });
  await audit(actor, active ? "user.activate" : "user.deactivate", "User", id);
  return back(PATH, "ok", "saved");
}

export async function resetUserPassword(fd: FormData): Promise<void> {
  const actor = await requireAdmin();
  const id = str(fd, "userId");
  const password = str(fd, "password");
  if (password.length < 12 || password.length > 100) return back(PATH, "error", "invalid:password");
  await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 12), failedLogins: 0, lockedUntil: null } });
  await audit(actor, "user.password_reset", "User", id);
  return back(PATH, "ok", "saved");
}
