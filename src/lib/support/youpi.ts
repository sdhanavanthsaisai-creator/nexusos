/**
 * Minimal server-side client for YOUPI PG v2.
 *
 * YOUPI PG is the self-hosted UPI gateway (github.com/youpi-pg/YouPI-PG). Its
 * published merchant SDK (`@youpi/merchant-sdk`) is not distributed on npm, so
 * this talks to the documented REST contract directly:
 *
 *   POST /api/v1/payments          create a session, get a checkoutUrl
 *   GET  /api/v1/payments/{id}     read the lifecycle status
 *
 * Everything here runs on the server. The merchant id and webhook secret never
 * reach the browser: the customer is only ever given the hosted checkoutUrl.
 */

import { youpiApiUrl, youpiMerchantId } from './config';

/** The gateway's own lifecycle. SUCCESS is the only value that means paid. */
export type YoupiStatus =
  | 'INITIATED'
  | 'ACTIVE'
  | 'QUEUED'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

export const YOUPI_STATUSES: readonly YoupiStatus[] = [
  'INITIATED',
  'ACTIVE',
  'QUEUED',
  'PROCESSING',
  'SUCCESS',
  'FAILED',
  'EXPIRED',
  'CANCELLED',
];

export function isYoupiStatus(value: unknown): value is YoupiStatus {
  return typeof value === 'string' && (YOUPI_STATUSES as readonly string[]).includes(value);
}

export interface YoupiPaymentSession {
  paymentId: string;
  orderId: string;
  amount: string;
  amountPaise: number | null;
  currency: string;
  status: YoupiStatus;
  checkoutUrl: string;
}

export type YoupiResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; code: string; message: string };

const REQUEST_TIMEOUT_MS = 15_000;

function text(value: unknown): string {
  return typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);
}

function paise(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function notConfigured<T>(): YoupiResult<T> {
  return {
    ok: false,
    status: 503,
    code: 'youpi_not_configured',
    message: 'UPI checkout is not configured.',
  };
}

async function request(
  path: string,
  init: RequestInit,
): Promise<{ response: Response } | { error: string }> {
  const base = youpiApiUrl();
  const merchantId = youpiMerchantId();
  if (!base || !merchantId) return { error: 'not_configured' };

  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'X-Merchant-Id': merchantId,
        ...(init.headers ?? {}),
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return { response };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'unknown transport error' };
  }
}

/**
 * Creates a payment session and returns the hosted checkout URL.
 *
 * `amountInr` is already validated by the caller against CONTRIBUTION bounds;
 * this layer only converts it to the two-decimal string the gateway expects.
 */
export async function createYoupiPayment(input: {
  orderId: string;
  amountInr: number;
  returnUrl: string;
  description?: string;
  name?: string;
  email?: string;
  idempotencyKey: string;
}): Promise<YoupiResult<YoupiPaymentSession>> {
  if (!youpiApiUrl() || !youpiMerchantId()) return notConfigured();

  const customer =
    input.name || input.email
      ? {
          ...(input.name ? { name: input.name } : {}),
          ...(input.email ? { email: input.email } : {}),
        }
      : undefined;

  const result = await request('/api/v1/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Prevents a double-click or a retried request from creating two sessions.
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify({
      orderId: input.orderId,
      amount: input.amountInr.toFixed(2),
      currency: 'INR',
      ...(input.description ? { description: input.description } : {}),
      returnUrl: input.returnUrl,
      ...(customer ? { customer } : {}),
      metadata: { purpose: 'support', source: 'studyhall-support-page' },
    }),
  });

  if ('error' in result) {
    console.error('[support] YouPI create failed:', result.error);
    return {
      ok: false,
      status: 502,
      code: 'gateway_unreachable',
      message: 'Could not reach the UPI gateway. Please try again in a moment.',
    };
  }

  const { response } = result;
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (response.status === 409) {
    return {
      ok: false,
      status: 409,
      code: 'duplicate_session',
      message: 'A UPI payment is already open on another device. Finish or cancel it, then try again.',
    };
  }

  if (response.status === 403) {
    return {
      ok: false,
      status: 403,
      code: 'blocked',
      message: 'The gateway blocked this checkout. Please try again later or use the card option.',
    };
  }

  const paymentId = text(payload?.paymentId).trim();
  const checkoutUrl = text(payload?.checkoutUrl).trim();

  if (!response.ok || !paymentId || !checkoutUrl) {
    console.error('[support] YouPI create rejected', response.status, text(payload?.error).slice(0, 300));
    return {
      ok: false,
      status: 502,
      code: 'session_failed',
      message: 'Could not start the UPI payment. Please try again in a moment.',
    };
  }

  return {
    ok: true,
    value: {
      paymentId,
      orderId: text(payload?.orderId) || input.orderId,
      amount: text(payload?.amount) || input.amountInr.toFixed(2),
      amountPaise: paise(payload?.amountPaise),
      currency: text(payload?.currency) || 'INR',
      status: isYoupiStatus(payload?.status) ? payload.status : 'INITIATED',
      checkoutUrl,
    },
  };
}

/** Reads the current state of a session. Used by the return page and the webhook fallback. */
export async function fetchYoupiPayment(paymentId: string): Promise<YoupiResult<YoupiPaymentSession>> {
  if (!youpiApiUrl() || !youpiMerchantId()) return notConfigured();

  const result = await request(`/api/v1/payments/${encodeURIComponent(paymentId)}`, { method: 'GET' });

  if ('error' in result) {
    console.error('[support] YouPI status failed:', result.error);
    return {
      ok: false,
      status: 502,
      code: 'gateway_unreachable',
      message: 'Could not reach the UPI gateway.',
    };
  }

  const { response } = result;
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok || !payload) {
    return {
      ok: false,
      status: response.status === 404 ? 404 : 502,
      code: response.status === 404 ? 'not_found' : 'status_failed',
      message: 'Could not read this payment from the gateway.',
    };
  }

  return {
    ok: true,
    value: {
      paymentId: text(payload.paymentId) || paymentId,
      orderId: text(payload.orderId),
      amount: text(payload.amount),
      amountPaise: paise(payload.amountPaise),
      currency: text(payload.currency) || 'INR',
      status: isYoupiStatus(payload.status) ? payload.status : 'INITIATED',
      checkoutUrl: '',
    },
  };
}
