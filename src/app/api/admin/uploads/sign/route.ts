import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ALLOWED_FORMATS, UPLOAD_FOLDER, cloudinaryConfigured, signUploadParams } from "@/lib/storage/cloudinary";

export const dynamic = "force-dynamic";

/** Signs a Cloudinary upload so the browser can upload directly. Staff/admin only; the API secret never leaves the server. */
export async function POST() {
  const session = await auth();
  const user = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, isActive: true } }) : null;
  if (!user || !user.isActive || (user.role !== "ADMIN" && user.role !== "STAFF")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!cloudinaryConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 501 });

  const timestamp = Math.floor(Date.now() / 1000);
  const params = { allowed_formats: ALLOWED_FORMATS, folder: UPLOAD_FOLDER, timestamp };
  return NextResponse.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    signature: signUploadParams(params, process.env.CLOUDINARY_API_SECRET as string),
    ...params,
  });
}
