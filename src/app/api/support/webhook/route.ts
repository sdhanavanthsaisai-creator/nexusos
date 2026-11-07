import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { recordPaymentEvent } from '@/lib/support/transactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface WebhookPayment {
  id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  error_code?: string | null;
  error_description?: string | null;
}

interface WebhookEvent {
  event?: string;
  payload?: { payment?: { entity?: WebhookPayment } };
}

/**
 * Razorpay webhook endpoint.
 *
 * Configure it in Dashboard → Settings → Webhooks with the events
 * `payment.captured` and `payment.failed`, using the same secret you put in
 * RAZORPAY_WEBHOOK_SECRET. The signature is computed over the raw request body,
 * which is why this handler reads text() rather than json().
 *
 * Contribution state is stored in `public.support_contributions`, keyed by the
 * Razorpay order id and merged on every event, so a retried delivery is
 * idempotent and can never roll a captured payment back to failed. Reply 2xx
 * quickly: Razorpay retries any non-2xx response.
 */
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    // Without a secret we cannot tell a real webhook from a forged one.
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  }

  const raw = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';

  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ ok: false, error: 'invalid_signature' }, { status: 400 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(raw) as WebhookEvent;
  } catch {
    // Signature already proved Razorpay sent this, but an unparsable body is not
    // something a retry would fix either.
    console.error('[support] webhook body was not valid JSON');
    return NextResponse.json({ ok: true, handled: false });
  }

  const type = event.event ?? '';
  const payment = event.payload?.payment?.entity;

  if (type !== 'payment.captured' && type !== 'payment.failed') {
    // Other subscribed events are acknowledged and ignored.
    return NextResponse.json({ ok: true, handled: false });
  }

  const orderId = payment?.order_id ?? '';
  const paymentId = payment?.id ?? '';

  if (!orderId || !paymentId) {
    console.error('[support] webhook missing payment identifiers', type);
    return NextResponse.json({ ok: true, handled: false });
  }

  const persisted = await recordPaymentEvent({
    orderId,
    paymentId,
    amountPaise: typeof payment?.amount === 'number' ? payment.amount : undefined,
    currency: payment?.currency,
    status: type === 'payment.captured' ? 'captured' : 'failed',
    reason:
      type === 'payment.failed'
        ? [payment?.error_code, payment?.error_description].filter(Boolean).join(': ') || 'payment failed'
        : null,
  });

  console.log(
    '[support] webhook',
    type,
    paymentId,
    orderId,
    payment?.amount ?? '-',
    persisted,
  );

  return NextResponse.json({ ok: true, handled: true, persisted: persisted === 'persisted' });
}
