import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const csvSafe = (v: string) => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""');

export async function GET() {
  const session = await auth();
  const user = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, isActive: true } }) : null;
  if (!user || !user.isActive || user.role !== "ADMIN") return new Response("unauthorized", { status: 401 });
  const rows = await prisma.newsletterSubscriber.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" } });
  const body = ["email,subscribed_at", ...rows.map((r) => `"${csvSafe(r.email)}",${r.createdAt.toISOString()}`)].join("\n");
  return new Response(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="subscribers.csv"' } });
}
