/** Content-Security-Policy for production. Only the third parties the store really uses are allowed. */
export function buildCsp({ dev = false, gaId }: { dev?: boolean; gaId?: string } = {}): string {
  const ga = !!gaId;
  const join = (...parts: (string | false)[]) => parts.filter(Boolean).join(" ");
  return [
    "default-src 'self'",
    join("script-src 'self' 'unsafe-inline'", dev && "'unsafe-eval'", ga && "https://www.googletagmanager.com"),
    "style-src 'self' 'unsafe-inline'",
    join("img-src 'self' data: blob: https://res.cloudinary.com", ga && "https://www.google-analytics.com https://www.googletagmanager.com"),
    "font-src 'self' data:",
    join("connect-src 'self' https://api.cloudinary.com", ga && "https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com"),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].filter(Boolean).join("; ");
}
