import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  CONTRIBUTION,
  amountFromPreset,
  amountToPaise,
  isYoupiConfigured,
  normaliseCustomAmount,
  supportReturnOrigin,
} from '@/lib/support/config';
import { createYoupiPayment } from '@/lib/support/youpi';
import { recordYoupiOrderCreated } from '@/lib/support/transactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface OrderBody {
  presetId?: string;
  amountInr?: number | string;
  name?: string;
  email?: string;
}

/**
 * Creates a YOUPI PG payment session for a voluntary contribution.
 *
 * The amount is resolved here, never trusted from the browser, and is bounded
 * by the same presets as the Razorpay path — a tampered request cannot open a
 * ₹25,000 UPI session by editing JSON. The gateway returns a hosted checkout
 * URL; the browser is redirected there and never sees the merchant id.
 */
export async function POST(request: Request) {
  if (!isYoupiConfigured()) {
    return NextResponse.json(
      {
        error: 'contributions_unavailable',
        message: 'UPI contributions are not switched on yet. Please use the card option.',
      },
      { status: 503 },
    );
  }

  let body: OrderBody;
  try {
    body = (await request.json()) as OrderBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const presetAmount = body.presetId ? amountFromPreset(body.presetId) : null;
  const amountInr = presetAmount ?? normaliseCustomAmount(body.amountInr);

  if (!amountInr) {
    return NextResponse.json(
      {
        error: 'invalid_amount',
        message: `Choose a suggested amount or enter between ₹${CONTRIBUTION.minAmountInr} and ₹${CONTRIBUTION.maxAmountInr}.`,
      },
      { status: 400 },
    );
  }

  const amountPaise = amountToPaise(amountInr);
  // Short, unique, and prefixed so a row in the gateway's admin panel is
  // recognisable as a Study Hall contribution rather than a bare number.
  const orderId = `studyhall_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
  const email = body.email?.slice(0, 200);
  const name = body.name?.slice(0, 100);

  const result = await createYoupiPayment({
    orderId,
    amountInr,
    // We carry our own order id back, because the gateway only echoes this URL
    // and the return page has no other way to know which payment it belongs to.
    returnUrl: `${supportReturnOrigin()}/support/complete?order_id=${encodeURIComponent(orderId)}`,
    description: CONTRIBUTION.checkoutDescription,
    idempotencyKey: orderId,
    ...(email ? { email } : {}),
    ...(name ? { name } : {}),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.code, message: result.message },
      { status: result.status },
    );
  }

  // Bookkeeping only: a missing service-role key must not block checkout. The
  // gateway is the authority on whether money arrived.
  await recordYoupiOrderCreated({
    paymentId: result.value.paymentId,
    orderId,
    amountPaise,
    currency: result.value.currency,
    status: result.value.status,
    email,
  });

  return NextResponse.json({
    paymentId: result.value.paymentId,
    orderId,
    amountPaise,
    currency: result.value.currency,
    checkoutUrl: result.value.checkoutUrl,
  });
}
