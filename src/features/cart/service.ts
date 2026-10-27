import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";

export const CART_COOKIE = "athar_cart";

export type CartLine = {
  itemId: string;
  variantId: string;
  productId: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  colorName: string;
  colorNameAr: string;
  colorHex: string;
  size: string;
  sku: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  available: number;
  status: "ok" | "low_stock" | "unavailable";
};

export async function loadCart() {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token) return null;
  const cart = await prisma.cart.findUnique({
    where: { sessionToken: token },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: { variant: { include: { product: { include: { images: { orderBy: { sortOrder: "asc" } } } } } } },
      },
    },
  });
  if (!cart) return null;

  const lines: CartLine[] = cart.items.map((it) => {
    const v = it.variant;
    const p = v.product;
    const available = Math.max(0, v.stock - v.reserved);
    const unitPrice = v.priceOverride ?? p.basePrice;
    const sellable = v.isActive && p.status === "ACTIVE" && available > 0;
    const img = p.images.find((i) => i.colorName === v.colorName) ?? p.images.find((i) => !i.colorName) ?? p.images[0];
    return {
      itemId: it.id,
      variantId: v.id,
      productId: p.id,
      slug: p.slug,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      colorName: v.colorName,
      colorNameAr: v.colorNameAr,
      colorHex: v.colorHex,
      size: v.size,
      sku: v.sku,
      image: img?.url ?? null,
      unitPrice,
      quantity: it.quantity,
      lineTotal: unitPrice * it.quantity,
      available,
      status: !sellable ? "unavailable" : it.quantity > available ? "low_stock" : "ok",
    };
  });
  return { cart, lines };
}

/** Creates the cart + cookie on first use. Only call from Server Actions / Route Handlers. */
export async function ensureCart() {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (token) {
    const existing = await prisma.cart.findUnique({ where: { sessionToken: token } });
    if (existing) return existing;
  }
  const fresh = crypto.randomBytes(24).toString("base64url");
  const cart = await prisma.cart.create({ data: { sessionToken: fresh } });
  jar.set(CART_COOKIE, fresh, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return cart;
}

export async function getCartCount(): Promise<number> {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token) return 0;
  const agg = await prisma.cartItem.aggregate({ _sum: { quantity: true }, where: { cart: { sessionToken: token } } });
  return agg._sum.quantity ?? 0;
}

export async function clearCart(cartId: string) {
  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { cartId } }),
    prisma.cart.update({ where: { id: cartId }, data: { discountCode: null } }),
  ]);
}
