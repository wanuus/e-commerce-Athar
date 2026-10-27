import crypto from "node:crypto";

export const UPLOAD_FOLDER = "athar";
export const ALLOWED_FORMATS = "jpg,jpeg,png,webp";

/** Cloudinary signed-upload signature: SHA-1 of the alphabetically sorted params + API secret. */
export function signUploadParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");
}

/** Only images that live in OUR Cloudinary account may be stored in the database. */
export function isCloudinaryUrl(raw: string, cloudName: string | undefined): boolean {
  if (!cloudName) return false;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && u.hostname === "res.cloudinary.com" && u.pathname.startsWith(`/${cloudName}/`);
  } catch {
    return false;
  }
}

export function cloudinaryConfigured(): boolean {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}
