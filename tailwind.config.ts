import type { Config } from "tailwindcss";

/** Colors come from CSS variables (editable in Admin -> Settings -> Brand) and still support `/30` opacity. */
const c = (name: string) =>
  (({ opacityValue }: { opacityValue?: string }) =>
    opacityValue === undefined ? `var(${name})` : `color-mix(in srgb, var(${name}) calc(${opacityValue} * 100%), transparent)`) as unknown as string;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: c("--background"),
        warm: c("--warm"),
        foreground: c("--foreground"),
        "muted-foreground": c("--muted-foreground"),
        border: c("--border"),
        ring: c("--ring"),
        destructive: c("--destructive"),
        success: c("--success"),
        primary: { DEFAULT: c("--primary"), foreground: c("--primary-foreground") },
        secondary: { DEFAULT: c("--secondary"), foreground: c("--secondary-foreground") },
        accent: c("--accent"),
        olive: { light: c("--olive-light"), DEFAULT: c("--olive"), deep: c("--olive-deep") },
        navy: { DEFAULT: c("--navy"), soft: c("--navy-soft") },
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.25rem" },
      boxShadow: { soft: "0 1px 2px rgba(32,40,32,.04), 0 8px 24px rgba(32,40,32,.06)" },
    },
  },
  plugins: [],
};
export default config;
