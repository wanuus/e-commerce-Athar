"use client";

import { useActionState, useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { addToCart, type AddState } from "@/features/cart/actions";
import { discountPercent, formatMoney } from "@/lib/utils/money";
import { NotifyForm } from "./NotifyForm";

export type PVVariant = { id: string; colorName: string; colorNameAr: string; colorHex: string; size: string; price: number; available: number };
export type PVImage = { url: string; alt: string; colorName: string | null };
type Props = { locale: "ar" | "en"; basePrice: number; compareAt: number | null; variants: PVVariant[]; images: PVImage[]; sizeOrder: string[]; maxQty: number; name: string };

export function ProductView({ locale, basePrice, compareAt, variants, images, sizeOrder, maxQty, name }: Props) {
  const t = useTranslations("product");
  const colors = useMemo(() => [...new Map(variants.map((v) => [v.colorName, v])).values()], [variants]);
  const sizes = useMemo(() => {
    const rank = (s: string) => (sizeOrder.includes(s) ? sizeOrder.indexOf(s) : 99);
    return [...new Set(variants.map((v) => v.size))].sort((a, b) => rank(a) - rank(b));
  }, [variants, sizeOrder]);

  const initialColor = colors.find((c) => variants.some((v) => v.colorName === c.colorName && v.available > 0))?.colorName ?? colors[0]?.colorName ?? "";
  const [color, setColor] = useState(initialColor);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(() => Math.max(0, images.findIndex((i) => i.colorName === initialColor)));
  const [state, action, pending] = useActionState<AddState, FormData>(addToCart, { status: "idle" });

  const find = (c: string, s: string) => variants.find((v) => v.colorName === c && v.size === s);
  const selected = size ? find(color, size) : undefined;
  const available = selected?.available ?? 0;
  const price = selected?.price ?? basePrice;
  const pct = !selected || selected.price === basePrice ? discountPercent(price, compareAt) : 0;

  // The gallery always shows every photo, so a photo linked to another color can be clicked to switch to that color.
  const gallery = images;
  const main = gallery[Math.min(imgIdx, Math.max(gallery.length - 1, 0))];

  /** Selects a color (keeps the size only if that size exists for the new color). Does not touch the photo. */
  const applyColor = (c: string) => {
    setColor(c);
    setQty(1);
    if (size && !((find(c, size)?.available ?? 0) > 0)) setSize(null);
  };

  /** Clicking a color swatch: select it AND jump to the first photo linked to that color. */
  const pickColor = (c: string) => {
    applyColor(c);
    const idx = images.findIndex((i) => i.colorName === c);
    if (idx >= 0 && images[imgIdx]?.colorName !== c) setImgIdx(idx);
  };

  /** Clicking a thumbnail: show it AND select the color it is linked to (photos for all colors leave the color alone). */
  const pickImage = (i: number) => {
    setImgIdx(i);
    const c = images[i]?.colorName;
    if (c && c !== color && colors.some((x) => x.colorName === c)) applyColor(c);
  };

  const stockText = !selected ? t("selectSize") : available <= 0 ? t("outOfStock") : available <= 5 ? t("onlyLeft", { count: available }) : t("inStock");
  const colorLabel = (c: PVVariant) => (locale === "en" ? c.colorName : c.colorNameAr);
  const canBuy = !!selected && available > 0;
  const step = "inline-flex h-10 w-10 items-center justify-center text-lg disabled:opacity-40";

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-warm">
          {main ? (
            <div key={main.url} className="animate-fade-in absolute inset-0"><Image src={main.url} alt={main.alt} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" /></div>
          ) : (
            <div className="flex h-full items-center justify-center text-8xl font-extrabold text-olive-light/60" aria-hidden>{name.charAt(0)}</div>
          )}
        </div>
        {gallery.length > 1 && (
          <ul className="mt-3 flex gap-2 overflow-x-auto">
            {gallery.map((im, i) => (
              <li key={im.url}>
                <button type="button" onClick={() => pickImage(i)} aria-label={`${name} ${i + 1}`} aria-current={i === imgIdx} className={`relative block h-20 w-16 overflow-hidden rounded-xl border ${i === imgIdx ? "border-navy" : "border-border"}`}>
                  <Image src={im.url} alt="" fill sizes="64px" className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="flex items-baseline gap-3 text-2xl">
          <span className="font-extrabold text-primary">{formatMoney(price, locale)}</span>
          {pct > 0 && compareAt && (
            <>
              <span className="text-base text-muted-foreground line-through">{formatMoney(compareAt, locale)}</span>
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">-{pct}%</span>
            </>
          )}
        </p>

        <fieldset className="mt-6">
          <legend className="mb-2 text-sm font-semibold">{t("color")}: <span className="font-normal text-muted-foreground">{colors.find((c) => c.colorName === color) && colorLabel(colors.find((c) => c.colorName === color)!)}</span></legend>
          <div className="flex flex-wrap gap-3">
            {colors.map((c) => (
              <button key={c.colorName} type="button" onClick={() => pickColor(c.colorName)} aria-pressed={c.colorName === color} aria-label={colorLabel(c)} title={colorLabel(c)}
                className={`h-9 w-9 rounded-full border border-border ring-offset-2 transition ${c.colorName === color ? "ring-2 ring-navy" : "hover:ring-2 hover:ring-olive-light"}`} style={{ backgroundColor: c.colorHex }} />
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="mb-2 text-sm font-semibold">{t("size")}</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const v = find(color, s);
              const ok = !!v && v.available > 0;
              return (
                <button key={s} type="button" disabled={!ok} aria-pressed={s === size} onClick={() => { setSize(s); setQty(1); }}
                  className={`h-11 min-w-12 rounded-full border px-4 text-sm transition ${s === size ? "border-navy bg-navy text-white" : "border-border bg-white hover:border-navy"} disabled:cursor-not-allowed disabled:text-muted-foreground/50 disabled:line-through disabled:hover:border-border`}>
                  {s}
                </button>
              );
            })}
          </div>
        </fieldset>

        <p className={`mt-4 text-sm ${selected && available > 0 ? "text-success" : "text-muted-foreground"}`} aria-live="polite">{stockText}</p>

        <form action={action} className="mt-5">
          <input type="hidden" name="variantId" value={selected?.id ?? ""} />
          <input type="hidden" name="quantity" value={qty} />
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-border" role="group" aria-label={t("quantity")}>
              <button type="button" className={step} disabled={qty <= 1} onClick={() => setQty(qty - 1)} aria-label="−">−</button>
              <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">{qty}</span>
              <button type="button" className={step} disabled={!canBuy || qty >= Math.min(available, maxQty)} onClick={() => setQty(qty + 1)} aria-label="+">+</button>
            </div>
            <button type="submit" name="intent" value="add" disabled={!canBuy || pending} className="h-12 flex-1 rounded-full bg-navy px-6 text-sm font-semibold text-white transition-colors hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-50">{t("addToCart")}</button>
            <button type="submit" name="intent" value="buy" disabled={!canBuy || pending} className="h-12 flex-1 rounded-full border border-navy px-6 text-sm font-semibold text-navy transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-50">{t("buyNow")}</button>
          </div>
          <div role="status" aria-live="polite" className="mt-3 text-sm">
            {state.status === "ok" && (
              <p className="text-success">{t("added")} <Link href="/cart" className="font-semibold underline underline-offset-4">{t("viewCart")}</Link></p>
            )}
            {state.status === "error" && <p className="text-destructive">{t(`errors.${state.code ?? "invalid"}`)}</p>}
          </div>
        </form>

        {selected && available <= 0 && <NotifyForm key={selected.id} variantId={selected.id} />}
      </div>
    </div>
  );
}