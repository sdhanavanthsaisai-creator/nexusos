import { NextResponse } from 'next/server';
import { isYoupiConfigured } from '@/lib/support/config';
import { fetchYoupiPayment } from '@/lib/support/youpi';
import { readYoupiContribution, recordYoupiEvent } from '@/lib/support/transactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** States the gateway never leaves. */
const TERMINAL = new Set(['SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED']);

/**
 * Returns the state of one contribution to the page the gateway redirects back
 * to.
 *
 * The return URL carries only the order id WE generated, so it is resolved back
 * to a payment id through the ledger. The gateway is then asked for the live
 * status, because the redirect can land before the webhook does. Payment ids are
 * UUIDs and reveal nothing on their own; no amount, email or bank reference is
 * returned that the caller did not already supply.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const paymentIdParam = (params.get('payment_id') ?? params.get('paymentId') ?? '').trim();
  const orderId = (params.get('order_id') ?? params.get('orderId') ?? '').trim();

  if (!paymentIdParam && !orderId) {
    return NextResponse.json({ error: 'missing_identifier' }, { status: 400 });
  }

  const stored = await readYoupiContribution({
    ...(paymentIdParam ? { paymentId: paymentIdParam } : {}),
    ...(!paymentIdParam && orderId ? { orderId } : {}),
  });

  const paymentId = paymentIdParam || stored?.paymentId || '';
  if (!paymentId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let status = stored?.status ?? 'INITIATED';
  let amountPaise = stored?.amountPaise ?? null;
  let source: 'gateway' | 'ledger' = 'ledger';

  if (isYoupiConfigured()) {
    const live = await fetchYoupiPayment(paymentId);
    if (live.ok) {
      status = live.value.status;
      amountPaise = live.value.amountPaise ?? amountPaise;
      source = 'gateway';

      // Persist only forward progress. A poll can race the webhook and a
      // cached gateway response can lag it, so a settled row is never moved
      // back to an in-flight state.
      const settled = stored ? TERMINAL.has(stored.status) : false;
      if (status !== stored?.status && !(settled && !TERMINAL.has(status))) {
        await recordYoupiEvent({
          paymentId,
          orderId: live.value.orderId || orderId || undefined,
          amountPaise,
          currency: live.value.currency,
          status,
        });
      }
    }
  }

  return NextResponse.json(
    { paymentId, status, amountPaise, source },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
