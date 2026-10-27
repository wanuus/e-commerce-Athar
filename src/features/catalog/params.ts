export const SORTS = ["featured", "newest", "price_asc", "price_desc", "best", "alpha"] as const;
export type SortKey = (typeof SORTS)[number];

export type ShopParams = {
  q?: string;
  category?: string;
  collection?: string;
  minPrice?: number; // EGP
  maxPrice?: number; // EGP
  sizes: string[];
  colors: string[];
  inStock: boolean;
  sort: SortKey;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;
const arr = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const first = (v: string | string[] | undefined) => arr(v)[0];
const num = (v: string | undefined) => {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export function parseShopParams(sp: RawParams): ShopParams {
  const sort = first(sp.sort);
  const page = Number(first(sp.page));
  return {
    q: first(sp.q)?.trim().slice(0, 100) || undefined,
    category: first(sp.category)?.slice(0, 80) || undefined,
    collection: first(sp.collection)?.slice(0, 80) || undefined,
    minPrice: num(first(sp.minPrice)),
    maxPrice: num(first(sp.maxPrice)),
    sizes: arr(sp.size).slice(0, 10),
    colors: arr(sp.color).slice(0, 10),
    inStock: first(sp.inStock) === "1",
    sort: (SORTS as readonly string[]).includes(sort ?? "") ? (sort as SortKey) : "featured",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}
