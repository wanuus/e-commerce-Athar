"use server";

import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { audit, back, requireStaff } from "./guard";
import { bool, str } from "./form";
import { markCodCollected, markRefunded, transitionOrder } from "./order-service";

const STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED"];

export async function changeOrderStatus(fd: FormData): Promise<void> {
  const actor = await requireStaff();
  const orderId = str(fd, "orderId");
  const path = `/admin/orders/${orderId}`;
  const to = str(fd, "to") as OrderStatus;
  if (!STATUSES.includes(to)) return back(path, "error", "invalid_transition");
  const r = await transitionOrder(orderId, to, actor, { restock: bool(fd, "restock") });
  return back(path, r === "ok" ? "ok" : "error", r === "ok" ? "status_updated" : r);
}

export async function collectCod(fd: FormData): Promise<void> {
  const actor = await requireStaff();
  const orderId = str(fd, "orderId");
  const r = await markCodCollected(orderId, actor);
  return back(`/admin/orders/${orderId}`, r === "ok" ? "ok" : "error", r === "ok" ? "cod_collected" : r);
}

export async function recordRefund(fd: FormData): Promise<void> {
  const actor = await requireStaff();
  const orderId = str(fd, "orderId");
  const r = await markRefunded(orderId, actor);
  return back(`/admin/orders/${orderId}`, r === "ok" ? "ok" : "error", r === "ok" ? "refund_recorded" : r);
}

export async function saveTracking(fd: FormData): Promise<void> {
  const actor = await requireStaff();
  const orderId = str(fd, "orderId");
  const carrier = str(fd, "carrier").slice(0, 60);
  const number = str(fd, "trackingNumber").slice(0, 100);
  await prisma.order.update({ where: { id: orderId }, data: { trackingCarrier: carrier || null, trackingNumber: number || null } });
  await prisma.orderEvent.create({ data: { orderId, type: "tracking_updated", message: number || null, actorId: actor.id } });
  await audit(actor, "order.tracking", "Order", orderId);
  return back(`/admin/orders/${orderId}`, "ok", "saved");
}

export async function saveAdminNote(fd: FormData): Promise<void> {
  const actor = await requireStaff();
  const orderId = str(fd, "orderId");
  await prisma.order.update({ where: { id: orderId }, data: { adminNote: str(fd, "adminNote").slice(0, 1000) || null } });
  await audit(actor, "order.note", "Order", orderId);
  return back(`/admin/orders/${orderId}`, "ok", "saved");
}
