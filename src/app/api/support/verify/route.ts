import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { razorpayKeySecret } from '@/lib/support/config';
import { recordPaymentVerified } from '@/lib/support/transactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Compares two hex digests without leaking how much of the value matched.
 * Buffers of unequal length are rejected before timingSafeEqual, which throws
 * on a length mismatch.
 */
function safeEqualHex(expected: string, received: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Verifies the checkout signature returned by Razorpay.
 *
 * Razorpay signs `order_id|payment_id` with the key secret. A contribution
 * unlocks nothing, so this does not grant an entitlement — it exists so the
 * page can say "thank you" truthfully instead of trusting the browser.
 */
export async function POST(request: Request) {
  const secret = razorpayKeySecret();
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  }

  let body: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const orderId = body.razorpay_order_id ?? '';
  const paymentId = body.razorpay_payment_id ?? '';
  const signature = body.razorpay_signature ?? '';

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
  }

  const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

  if (!safeEqualHex(expected, signature)) {
    console.warn('[support] signature mismatch for order', orderId);
    return NextResponse.json({ ok: false, error: 'signature_mismatch' }, { status: 400 });
  }

  await recordPaymentVerified({ orderId, paymentId });

  return NextResponse.json({ ok: true, paymentId });
}
