import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (token && token.length < 64) {
    await prisma.newsletterSubscriber.updateMany({ where: { token }, data: { isActive: false } });
  }
  // Same response either way so tokens cannot be probed.
  return new NextResponse("You have been unsubscribed. / تم إلغاء الاشتراك.", {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
