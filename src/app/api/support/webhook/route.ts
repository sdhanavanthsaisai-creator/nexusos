import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Razorpay webhook endpoint.
 *
 * Configure it in Dashboard → Settings → Webhooks with the events
 * `payment.captured` and `payment.failed`, using the same secret you put in
 * RAZORPAY_WEBHOOK_SECRET. The signature is computed over the raw request body,
 * which is why this handler reads text() rather than json().
 *
 * Contributions do not create entitlements, so this only records the event in
 * the server log and acknowledges it. Reply 2xx quickly: Razorpay retries any
 * non-2xx response.
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

  try {
    const event = JSON.parse(raw) as {
      event?: string;
      payload?: { payment?: { entity?: { id?: string; amount?: number; status?: string } } };
    };
    const payment = event.payload?.payment?.entity;
    console.log(
      '[support] webhook',
      event.event ?? 'unknown',
      payment?.id ?? '-',
      payment?.amount ?? '-',
      payment?.status ?? '-',
    );
  } catch {
    // Signature already proved Razorpay sent this; a parse failure is not worth a retry.
  }

  return NextResponse.json({ ok: true });
}
