import type { Metadata } from 'next';
import Link from 'next/link';
import { Bullets, LegalShell, Mono, Section } from '@/components/legal/legal-shell';
import { BRAND, CONTACT, GRIEVANCE, OPERATOR, SUPPORT_HOURS } from '@/lib/legal/config';

export const metadata: Metadata = {
  title: `Contact & Grievance — ${BRAND}`,
  description: `How to reach ${BRAND} for support, billing, privacy requests and formal complaints, including the grievance officer’s details and response times.`,
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return (
    <LegalShell
      title="Contact & Grievance"
      summary={`Real humans read these inboxes. This page gives the operator details, the fastest route for each kind of question, and the formal grievance path with the response times we commit to.`}
    >
      <Section id="operator" heading="1. Who you are dealing with">
        <p>
          {OPERATOR.legalName}
          <br />
          {OPERATOR.legalForm}
          <br />
          {OPERATOR.address}
          <br />
          {OPERATOR.country} · GSTIN: {OPERATOR.gstin}
        </p>
        <p>
          We trade as {BRAND}. {BRAND} is an independent study tool and is not affiliated with, or endorsed by, any
          college, university, board or examination authority.
        </p>
      </Section>

      <Section id="channels" heading="2. Reach us">
        <Bullets
          items={[
            <><strong>General support, bugs and account help:</strong> {CONTACT.supportEmail} — {SUPPORT_HOURS}.</>,
            <><strong>Contributions and refunds:</strong> {CONTACT.supportEmail} with “Contribution” in the subject. Include your Razorpay payment ID.</>,
            <><strong>Privacy and data requests</strong> (access, correction, deletion, nomination): {CONTACT.privacyEmail}.</>,
            <><strong>Formal complaints and legal notices:</strong> {CONTACT.supportEmail} with “Grievance” or “Legal notice” in the subject.</>,
            <><strong>Phone:</strong> {CONTACT.phone}, {SUPPORT_HOURS}.</>,
          ]}
        />
        <p>
          Email is the fastest route. Write from the address on your account so we can verify you without asking for
          anything sensitive, and never send us your password, OTP, CVV, UPI PIN or full card number.
        </p>
      </Section>

      <Section id="grievance" heading="3. Grievance officer">
        <p>
          <strong>Name:</strong> {GRIEVANCE.officerName}
          <br />
          <strong>Designation:</strong> {GRIEVANCE.officerDesignation}
          <br />
          <strong>Email:</strong> {CONTACT.supportEmail}
          <br />
          <strong>Phone:</strong> {CONTACT.phone}
          <br />
          <strong>Address:</strong> {OPERATOR.address}
        </p>
        <p>
          Under the Consumer Protection (E-Commerce) Rules, 2020 and our own commitment, we acknowledge every consumer
          complaint within <strong>{GRIEVANCE.acknowledgementHours} hours</strong> and resolve it within{' '}
          <strong>{GRIEVANCE.resolutionDays} days</strong> of receiving it, giving you a written outcome. If we need more
          information from you, that time does not count toward the {GRIEVANCE.resolutionDays} days.
        </p>
        <p>
          For personal data, {GRIEVANCE.dataProtectionContact} is responsible for handling your requests under the Digital
          Personal Data Protection Act, 2023.
        </p>
      </Section>

      <Section id="escalation" heading="4. If we cannot resolve it">
        <Bullets
          items={[
            <><strong>Consumer issues:</strong> the National Consumer Helpline (1800-11-4000 / consumerhelpline.gov.in), or the District, State or National Consumer Commission under the Consumer Protection Act, 2019.</>,
            <><strong>Personal data:</strong> the Data Protection Board of India, once you have raised the matter with us first.</>,
            <><strong>Payments:</strong> your bank or card issuer can raise a dispute, though a refund through us is usually quicker.</>,
          ]}
        />
      </Section>

      <Section id="documents" heading="5. Our policies">
        <p>
          <Link href="/terms" className="underline decoration-foreground/30 underline-offset-2 hover:text-foreground">
            Terms of Service
          </Link>{' '}
          ·{' '}
          <Link href="/privacy" className="underline decoration-foreground/30 underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>{' '}
          ·{' '}
          <Link
            href="/refund-policy"
            className="underline decoration-foreground/30 underline-offset-2 hover:text-foreground"
          >
            Cancellation & Refunds
          </Link>
        </p>
        <p>
          Written notice should be sent to <Mono>{CONTACT.supportEmail}</Mono>. We accept service at the address above.
        </p>
      </Section>
    </LegalShell>
  );
}
