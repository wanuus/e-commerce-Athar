import type { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function readPaymentStatus(paymentId: string): Promise<PaymentStatus> {
  const p = await prisma.payment.findUnique({ where: { id: paymentId }, select: { status: true } });
  if (!p) throw new Error("payment_not_found");
  return p.status;
}
