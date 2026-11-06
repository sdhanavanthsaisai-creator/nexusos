import { NextResponse } from 'next/server';
import {
  CONTRIBUTION,
  amountFromPreset,
  isRazorpayConfigured,
  normaliseCustomAmount,
} from '@/lib/support/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface OrderBody {
  presetId?: string;
  amountInr?: number | string;
  name?: string;
  email?: string;
}

/**
 * Creates a Razorpay order for a voluntary contribution.
 *
 * The amount is resolved and validated here — never trusted from the browser —
 * so a tampered request cannot charge an arbitrary amount or turn into a refund
 * vector.
 */
export async function POST(request: Request) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      {
        error: 'contributions_unavailable',
        message: 'Contributions are not switched on yet. Please try again later.',
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

  const keyId = process.env.RAZORPAY_KEY_ID as string;
  const keySecret = process.env.RAZORPAY_KEY_SECRET as string;
  const receipt = `support_${Date.now().toString(36)}`;

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountInr * 100,
      currency: CONTRIBUTION.currency,
      receipt,
      notes: {
        purpose: CONTRIBUTION.purpose,
        source: 'studyhall-support-page',
      },
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('[support] Razorpay order failed', response.status, detail.slice(0, 500));
    return NextResponse.json(
      { error: 'order_failed', message: 'Could not start the payment. Please try again in a moment.' },
      { status: 502 },
    );
  }

  const order = (await response.json()) as { id: string; amount: number; currency: string };

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId,
    receipt,
    prefill: {
      name: (body.name ?? '').slice(0, 100),
      email: (body.email ?? '').slice(0, 200),
    },
    description: CONTRIBUTION.checkoutDescription,
  });
}
