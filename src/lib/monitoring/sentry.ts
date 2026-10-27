/**
 * Minimal Sentry-compatible error reporting (no SDK): posts server errors to your Sentry project when SENTRY_DSN is set.
 * It sends the error message, stack and request path (order links are masked), never cookies, bodies or form data.
 * For full Sentry features (performance, source maps, browser errors) the official @sentry/nextjs SDK can replace this later.
 */
export type ParsedDsn = { endpoint: string; key: string };

export function parseDsn(dsn: string | undefined): ParsedDsn | null {
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    const project = u.pathname.split("/").filter(Boolean).pop();
    if (!u.username || !project || !/^\d+$/.test(project) || !/^https?:$/.test(u.protocol)) return null;
    return { endpoint: `${u.protocol}//${u.host}/api/${project}/store/`, key: u.username };
  } catch {
    return null;
  }
}

/** Removes query strings and the secret order-link token from a path before it leaves the server. */
export function sanitizePath(path: string): string {
  return path.split("?")[0]!.replace(/\/orders\/[^/]+/, "/orders/:token");
}

export async function captureException(err: unknown, ctx: { path?: string; method?: string; route?: string } = {}): Promise<void> {
  const dsn = parseDsn(process.env.SENTRY_DSN);
  if (!dsn) return;
  const e = err instanceof Error ? err : new Error(String(err));
  const event = {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: Date.now() / 1000,
    platform: "node",
    level: "error",
    environment: process.env.NODE_ENV,
    exception: { values: [{ type: e.name, value: e.message.slice(0, 500) }] },
    extra: { stack: (e.stack ?? "").slice(0, 4000) },
    request: ctx.path ? { url: sanitizePath(ctx.path), method: ctx.method } : undefined,
    tags: { route: ctx.route ?? "unknown" },
  };
  try {
    await fetch(dsn.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", "x-sentry-auth": `Sentry sentry_version=7, sentry_client=athar-store/1.0, sentry_key=${dsn.key}` },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    /* monitoring must never break a request */
  }
}
