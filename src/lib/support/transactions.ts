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
const YOUPI_TABLE = 'support_youpi_contributions';

export type ContributionStatus = 'created' | 'verified' | 'captured' | 'failed';
export type TransactionWriteResult = 'persisted' | 'skipped' | 'error';

function adminEndpoint(table: string = TABLE): { url: string; key: string } | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;
  return { url: `${base.replace(/\/+$/, '')}/rest/v1/${table}`, key };
}

async function send(
  method: 'POST' | 'PATCH',
  query: string,
  body: Record<string, unknown>,
  table: string = TABLE,
): Promise<TransactionWriteResult> {
  const endpoint = adminEndpoint(table);
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

/*
 * YOUPI PG contributions.
 *
 * The gateway's public payment id is known the moment a session is created, so
 * that is the key here and every later event merges onto the same row. Status
 * values are the gateway's own, unmodified, so a stored row can always be
 * compared against what the gateway reports.
 */

/** Stores the session the moment it is created, so a webhook always has a row. */
export function recordYoupiOrderCreated(input: {
  paymentId: string;
  orderId: string;
  amountPaise: number;
  currency?: string;
  status?: string;
  email?: string;
}): Promise<TransactionWriteResult> {
  return send(
    'POST',
    '?on_conflict=youpi_payment_id',
    {
      youpi_payment_id: input.paymentId,
      order_id: input.orderId,
      amount_paise: input.amountPaise,
      currency: input.currency ?? 'INR',
      status: input.status ?? 'INITIATED',
      payer_email: input.email?.slice(0, 200) ?? null,
    },
    YOUPI_TABLE,
  );
}

/**
 * Applies a gateway event or a status poll. Idempotent: the row is keyed by
 * payment id and merged, so a retried webhook leaves the same final state and a
 * late poll can never roll a SUCCESS back to ACTIVE.
 */
export function recordYoupiEvent(input: {
  paymentId: string;
  orderId?: string;
  amountPaise?: number | null;
  currency?: string;
  status: string;
  utr?: string | null;
  reason?: string | null;
}): Promise<TransactionWriteResult> {
  // PostgREST cannot apply a filter to an upsert, so a caller that must not
  // roll a settled row back (the status poll) checks the stored state itself
  // before calling this.
  return send(
    'POST',
    '?on_conflict=youpi_payment_id',
    {
      youpi_payment_id: input.paymentId,
      ...(input.orderId ? { order_id: input.orderId } : {}),
      ...(input.amountPaise === undefined || input.amountPaise === null
        ? {}
        : { amount_paise: input.amountPaise }),
      ...(input.currency ? { currency: input.currency } : {}),
      status: input.status,
      ...(input.utr ? { utr: input.utr.slice(0, 64) } : {}),
      failure_reason: input.reason ? input.reason.slice(0, 500) : null,
    },
    YOUPI_TABLE,
  );
}

/**
 * Reads a stored YouPI row by payment id or by merchant order id.
 *
 * The return page only carries the order id WE chose (the gateway echoes the
 * return URL), so the status route uses this to turn it back into the payment
 * id the gateway expects. The webhook uses the same row as the reference the
 * confirmed amount and order id are checked against. Returns null rather than
 * throwing.
 */
export async function readYoupiContribution(lookup: {
  paymentId?: string;
  orderId?: string;
}): Promise<{
  paymentId: string;
  orderId: string | null;
  status: string;
  amountPaise: number | null;
} | null> {
  const filter = lookup.paymentId
    ? `youpi_payment_id=eq.${encodeURIComponent(lookup.paymentId)}`
    : lookup.orderId
      ? `order_id=eq.${encodeURIComponent(lookup.orderId)}`
      : null;
  if (!filter) return null;

  const endpoint = adminEndpoint(YOUPI_TABLE);
  if (!endpoint) return null;

  try {
    const response = await fetch(
      `${endpoint.url}?${filter}&select=youpi_payment_id,order_id,status,amount_paise&limit=1`,
      {
        headers: {
          apikey: endpoint.key,
          Authorization: `Bearer ${endpoint.key}`,
        },
        cache: 'no-store',
      },
    );

    if (!response.ok) return null;

    const rows = (await response.json()) as Array<{
      youpi_payment_id?: string;
      order_id?: string | null;
      status?: string;
      amount_paise?: number | null;
    }>;

    const row = Array.isArray(rows) ? rows[0] : undefined;
    if (!row?.youpi_payment_id) return null;

    return {
      paymentId: row.youpi_payment_id,
      orderId: row.order_id ?? null,
      status: row.status ?? 'INITIATED',
      amountPaise: typeof row.amount_paise === 'number' ? row.amount_paise : null,
    };
  } catch (error) {
    console.error('[support] youpi read failed', error instanceof Error ? error.message : 'unknown');
    return null;
  }
}
