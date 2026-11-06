import type { Metadata } from 'next';
import Link from 'next/link';
import { Bullets, Callout, LegalShell, Mono, Section } from '@/components/legal/legal-shell';
import { BRAND, CONTACT, CONTRIBUTIONS, GRIEVANCE, OPERATOR } from '@/lib/legal/config';

export const metadata: Metadata = {
  title: `Refunds & Cancellations — ${BRAND}`,
  description: `${BRAND} is free, so there is nothing to cancel. This page explains when an optional contribution is refunded, how to ask, and how long it takes.`,
  robots: { index: true, follow: true },
};

export default function RefundPolicyPage() {
  return (
    <LegalShell
      title="Refunds & Cancellations"
      summary={`${BRAND} has no paid plan, so there is no subscription to cancel and nothing to return. If you have made an optional contribution and something went wrong with it, here is exactly how we handle it.`}
    >
      <Section id="nothing-to-cancel" heading="1. There is nothing to cancel">
        <p>
          Every feature of {BRAND} is free. We do not sell a subscription, a licence or a course, and we do not take
          recurring payments. No mandate is created, no card is stored for future charges and nothing renews on its own.
        </p>
        <p>
          That means you never need to cancel anything to keep using the app for free, and cancelling will never place a
          limit on your account. If you want your data gone, delete it in Settings — see the{' '}
          <Link href="/privacy" className="underline decoration-foreground/30 underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </Section>

      <Section id="contributions" heading="2. What a contribution is">
        <p>
          If you choose to support the project, you make a <strong>one-time voluntary contribution</strong> from the{' '}
          <Link href="/support" className="underline decoration-foreground/30 underline-offset-2 hover:text-foreground">
            support page
          </Link>
          . It is a gift toward hosting, AI credits and development. Nothing is supplied in return: no feature is
          unlocked, no priority support is promised, and your account stays identical.
        </p>
        <Callout>
          A contribution is not a charitable donation. {OPERATOR.legalName} is not registered under section 12A or 80G of
          the Income Tax Act, and no contribution is eligible for a tax deduction.
        </Callout>
      </Section>

      <Section id="refunds" heading="3. When we refund">
        <p>We refund a contribution in full, without argument, in any of these cases:</p>
        <Bullets
          items={[
            <><strong>You changed your mind</strong> — write to us within {CONTRIBUTIONS.refundWindowDays} days of the payment and we will return it.</>,
            <><strong>Duplicate payment</strong> — the same contribution went through twice, however it happened.</>,
            <><strong>Wrong amount</strong> — you typed ₹499 instead of ₹49, and tell us within {CONTRIBUTIONS.refundWindowDays} days of the payment. We refund the difference.</>,
            <><strong>Unauthorised use</strong> — the payment was made with your card or UPI without your permission. Report it to us and to your bank immediately.</>,
            <><strong>Debited but the page said it failed</strong> — your bank shows a debit but we never received a successful payment.</>,
            <><strong>Payment succeeded and nothing was recorded</strong> — we trace it with Razorpay and refund it if it cannot be matched to a contribution.</>,
          ]}
        />
        <p>
          Beyond those cases a contribution is treated as final, because it is a gift rather than payment for something
          you did not receive. We will still look at any request on its facts — write to us rather than assuming the
          answer is no.
        </p>
        <Callout>
          Nothing here removes any right you have under the Consumer Protection Act, 2019 or the payment network&apos;s
          rules. If you believe a charge was unfair you can always raise it with us, and if it stays unresolved, with
          your bank.
        </Callout>
      </Section>

      <Section id="how" heading="4. How to request a refund">
        <p>
          Email <Mono>{CONTACT.supportEmail}</Mono> from the address you used, with “Contribution refund” in the subject,
          or call {CONTACT.phone} during support hours. Include:
        </p>
        <Bullets
          items={[
            <>the Razorpay payment ID from your receipt or bank statement (it looks like <Mono>pay_XXXXXXXXXXXX</Mono>);</>,
            <>the amount and the date;</>,
            <>the UPI ID, card ending or bank account the payment came from;</>,
            <>one line on what happened.</>,
          ]}
        />
        <p>
          We acknowledge every request within {GRIEVANCE.acknowledgementHours} hours and decide within{' '}
          {GRIEVANCE.resolutionDays} days. Refunds go back through Razorpay to the original payment method — the same
          card, UPI ID or bank account. We cannot send money anywhere else, and we will never ask you for your card
          number, CVV, UPI PIN or an OTP to process a refund. Anyone who does is not us.
        </p>
      </Section>

      <Section id="timing" heading="5. How long it takes">
        <p>
          Approved refunds are initiated within 2 business days. Razorpay and your bank then take about{' '}
          {CONTRIBUTIONS.refundProcessingDays}:
        </p>
        <Bullets
          items={[
            <><strong>UPI:</strong> usually 1–3 business days.</>,
            <><strong>Cards:</strong> 5–7 business days, depending on your issuer&apos;s billing cycle.</>,
            <><strong>Net banking and wallets:</strong> 5–7 business days.</>,
          ]}
        />
        <p>
          You will get a refund confirmation from Razorpay. If the money has not appeared after 10 business days, send us
          the refund reference (ARN/RRN) and we will chase it with the processor.
        </p>
      </Section>

      <Section id="failed" heading="6. Failed payments">
        <Bullets
          items={[
            <>A failed payment is normally reversed by your bank within 5–7 business days. Nothing is charged and you do not need to ask us for a refund.</>,
            <>If your bank shows a debit for a payment the checkout marked failed, send us the reference — we will have Razorpay trace and reverse it.</>,
            <>If the checkout keeps failing, try a different method (UPI usually works when a card is declined by the issuer) or write to us.</>,
          ]}
        />
      </Section>

      <Section id="chargeback" heading="7. Chargebacks">
        <p>
          Please write to us before raising a chargeback with your bank — a refund is faster and does not involve
          paperwork. If a chargeback is raised we cooperate fully with the bank&apos;s investigation. A chargeback raised
          in bad faith, after a refund has already been issued, may be disputed with evidence.
        </p>
      </Section>

      <Section id="escalation" heading="8. If you are not satisfied">
        <p>
          Escalate to our grievance officer, {GRIEVANCE.officerName} ({GRIEVANCE.officerDesignation}), at{' '}
          {CONTACT.supportEmail} with “Grievance” in the subject. We respond within{' '}
          {GRIEVANCE.acknowledgementHours} hours and resolve within {GRIEVANCE.resolutionDays} days. You may also contact
          the National Consumer Helpline, or the Consumer Commission for {GRIEVANCE.jurisdictionCity}.
        </p>
        <p>
          See also our{' '}
          <Link href="/terms" className="underline decoration-foreground/30 underline-offset-2 hover:text-foreground">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline decoration-foreground/30 underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </Section>

      <Section id="details" heading="9. Merchant details">
        <p>
          {OPERATOR.legalName}
          <br />
          {OPERATOR.address}
          <br />
          Email: {CONTACT.supportEmail} · Phone: {CONTACT.phone}
        </p>
      </Section>
    </LegalShell>
  );
}
