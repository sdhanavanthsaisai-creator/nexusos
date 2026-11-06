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

export function formatInr(amountInr: number): string {
  return `₹${amountInr.toLocaleString('en-IN')}`;
}

/** True when Razorpay credentials are present in the environment. */
export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}
