import { APP_URL } from '@/lib/legal/config';

/**
 * Support (contribution) configuration.
 *
 * Study Hall is free. There is no paid plan, no gated feature and no
 * subscription. These values describe the optional one-time contribution a
 * visitor can make through Razorpay to support development.
 *
 * IMPORTANT: this is deliberately not called a "donation". Under Indian law a
 * tax-exempt donation requires 12A/80G registration, which this project does
 * not have. Calling it one on the site would be a false claim.
 */

export const CONTRIBUTION = {
  /** Shown on the support page and used as the Razorpay order description. */
  purpose: 'Voluntary contribution to support Study Hall',
  /** Checkout line shown inside Razorpay. */
  checkoutDescription: 'Support Study Hall — a free app. Nothing is unlocked by paying.',
  currency: 'INR',
  /** Suggested amounts in whole rupees. */
  presets: [
    { id: 'chai', label: 'Chai', amountInr: 49 },
    { id: 'month', label: 'A month of hosting', amountInr: 99 },
    { id: 'api', label: 'A month of AI credits', amountInr: 299 },
    { id: 'big', label: 'Big thank you', amountInr: 499 },
  ],
  /** Bounds for the custom amount field, in whole rupees. */
  minAmountInr: 10,
  maxAmountInr: 25_000,
} as const;

export type ContributionPresetId = (typeof CONTRIBUTION.presets)[number]['id'];

export function amountFromPreset(presetId: string): number | null {
  const preset = CONTRIBUTION.presets.find((p) => p.id === presetId);
  return preset ? preset.amountInr : null;
}

/** Validates a user-entered rupee amount. Returns whole rupees or null. */
export function normaliseCustomAmount(value: unknown): number | null {
  const amount = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(amount)) return null;
  const rounded = Math.round(amount);
  if (rounded < CONTRIBUTION.minAmountInr || rounded > CONTRIBUTION.maxAmountInr) return null;
  return rounded;
}

/** Razorpay expects the smallest currency unit, so rupees become paise. */
export function amountToPaise(amountInr: number): number {
  return Math.round(amountInr * 100);
}

export function formatInr(amountInr: number): string {
  return `₹${amountInr.toLocaleString('en-IN')}`;
}

/** First non-empty environment value from the given names. */
function readEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  return undefined;
}

/**
 * Publishable key id, sent to Checkout by the order route.
 *
 * Accepts both the server-only name and the public alias so either style of
 * Vercel configuration works. A key id is not a secret; the key secret is.
 */
export function razorpayKeyId(): string | undefined {
  return readEnv('RAZORPAY_KEY_ID', 'NEXT_PUBLIC_RAZORPAY_KEY_ID');
}

/** Key secret used to sign orders and verify signatures. Never send this out. */
export function razorpayKeySecret(): string | undefined {
  return readEnv('RAZORPAY_KEY_SECRET', 'RAZORPAY_SECRET');
}

/** True when Razorpay credentials are present in the environment. */
export function isRazorpayConfigured(): boolean {
  return Boolean(razorpayKeyId() && razorpayKeySecret());
}

/*
 * YOUPI PG — the self-hosted UPI gateway (github.com/youpi-pg/YouPI-PG).
 *
 * This is the second checkout, offered next to the Razorpay one. It creates a
 * session on a gateway the operator runs themselves and settles the money
 * directly into their bank account, so there is no per-transaction platform
 * fee. The gateway authenticates the payer on its own origin (WhatsApp OTP) and
 * shows the UPI QR/deep link there, so neither this app nor the browser ever
 * handles a card number, UPI PIN or bank credential.
 *
 * All three values are server-only and come from the YouPI merchant admin
 * panel. None of them is prefixed with NEXT_PUBLIC_: the merchant id creates
 * sessions and the webhook secret is what makes a confirmation trustworthy.
 */

/** Base origin of the gateway, e.g. https://pay.example.com. */
export function youpiApiUrl(): string | undefined {
  const raw = readEnv('YOUPI_API_URL');
  if (!raw) return undefined;
  try {
    return new URL(raw).origin;
  } catch {
    return undefined;
  }
}

/** Publishable merchant UUID sent as the X-Merchant-Id header. */
export function youpiMerchantId(): string | undefined {
  return readEnv('YOUPI_MERCHANT_ID');
}

/** Signing secret for X-Gateway-Signature. Never send this out. */
export function youpiWebhookSecret(): string | undefined {
  return readEnv('YOUPI_WEBHOOK_SECRET');
}

/**
 * True when a checkout session can be created. The webhook secret is checked
 * separately, because a session is still usable (and pollable) before the
 * gateway's webhook has been wired up.
 */
export function isYoupiConfigured(): boolean {
  return Boolean(youpiApiUrl() && youpiMerchantId());
}

/**
 * Absolute origin the gateway sends the payer back to.
 *
 * YOUPI PG only stores absolute http(s) return URLs, and a hosted deployment
 * has its own domain, so this defaults to the canonical app URL. Point
 * SUPPORT_RETURN_ORIGIN at http://localhost:3000 when testing locally.
 */
export function supportReturnOrigin(): string {
  return (readEnv('SUPPORT_RETURN_ORIGIN') ?? APP_URL).replace(/\/+$/, '');
}
