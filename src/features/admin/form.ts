export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const opt = (fd: FormData, k: string) => str(fd, k) || undefined;
export const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
/** Integer field: null when blank, NaN when invalid. */
export function intOrNull(fd: FormData, k: string): number | null {
  const v = str(fd, k);
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
}
export const HEX = /^#[0-9a-fA-F]{6}$/;
