/**
 * Durable transaction state for optional contributions.
 *
 * Every write goes to Supabase's REST endpoint with the service-role key,
 * because `public.support_contributions` has row-level security enabled and no
 * policies: the anon and authenticated roles cannot read or write it, so a
 * payment record can never be forged or enumerated from the browser.
 *
 * The helper never throws. Contribution state is bookkeeping, not an
 * entitlement, so a missing key or a failed write must not turn a successful
 * payment into an error page. Callers get a result they can log.
 */

const TABLE = 'support_contributions';

export type ContributionStatus = 'created' | 'verified' | 'captured' | 'failed';
export type TransactionWriteResult = 'persisted' | 'skipped' | 'error';

function adminEndpoint(): { url: string; key: string } | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;
  return { url: `${base.replace(/\/+$/, '')}/rest/v1/${TABLE}`, key };
}

async function send(
  method: 'POST' | 'PATCH',
  query: string,
  body: Record<string, unknown>,
): Promise<TransactionWriteResult> {
  const endpoint = adminEndpoint();
  if (!endpoint) return 'skipped';

  try {
    const response = await fetch(`${endpoint.url}${query}`, {
      method,
      headers: {
        apikey: endpoint.key,
        Authorization: `Bearer ${endpoint.key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('[support] transaction write failed', response.status, detail.slice(0, 300));
      return 'error';
    }
    return 'persisted';
  } catch (error) {
    console.error('[support] transaction write error', error instanceof Error ? error.message : 'unknown');
    return 'error';
  }
}

/** Records the order the moment it is created, so a webhook always has a row. */
export function recordOrderCreated(input: {
  orderId: string;
  amountPaise: number;
  currency: string;
  email?: string;
}): Promise<TransactionWriteResult> {
  return send('POST', '?on_conflict=razorpay_order_id', {
    razorpay_order_id: input.orderId,
    amount_paise: input.amountPaise,
    currency: input.currency,
    status: 'created',
    payer_email: input.email?.slice(0, 200) ?? null,
  });
}

/** Marks an order whose checkout signature verified successfully. */
export function recordPaymentVerified(input: {
  orderId: string;
  paymentId: string;
}): Promise<TransactionWriteResult> {
  return send('PATCH', `?razorpay_order_id=eq.${encodeURIComponent(input.orderId)}`, {
    razorpay_payment_id: input.paymentId,
    status: 'verified',
  });
}

/**
 * Applies a Razorpay payment event. Idempotent: the row is keyed by order id and
 * merged, so a retried `payment.captured` leaves the same final state.
 */
export function recordPaymentEvent(input: {
  orderId: string;
  paymentId: string;
  amountPaise?: number;
  currency?: string;
  status: Extract<ContributionStatus, 'captured' | 'failed'>;
  reason?: string | null;
}): Promise<TransactionWriteResult> {
  return send('POST', '?on_conflict=razorpay_order_id', {
    razorpay_order_id: input.orderId,
    razorpay_payment_id: input.paymentId,
    ...(input.amountPaise === undefined ? {} : { amount_paise: input.amountPaise }),
    ...(input.currency ? { currency: input.currency } : {}),
    status: input.status,
    failure_reason: input.reason ? input.reason.slice(0, 500) : null,
  });
}
