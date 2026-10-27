import { prisma } from "@/lib/db/prisma";
import { cancelUnpaidOrder } from "@/features/orders/service";

export const dynamic = "force-dynamic";

/** Releases stock held by card orders that were never paid. Called by Vercel Cron (see vercel.json). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });

  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  const stale = await prisma.order.findMany({
    where: { paymentMethod: "CARD", status: "PENDING", paymentStatus: { in: ["PENDING", "PROCESSING", "FAILED"] }, createdAt: { lt: cutoff } },
    select: { id: true },
    take: 200,
  });
  let cancelled = 0;
  for (const o of stale) if (await cancelUnpaidOrder(o.id, "payment_not_completed_in_time")) cancelled++;
  return Response.json({ checked: stale.length, cancelled });
}
