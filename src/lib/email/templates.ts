import { formatMoney } from "@/lib/utils/money";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

type Data = {
  locale: "ar" | "en";
  brandName: string;
  orderNumber: string;
  orderUrl: string;
  firstName: string;
  paymentMethod: "COD" | "CARD";
  items: { name: string; colorName: string; size: string; quantity: number; lineTotal: number }[];
  subtotal: number;
  discountTotal: number;
  shippingFee: number;
  total: number;
};

const T = {
  ar: {
    subject: (n: string) => `تأكيد طلبك ${n}`,
    hi: (n: string) => `شكرًا ${n}، استلمنا طلبك!`,
    number: "رقم الطلب",
    sub: "المجموع الفرعي", disc: "الخصم", ship: "الشحن", total: "الإجمالي",
    cod: "الدفع عند الاستلام: يرجى تجهيز المبلغ عند التسليم.",
    card: "تم تأكيد الدفع بالبطاقة.",
    view: "عرض الطلب",
  },
  en: {
    subject: (n: string) => `Your order ${n} is confirmed`,
    hi: (n: string) => `Thank you ${n}, we received your order!`,
    number: "Order number",
    sub: "Subtotal", disc: "Discount", ship: "Shipping", total: "Total",
    cod: "Cash on delivery: please have the amount ready when your order arrives.",
    card: "Your card payment was confirmed.",
    view: "View order",
  },
} as const;

export function orderConfirmationEmail(d: Data) {
  const t = T[d.locale];
  const m = (v: number) => esc(formatMoney(v, d.locale));
  const rows = d.items
    .map((i) => `<tr><td style="padding:6px 0">${esc(i.name)} · ${esc(i.colorName)} / ${esc(i.size)} × ${i.quantity}</td><td style="padding:6px 0;text-align:end">${m(i.lineTotal)}</td></tr>`)
    .join("");
  const html = `<!doctype html><html lang="${d.locale}" dir="${d.locale === "ar" ? "rtl" : "ltr"}"><body style="margin:0;background:#f8f9f6;font-family:Arial,Tahoma,sans-serif;color:#202820">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#fff;border-radius:16px;padding:28px">
<div style="font-size:34px;font-weight:800;color:#1f3044;margin-bottom:16px">آثر</div>
<h1 style="font-size:18px;margin:0 0 8px">${esc(t.hi(d.firstName))}</h1>
<p style="margin:0 0 16px;color:#667066">${t.number}: <strong>${esc(d.orderNumber)}</strong></p>
<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
<tr><td style="padding-top:12px;border-top:1px solid #e5e9e2">${t.sub}</td><td style="padding-top:12px;border-top:1px solid #e5e9e2;text-align:end">${m(d.subtotal)}</td></tr>
${d.discountTotal > 0 ? `<tr><td>${t.disc}</td><td style="text-align:end">-${m(d.discountTotal)}</td></tr>` : ""}
<tr><td>${t.ship}</td><td style="text-align:end">${m(d.shippingFee)}</td></tr>
<tr><td style="padding-top:8px;font-weight:700">${t.total}</td><td style="padding-top:8px;text-align:end;font-weight:700">${m(d.total)}</td></tr></table>
<p style="margin:16px 0;font-size:14px">${d.paymentMethod === "COD" ? t.cod : t.card}</p>
<a href="${esc(d.orderUrl)}" style="display:inline-block;background:#1f3044;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px">${t.view}</a>
</div></div></body></html>`;
  return { subject: t.subject(d.orderNumber), html };
}

const wrap = (locale: "ar" | "en", inner: string) => `<!doctype html><html lang="${locale}" dir="${locale === "ar" ? "rtl" : "ltr"}"><body style="margin:0;background:#f8f9f6;font-family:Arial,Tahoma,sans-serif;color:#202820">
<div style="max-width:560px;margin:0 auto;padding:24px"><div style="background:#fff;border-radius:16px;padding:28px">
<div style="font-size:34px;font-weight:800;color:#1f3044;margin-bottom:16px">آثر</div>${inner}</div></div></body></html>`;

const button = (href: string, label: string) =>
  `<a href="${esc(href)}" style="display:inline-block;background:#1f3044;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px">${esc(label)}</a>`;

export function backInStockEmail(d: { locale: "ar" | "en"; productName: string; variantLabel: string; url: string }) {
  const ar = d.locale === "ar";
  return {
    subject: ar ? `عاد للتوفر: ${d.productName}` : `Back in stock: ${d.productName}`,
    html: wrap(d.locale, `<h1 style="font-size:18px;margin:0 0 8px">${esc(d.productName)}</h1>
<p style="color:#667066">${esc(d.variantLabel)}</p>
<p>${ar ? "المنتج الذي طلبت إشعارًا عنه متوفر الآن. الكمية محدودة." : "The item you asked about is available again. Quantities are limited."}</p>
${button(d.url, ar ? "تسوّق الآن" : "Shop now")}`),
  };
}

export function shippedEmail(d: { locale: "ar" | "en"; orderNumber: string; orderUrl: string; carrier: string | null; trackingNumber: string | null }) {
  const ar = d.locale === "ar";
  const tracking = d.trackingNumber ? `<p>${ar ? "رقم التتبع" : "Tracking number"}: <strong dir="ltr">${esc(d.trackingNumber)}</strong>${d.carrier ? ` (${esc(d.carrier)})` : ""}</p>` : "";
  return {
    subject: ar ? `تم شحن طلبك ${d.orderNumber}` : `Your order ${d.orderNumber} has shipped`,
    html: wrap(d.locale, `<h1 style="font-size:18px;margin:0 0 8px">${ar ? "طلبك في الطريق إليك" : "Your order is on its way"}</h1>
<p style="color:#667066">${ar ? "رقم الطلب" : "Order number"}: <strong>${esc(d.orderNumber)}</strong></p>${tracking}
${button(d.orderUrl, ar ? "عرض الطلب" : "View order")}`),
  };
}
