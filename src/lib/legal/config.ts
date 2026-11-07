/**
 * Legal pages configuration.
 *
 * Every value wrapped in [SQUARE BRACKETS] is a placeholder that MUST be
 * replaced with real information before these pages are published — otherwise
 * the notice is incomplete and the merchant cannot be identified, which is
 * itself a compliance failure under the Consumer Protection (E-Commerce)
 * Rules, 2020 and the DPDP Act, 2023.
 *
 * This file is intentionally the only place these details live so the four
 * legal pages cannot drift apart.
 */

export const BRAND = 'Study Hall';
export const APP_URL = 'https://nexusos-sigma.vercel.app';
export const DOWNLOAD_URL = 'https://nexusos-download.vercel.app';

/** Date these documents were last revised. Bump when the text changes. */
export const LEGAL_UPDATED = '7 November 2026';
export const LEGAL_EFFECTIVE = '7 November 2026';

/** The person or business that operates Study Hall and receives payments. */
export const OPERATOR = {
  /** Registered / trade name that must appear on the website. */
  legalName: 'S DHANAVANTH SAI',
  /** e.g. "a sole proprietorship registered in India". */
  legalForm: 'a sole proprietorship (early-stage startup)',
  /** Principal geographic address of the head office. */
  address:
    'No. 14, Sakthi Nagar, 12th Cross Street Extension, Alapakkam, Chengalpattu 603002, Tamil Nadu',
  /** GSTIN if registered; otherwise state that you are not GST registered. */
  gstin: 'Not GST registered',
  country: 'India',
} as const;

export const CONTACT = {
  supportEmail: 'dhanavanthsai.s@gmail.com',
  privacyEmail: 'dhanavanthsai.s@gmail.com',
  /** Phone is required for the grievance officer disclosure. */
  phone: '+91 94980 04699',
} as const;

export const GRIEVANCE = {
  officerName: 'S DHANAVANTH SAI',
  officerDesignation: 'Founder',
  /** A responsible person, not necessarily a formally appointed DPO. */
  dataProtectionContact: 'S DHANAVANTH SAI, Founder',
  acknowledgementHours: 48,
  resolutionDays: 30,
  /** Governing-law courts named in the Terms. */
  jurisdictionCity: 'Chengalpattu, Tamil Nadu',
} as const;

/** Optional contribution details. Study Hall has no paid plan. */
export const CONTRIBUTIONS = {
  /** Short sentence used wherever the documents mention paying. */
  summary: 'Every feature of Study Hall is free. There is no paid plan, no trial and no locked feature.',
  /** Window in which an accidental or duplicate contribution is refunded. */
  refundWindowDays: 7,
  /** Processor/statutory turnaround quoted to contributors. */
  refundProcessingDays: '5–7 business days',
} as const;

export const THIRD_PARTIES = [
  { name: 'Supabase', role: 'Account authentication and cloud database hosting' },
  { name: 'Vercel', role: 'Web application hosting and content delivery' },
  { name: 'Razorpay', role: 'Payment processing for optional contributions (India)' },
  { name: 'Google (Gemini API)', role: 'AI coach replies when you choose the Gemini option' },
  { name: 'z.ai', role: 'AI coach replies for the built-in coach' },
] as const;

export const SUPPORT_HOURS = 'Monday to Friday, 10:00–18:00 IST, except public holidays';

/** True while any placeholder above is still unfilled. */
export function hasUnfilledPlaceholders(): boolean {
  const values = [
    ...Object.values(OPERATOR),
    ...Object.values(CONTACT),
    ...Object.values(GRIEVANCE),
    ...Object.values(THIRD_PARTIES).map((party) => party.role),
  ];
  return values.some((value) => typeof value === 'string' && value.includes('['));
}
