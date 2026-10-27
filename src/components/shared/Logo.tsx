import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";

const tones = {
  navy: "text-navy",
  olive: "text-olive-deep",
  white: "text-white",
  black: "text-black",
} as const;

type Props = { tone?: keyof typeof tones; className?: string; href?: string | null; logoUrl?: string | null; name?: string };

/**
 * The wordmark is ALWAYS Arabic (آثر), regardless of the selected language.
 * Currently typeset in Cairo ExtraBold: a font-based wordmark, NOT a custom-drawn logo.
 * If the admin uploads a logo (brand.logoUrl) that image is used instead.
 */
export function Logo({ tone = "navy", className, href = "/", logoUrl, name = "آثر" }: Props) {
  const mark = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt={name} className={cn("h-8 w-auto", className)} />
  ) : (
    <span lang="ar" dir="rtl" className={cn("font-extrabold leading-none tracking-normal text-3xl", tones[tone], className)}>
      {name}
    </span>
  );
  if (href === null) return mark;
  return (
    <Link href={href} aria-label={name} className="inline-flex items-center">
      {mark}
    </Link>
  );
}
