import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils/cn";

export const inputCls = "h-10 w-full rounded-xl border border-border bg-white px-3 text-sm";
export const areaCls = "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm";
export const btnPrimary = "inline-flex h-10 items-center justify-center rounded-full bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-soft disabled:opacity-60";
export const btnGhost = "inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm hover:bg-warm";
export const btnDanger = "inline-flex h-9 items-center justify-center rounded-full border border-destructive px-4 text-sm font-semibold text-destructive hover:bg-destructive/10";
export const card = "rounded-2xl bg-white p-6 shadow-soft";
export const th = "px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground";
export const td = "px-3 py-3 align-middle text-sm";

export function Field(props: {
  label: string; name: string; defaultValue?: string | number | null; type?: string; required?: boolean; hint?: string;
  dir?: "ltr" | "rtl"; step?: string; min?: number; max?: number; maxLength?: number; className?: string;
}) {
  const { label, name, defaultValue, type = "text", required, hint, dir, step, min, max, maxLength, className } = props;
  return (
    <div className={className}>
      <label htmlFor={`f-${name}`} className="mb-1 block text-sm font-medium">{label}{required && <span className="text-destructive"> *</span>}</label>
      <input id={`f-${name}`} name={name} type={type} defaultValue={defaultValue ?? ""} required={required} dir={dir} step={step} min={min} max={max} maxLength={maxLength} className={inputCls} />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TextArea(props: { label: string; name: string; defaultValue?: string | null; rows?: number; dir?: "ltr" | "rtl"; className?: string; hint?: string }) {
  return (
    <div className={props.className}>
      <label htmlFor={`f-${props.name}`} className="mb-1 block text-sm font-medium">{props.label}</label>
      <textarea id={`f-${props.name}`} name={props.name} rows={props.rows ?? 3} defaultValue={props.defaultValue ?? ""} dir={props.dir} className={areaCls} />
      {props.hint && <p className="mt-1 text-xs text-muted-foreground">{props.hint}</p>}
    </div>
  );
}

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "green" | "red" | "amber" | "blue" }) {
  const tones = {
    gray: "bg-warm text-muted-foreground",
    green: "bg-success/15 text-success",
    red: "bg-destructive/15 text-destructive",
    amber: "bg-[#f5e9c8] text-[#8a6a10]",
    blue: "bg-navy/10 text-navy",
  } as const;
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>{children}</span>;
}

export function orderTone(s: string): "gray" | "green" | "red" | "amber" | "blue" {
  if (s === "DELIVERED" || s === "PAID") return "green";
  if (s === "CANCELLED" || s === "FAILED" || s === "RETURNED") return "red";
  if (s === "PENDING") return "amber";
  return "blue";
}

/** One-time banner driven by ?ok=... / ?error=... set by admin Server Actions. */
export async function Flash({ ok, error }: { ok?: string; error?: string }) {
  const t = await getTranslations("adm");
  if (!ok && !error) return null;
  if (ok) {
    const [code, arg] = ok.split(":");
    const known = ["saved", "created", "deleted", "image_added", "image_deleted", "generated", "status_updated", "cod_collected", "refund_recorded"];
    return <p role="status" className="animate-slide-down mb-6 rounded-2xl bg-success/10 p-4 text-sm text-success">{known.includes(code ?? "") ? t(`flash.ok.${code}`, { count: arg ?? "" }) : t("flash.ok.saved")}</p>;
  }
  const [code, arg] = (error ?? "").split(":");
  const known = ["invalid", "duplicate", "needs_variant", "below_reserved", "not_found", "invalid_transition", "not_allowed", "self", "last_admin", "last_zone"];
  return <p role="alert" className="animate-slide-down mb-6 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">{known.includes(code ?? "") ? t(`flash.error.${code}`, { field: arg ?? "" }) : t("flash.error.generic")}</p>;
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-extrabold text-navy">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
