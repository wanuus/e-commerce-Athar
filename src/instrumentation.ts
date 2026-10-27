import { captureException } from "@/lib/monitoring/sentry";

/** Next.js calls this for every unhandled server error (pages, actions, route handlers). */
export async function onRequestError(err: unknown, request: { path: string; method: string }, context: { routePath?: string }) {
  await captureException(err, { path: request.path, method: request.method, route: context.routePath });
}
