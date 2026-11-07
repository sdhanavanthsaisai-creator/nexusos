# Razorpay — optional contributions (Study Hall)

Study Hall is free. Nothing is sold, gated or subscribed. This document covers the
only money flow in the project: an **optional one-time contribution** on
`/support`, processed by Razorpay.

## Why it is framed as a contribution, not a donation

Razorpay's Donations Button and 80G receipts exist for registered NGOs, societies
and trusts. `src/lib/legal/config.ts` and `src/lib/support/config.ts` therefore
never call this a donation, and the Terms say plainly that no 12A/80G
registration exists, so no tax deduction can be claimed. Calling it a donation
without that registration would be a false statement on a public site.

## Files

| Path | Purpose |
| --- | --- |
| `src/lib/support/config.ts` | Presets (₹49/₹99/₹299/₹499), custom-amount bounds, copy |
| `src/app/api/support/order/route.ts` | Creates the Razorpay order; the amount is validated server-side |
| `src/app/api/support/verify/route.ts` | HMAC-SHA256 check of `order_id|payment_id` |
| `src/app/api/support/webhook/route.ts` | Raw-body webhook signature check, then `payment.captured` / `payment.failed` state update |
| `src/lib/support/transactions.ts` | Writes the contribution ledger with the service-role key |
| `supabase/schema.sql` | `public.support_contributions` ledger table (RLS on, no policies) |
| `src/app/support/page.tsx` | Public support page (no sign-in required) |
| `src/components/support/support-form.tsx` | Razorpay Checkout launcher, trust line + thank-you state |

## 1. Get keys

Dashboard → Account & Settings → API Keys → generate **test** keys first.

Add to `.env` (never commit this file):

```
RAZORPAY_KEY_ID=rzp_test_...          # or NEXT_PUBLIC_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET=...              # or RAZORPAY_SECRET
RAZORPAY_WEBHOOK_SECRET=...
SUPABASE_SERVICE_ROLE_KEY=...        # writes the contribution ledger
```

Both names are accepted for the key id and the key secret, so an existing
deployment does not break when either style is used. The key id may live under a
`NEXT_PUBLIC_` name because Razorpay treats it as publishable; the secret must
never be exposed to the browser.

Without the key id and secret, `/support` shows "Contributions aren't switched on
yet" and the order API returns `503` — that is the intended default, not a bug.

`SUPABASE_SERVICE_ROLE_KEY` is optional but recommended: without it, orders and
payments still work, and the state transition is only written to the server log
instead of `public.support_contributions`.

## 2. Webhook

Dashboard → Settings → Webhooks → Add New Webhook:

- URL: `https://<your-app-domain>/api/support/webhook`
- Secret: same value as `RAZORPAY_WEBHOOK_SECRET`
- Events: `payment.captured`, `payment.failed`

## 3. Test the flow

Test mode, card `4111 1111 1111 1111`, any future expiry, any CVV, OTP `1234`:
contribute ₹49 → checkout opens → payment succeeds → the page shows the
thank-you state. A failed-card test should show the failure message and leave the
page usable.

After the run, `public.support_contributions` should hold one row whose status
goes `created` → `verified` → `captured`. Replaying the same webhook from the
dashboard must leave exactly one row and must not flip it back to `failed`:
every write is an upsert keyed on the Razorpay order id.

## 4. What Razorpay reviews before going live

Razorpay's onboarding checklist for a website or app, and how this repo answers it:

| Requirement | Where it is |
| --- | --- |
| Public product description | `/`, `/support`, and the download site |
| Pricing clarity | No price to state — the site says every feature is free |
| Terms & Conditions | `/terms` |
| Privacy Policy | `/privacy` |
| Refund / cancellation policy | `/refund-policy` |
| Contact details + grievance officer | `/contact` |
| Business name and address on the site | `/terms`, `/contact`, `/refund-policy` |
| Working checkout | `/support` |

Set the **Website URL** in the dashboard to the app domain, and the business
category to something matching what the money is for (software / digital
services). Do not choose a donation or NGO category — the entity is not one.

## 5. Still required before submitting

The legal pages render a "Draft — operator details still missing" banner while any
placeholder remains. Fill every bracketed value in `src/lib/legal/config.ts` and
`src/lib/support/config.ts` before you submit the site, or a reviewer will see a
document that cannot identify the merchant.

## 6. Tax reality

Money received this way is income of the operator. A contribution is not covered
by GST as consideration for a supply, but the gateway fee and the receipts still
need to be recorded. Confirm the treatment with a CA once contributions are live.
