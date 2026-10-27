import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { buildCsp } from "./src/lib/security/csp";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const isProd = process.env.NODE_ENV === "production";
const gaId = /^G-[A-Z0-9]{4,14}$/.test(process.env.NEXT_PUBLIC_GA_ID ?? "") ? process.env.NEXT_PUBLIC_GA_ID : undefined;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Strict policies only in production so local development is never blocked.
          ...(isProd
            ? [
                { key: "Content-Security-Policy", value: buildCsp({ gaId }) },
                { key: "Strict-Transport-Security", value: "max-age=31536000" },
              ]
            : []),
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
