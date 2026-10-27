import type { ShopParams } from "@/features/catalog/params";

type DropKey = "q" | "category" | "collection" | "minPrice" | "maxPrice" | "size" | "color" | "inStock";

/** Rebuilds the shop query string so filters live in the URL (back/forward + shareable links work). */
export function shopQuery(p: ShopParams, opts: { page?: number; drop?: { key: DropKey; value?: string } } = {}): string {
  const u = new URLSearchParams();
  const skip = (key: DropKey, value?: string) => opts.drop?.key === key && (opts.drop.value === undefined || opts.drop.value === value);
  if (p.q && !skip("q")) u.set("q", p.q);
  if (p.category && !skip("category")) u.set("category", p.category);
  if (p.collection && !skip("collection")) u.set("collection", p.collection);
  if (p.minPrice !== undefined && !skip("minPrice")) u.set("minPrice", String(p.minPrice));
  if (p.maxPrice !== undefined && !skip("maxPrice")) u.set("maxPrice", String(p.maxPrice));
  for (const s of p.sizes) if (!skip("size", s)) u.append("size", s);
  for (const c of p.colors) if (!skip("color", c)) u.append("color", c);
  if (p.inStock && !skip("inStock")) u.set("inStock", "1");
  if (p.sort !== "featured") u.set("sort", p.sort);
  if (opts.page && opts.page > 1) u.set("page", String(opts.page));
  const s = u.toString();
  return s ? `?${s}` : "";
}
