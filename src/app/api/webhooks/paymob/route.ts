import { applyPaymentEvent } from "@/features/orders/payment-service";
import { getProviderByName } from "@/lib/payments";
import { InvalidWebhookError } from "@/lib/payments/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const provider = getProviderByName("paymob");
  if (!provider) return new Response("not configured", { status: 404 });

  let event;
  try {
    event = await provider.handleWebhook(req);
  } catch (e) {
    // Bad signature => reject. We never act on an unauthenticated callback.
    return new Response("invalid", { status: e instanceof InvalidWebhookError ? 401 : 400 });
  }
  // Throws on real processing errors -> 500 -> Paymob retries. Duplicates/unknowns return 200.
  const result = await applyPaymentEvent("paymob", event);
  return Response.json({ result });
}
