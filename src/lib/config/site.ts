export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}
export const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
export const PAGE_SIZE = 12;
export const MAX_LINE_QTY = 20;
