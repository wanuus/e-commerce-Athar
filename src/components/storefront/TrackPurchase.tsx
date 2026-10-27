"use client";

import { useEffect } from "react";

type Item = { sku: string; name: string; price: number; quantity: number };
type Gtag = (...args: unknown[]) => void;

/** Sends a GA4 "purchase" event once per order, only if analytics was accepted (window.gtag exists). No personal data is sent. */
export function TrackPurchase({ orderNumber, total, items }: { orderNumber: string; total: number; items: Item[] }) {
  useEffect(() => {
    const key = `ga_purchase_${orderNumber}`;
    const send = (): boolean => {
      const gtag = (window as unknown as { gtag?: Gtag }).gtag;
      if (!gtag) return false;
      try {
        if (sessionStorage.getItem(key)) return true;
        sessionStorage.setItem(key, "1");
      } catch {}
      gtag("event", "purchase", {
        transaction_id: orderNumber,
        value: total / 100,
        currency: "EGP",
        items: items.map((i) => ({ item_id: i.sku, item_name: i.name, price: i.price / 100, quantity: i.quantity })),
      });
      return true;
    };
    if (send()) return;
    const id = setInterval(() => send() && clearInterval(id), 800);
    const stop = setTimeout(() => clearInterval(id), 10000);
    return () => {
      clearInterval(id);
      clearTimeout(stop);
    };
  }, [orderNumber, total, items]);
  return null;
}
