"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Props = { name: string; label: string; initial?: string | null };
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

/** Uploads straight to Cloudinary using a server-signed request, then stores the resulting URL in a hidden input. */
export function ImageUploader({ name, label, initial }: Props) {
  const t = useTranslations("adm");
  const [url, setUrl] = useState(initial ?? "");
  const [state, setState] = useState<"idle" | "uploading" | "error" | "unconfigured" | "type" | "size">("idle");

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!TYPES.includes(file.type)) return setState("type");
    if (file.size > MAX_BYTES) return setState("size");
    setState("uploading");
    try {
      const signRes = await fetch("/api/admin/uploads/sign", { method: "POST" });
      if (signRes.status === 501) return setState("unconfigured");
      if (!signRes.ok) return setState("error");
      const s = (await signRes.json()) as { cloudName: string; apiKey: string; signature: string; timestamp: number; folder: string; allowed_formats: string };
      const body = new FormData();
      body.append("file", file);
      body.append("api_key", s.apiKey);
      body.append("timestamp", String(s.timestamp));
      body.append("signature", s.signature);
      body.append("folder", s.folder);
      body.append("allowed_formats", s.allowed_formats);
      const up = await fetch(`https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`, { method: "POST", body });
      if (!up.ok) return setState("error");
      const data = (await up.json()) as { secure_url?: string };
      if (!data.secure_url) return setState("error");
      setUrl(data.secure_url);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <div>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-16 w-16 rounded-xl border border-border object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">—</div>
        )}
        <div className="space-y-1">
          <input type="file" accept={TYPES.join(",")} onChange={(e) => onFile(e.target.files?.[0])} className="block text-sm" aria-label={label} />
          {url && <button type="button" onClick={() => setUrl("")} className="text-xs text-destructive underline-offset-4 hover:underline">{t("upload.remove")}</button>}
        </div>
      </div>
      <p role="status" aria-live="polite" className={`mt-1 text-xs ${state === "idle" ? "text-muted-foreground" : "text-destructive"}`}>
        {state === "uploading" ? t("upload.uploading") : state === "idle" ? "" : t(`upload.${state}`)}
      </p>
    </div>
  );
}
