import type { Metadata } from 'next';
import Link from 'next/link';
import { Bullets, LegalShell, Mono, Section } from '@/components/legal/legal-shell';
import {
  APP_URL,
  BRAND,
  CONTACT,
  CONTRIBUTIONS,
  DOWNLOAD_URL,
  OPERATOR,
  SUPPORT_HOURS,
  THIRD_PARTIES,
} from '@/lib/legal/config';

export const metadata: Metadata = {
  title: `About — ${BRAND}`,
  description: `${BRAND} is a free study workspace for students: focus sessions, tasks, habits, notes, a DSA practice log and reports. What it does, what it costs and who runs it.`,
  robots: { index: true, follow: true },
};

const linkClass = 'underline decoration-foreground/30 underline-offset-2 hover:text-foreground';

export default function AboutPage() {
  return (
    <LegalShell
      badge="About"
      showDates={false}
      title={`About ${BRAND}`}
      summary={`${BRAND} is a study workspace that keeps the things students actually track — focus time, tasks, habits, notes and revision — in one place. It is free to use, and this page explains what it does, what it costs and who is behind it.`}
    >
      <Section id="what" heading="1. What it is">
        <p>
          {BRAND} is an independent study tool for students preparing for school, college and competitive exams. It runs
          in the browser at <Mono>{APP_URL}</Mono> and as an Android app available from{' '}
          <a href={DOWNLOAD_URL} className={linkClass}>
            the download page
          </a>
          . There is no iOS build yet.
        </p>
        <p>The workspace is organised around a small number of modules that share one set of data:</p>
        <Bullets
          items={[
            <><strong>Focus sessions:</strong> a timer that records what you studied, for how long, and under which subject or topic.</>,
            <><strong>Tasks and habits:</strong> day-to-day to-dos plus recurring habits, with a daily tracker for streaks.</>,
            <><strong>Calendar:</strong> sessions, tasks and deadlines on one timeline.</>,
            <><strong>Notes and roadmap:</strong> subject notes next to a syllabus or revision roadmap you build yourself.</>,
            <><strong>DSA practice log:</strong> problems solved, difficulty and revision status for coding interview prep.</>,
            <><strong>Reports and analytics:</strong> charts of study time, consistency and subject balance.</>,
            <><strong>AI coach:</strong> an assistant that answers questions about your own study data, using a model you choose.</>,
          ]}
        />
      </Section>

      <Section id="pricing" heading="2. What it costs">
        <p>
          Nothing. {CONTRIBUTIONS.summary} Every module above is available to every account, and creating an account
          costs nothing.
        </p>
        <p>
          There is an optional one-time contribution on the{' '}
          <Link href="/support" className={linkClass}>
            support page
          </Link>{' '}
          for people who want to fund the hosting, database and model costs behind the app. It is entirely voluntary, it
          does not unlock a feature, and it does not create a subscription. Contributions are processed by Razorpay; the
          amounts and the refund window are described on the support and{' '}
          <Link href="/refund-policy" className={linkClass}>
            refunds
          </Link>{' '}
          pages.
        </p>
      </Section>

      <Section id="operator" heading="3. Who runs it">
        <p>
          {BRAND} is operated by {OPERATOR.legalName}, {OPERATOR.legalForm}.
        </p>
        <p>
          {OPERATOR.address}
          <br />
          {OPERATOR.country} · GSTIN: {OPERATOR.gstin}
        </p>
        <p>
          {BRAND} is an independent product and is not affiliated with, or endorsed by, any college, university, board or
          examination authority. Questions about the app, an account or a payment can go to{' '}
          <Mono>{CONTACT.supportEmail}</Mono> during {SUPPORT_HOURS}. Formal complaints follow the path described on the{' '}
          <Link href="/contact" className={linkClass}>
            contact and grievance
          </Link>{' '}
          page.
        </p>
      </Section>

      <Section id="data" heading="4. Where your data lives">
        <p>
          Accounts and study data are stored with Supabase, the app is served by Vercel, and contributions are processed
          by Razorpay. The full list, and what each of them receives, is in the{' '}
          <Link href="/privacy" className={linkClass}>
            privacy policy
          </Link>
          .
        </p>
        <Bullets
          items={THIRD_PARTIES.map((party) => (
            <>
              <strong>{party.name}:</strong> {party.role}.
            </>
          ))}
        />
      </Section>

      <Section id="documents" heading="5. The documents">
        <p>
          <Link href="/terms" className={linkClass}>
            Terms of Service
          </Link>{' '}
          ·{' '}
          <Link href="/privacy" className={linkClass}>
            Privacy Policy
          </Link>{' '}
          ·{' '}
          <Link href="/refund-policy" className={linkClass}>
            Cancellation & Refunds
          </Link>{' '}
          ·{' '}
          <Link href="/contact" className={linkClass}>
            Contact & Grievance
          </Link>{' '}
          ·{' '}
          <Link href="/support" className={linkClass}>
            Support
          </Link>
        </p>
      </Section>
    </LegalShell>
  );
}
