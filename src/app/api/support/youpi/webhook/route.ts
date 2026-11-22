import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { youpiWebhookSecret } from '@/lib/support/config';
import { fetchYoupiPayment, isYoupiStatus } from '@/lib/support/youpi';
import { readYoupiContribution, recordYoupiEvent } from '@/lib/support/transactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface YoupiWebhook {
  event?: string;
  paymentId?: string;
  orderId?: string;
  amount?: string;
  amountPaise?: number | string;
  currency?: string;
  method?: string;
  utr?: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

/** The event amount in paise, or null when the body carries none. */
function eventAmountPaise(event: YoupiWebhook): number | null {
  if (typeof event.amountPaise === 'number' && Number.isFinite(event.amountPaise)) {
    return Math.round(event.amountPaise);
  }
  if (typeof event.amountPaise === 'string' && event.amountPaise.trim()) {
    const parsed = Number.parseInt(event.amountPaise, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof event.amount === 'string' && event.amount.trim()) {
    const rupees = Number.parseFloat(event.amount);
    if (Number.isFinite(rupees)) return Math.round(rupees * 100);
  }
  return null;
}

/**
 * What we asked the gateway to collect for this payment: the order id we
 * generated and the amount we validated, both taken from our own records.
 *
 * The ledger row is written immediately after the session is created, but a
 * webhook can win that race, so the gateway's own view of the session is used
 * as a fallback. Neither path takes the order id or amount from the webhook
 * body, which is what makes the comparison below meaningful.
 */
async function expectedFor(
  paymentId: string,
): Promise<{ orderId: string | null; amountPaise: number | null } | null> {
  const stored = await readYoupiContribution({ paymentId });
  if (stored) return { orderId: stored.orderId, amountPaise: stored.amountPaise };

  const live = await fetchYoupiPayment(paymentId);
  if (!live.ok) return null;
  return { orderId: live.value.orderId || null, amountPaise: live.value.amountPaise };
}

function reject(reason: string, paymentId: string, detail?: string) {
  console.error('[support] youpi webhook rejected', reason, paymentId, detail ?? '');
  // A mismatch will not resolve on a retry, so the delivery is acknowledged and
  // kept out of the ledger instead of bouncing until the gateway gives up.
  return NextResponse.json({ ok: true, handled: false, rejected: reason });
}

/**
 * YOUPI PG webhook endpoint.
 *
 * Configure it in the YouPI merchant admin panel as
 * `<app origin>/api/support/youpi/webhook`, using the same value you put in
 * YOUPI_WEBHOOK_SECRET. The gateway signs the raw body with
 * HMAC-SHA256(secret, body) and sends it as `X-Gateway-Signature: sha256=…`,
 * which is why this reads text() rather than json().
 *
 * A valid signature only proves the gateway sent the message; it does not prove
 * the message describes the contribution we opened. So the amount and order id
 * in the event must match the session we created before anything is recorded —
 * otherwise a signed event for a ₹10 session could settle a ₹499 row. State is
 * merged onto the row keyed by payment id, so a retried delivery is idempotent.
 * Reply 2xx quickly: anything else makes the gateway retry.
 */
export async function POST(request: Request) {
  const secret = youpiWebhookSecret();
  if (!secret) {
    // Without a secret we cannot tell a real webhook from a forged one, and a
    // forged SUCCESS would be a free contribution.
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  }

  const raw = await request.text();
  const header = request.headers.get('x-gateway-signature') ?? '';
  const received = header.replace(/^sha256=/i, '').trim().toLowerCase();

  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received, 'utf8');

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    console.warn('[support] youpi webhook signature rejected');
    return NextResponse.json({ ok: false, error: 'invalid_signature' }, { status: 400 });
  }

  let event: YoupiWebhook;
  try {
    event = JSON.parse(raw) as YoupiWebhook;
  } catch {
    // The signature already proved the sender, and a retry would not fix a
    // malformed body either — acknowledge so it is not redelivered forever.
    console.error('[support] youpi webhook body was not valid JSON');
    return NextResponse.json({ ok: true, handled: false });
  }

  const type = (event.event ?? '').toUpperCase();
  const paymentId = (event.paymentId ?? '').trim();

  if (!isYoupiStatus(type) || type === 'INITIATED' || type === 'ACTIVE' || type === 'QUEUED' || type === 'PROCESSING') {
    return NextResponse.json({ ok: true, handled: false });
  }

  if (!paymentId) {
    console.error('[support] youpi webhook missing paymentId', type);
    return NextResponse.json({ ok: true, handled: false });
  }

  const orderId = (event.orderId ?? '').trim();
  const amountPaise = eventAmountPaise(event);

  if (!orderId) return reject('missing_order_id', paymentId);
  if (amountPaise === null) return reject('missing_amount', paymentId);

  const reference = await expectedFor(paymentId);

  if (!reference) return reject('unknown_payment', paymentId);
  if (!reference.orderId) return reject('unverifiable_order', paymentId);
  if (orderId !== reference.orderId) {
    return reject('order_mismatch', paymentId, `${orderId} != ${reference.orderId}`);
  }
  if (reference.amountPaise === null) return reject('unverifiable_amount', paymentId);
  if (amountPaise !== reference.amountPaise) {
    return reject('amount_mismatch', paymentId, `${amountPaise} != ${reference.amountPaise}`);
  }

  const persisted = await recordYoupiEvent({
    paymentId,
    orderId,
    amountPaise: reference.amountPaise,
    currency: event.currency,
    status: type,
    utr: event.utr ?? null,
    reason: type === 'FAILED' ? 'payment failed' : type === 'EXPIRED' ? 'payment window expired' : null,
  });

  console.log('[support] youpi webhook', type, paymentId, orderId, reference.amountPaise, persisted);

  return NextResponse.json({ ok: true, handled: true, persisted: persisted === 'persisted' });
}
