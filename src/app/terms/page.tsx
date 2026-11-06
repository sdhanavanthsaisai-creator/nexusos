import type { Metadata } from 'next';
import Link from 'next/link';
import { Bullets, Callout, LegalShell, Mono, Section } from '@/components/legal/legal-shell';
import { BRAND, CONTACT, CONTRIBUTIONS, GRIEVANCE, OPERATOR, SUPPORT_HOURS } from '@/lib/legal/config';

export const metadata: Metadata = {
  title: `Terms of Service — ${BRAND}`,
  description: `The agreement that governs your use of ${BRAND}: accounts, the free service, optional contributions through Razorpay, acceptable use and refunds.`,
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Service"
      summary={`These terms are a legal agreement between you and the operator of ${BRAND}. They cover your account, the free service, optional contributions, your content and what happens if something goes wrong.`}
    >
      <Section id="who-we-are" heading="1. Who we are">
        <p>
          {BRAND} is a study workspace operated by {OPERATOR.legalName}, {OPERATOR.legalForm}, with its principal place
          of business at {OPERATOR.address}, {OPERATOR.country}. In these terms, “we”, “us” and “our” mean that operator;
          “you” means the person using {BRAND}.
        </p>
        <p>
          You can reach us at {CONTACT.supportEmail}. Complaints and data requests are handled under our{' '}
          <Link href="/contact" className="underline decoration-foreground/30 underline-offset-2 hover:text-foreground">
            contact and grievance policy
          </Link>
          .
        </p>
      </Section>

      <Section id="acceptance" heading="2. Accepting these terms">
        <p>
          By creating an account, or by using {BRAND} without an account where that is possible, you agree to these
          terms, our{' '}
          <Link href="/privacy" className="underline decoration-foreground/30 underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>{' '}
          and our{' '}
          <Link
            href="/refund-policy"
            className="underline decoration-foreground/30 underline-offset-2 hover:text-foreground"
          >
            Cancellation and Refunds policy
          </Link>
          . If you do not agree, please do not use the service.
        </p>
        <p>
          You confirm that you can enter into a binding contract, or that a parent or legal guardian has agreed to these
          terms on your behalf.
        </p>
      </Section>

      <Section id="eligibility" heading="3. Who may use the service">
        <Bullets
          items={[
            <>
              You must be at least <strong>18 years old</strong> to make a contribution. If you are under 18, a parent
              or legal guardian must make it for you.
            </>,
            <>
              If you are between <strong>13 and 18</strong>, you may use the free service only with the consent of a
              parent or legal guardian, who must agree to these terms on your behalf. Where the law requires verifiable
              parental consent for a child’s personal data, we may ask for it before or during sign-up.
            </>,
            <>
              You must not be barred from using the service under any applicable law, and you must not already have had
              an account terminated by us for a serious breach of these terms.
            </>,
          ]}
        />
      </Section>

      <Section id="service" heading="4. What the service is">
        <p>
          {BRAND} is a personal study workspace. It provides a dashboard, a daily study tracker, a focus and session
          timer, task and habit tracking, a study calendar and timetable, coding and DSA progress tracking, notes and
          resources, analytics and reports, and an AI study coach. Features, screens and limits may change as the product
          develops.
        </p>
        <p>
          Your workspace is stored in a cloud database tied to your account and mirrored in your browser so the app
          keeps working when your connection drops. You can export your data at any time from the Reports module as CSV,
          JSON or Markdown.
        </p>
        <Callout>
          <strong>AI output is a suggestion, not advice.</strong> Coach replies are generated automatically and can be
          wrong, incomplete or out of date. Do not rely on them for academic, medical, legal, financial or safety
          decisions, and check anything important against your own sources.
        </Callout>
        <p>
          {BRAND} is a study-organisation tool. It is not affiliated with, endorsed by, or acting on behalf of your
          college, university, board or any examination authority, and it does not provide degrees, credits,
          certifications or guaranteed results.
        </p>
      </Section>

      <Section id="account" heading="5. Your account">
        <Bullets
          items={[
            <>You must provide a valid email address, verify it, and keep your password confidential. One account per person; do not share credentials.</>,
            <>You are responsible for activity under your account. Tell us immediately at {CONTACT.supportEmail} if you believe it has been compromised.</>,
            <>You may delete your account at any time from Settings, or by writing to us. Deletion removes your workspace from our live systems as described in the Privacy Policy.</>,
            <>We may suspend or close an account that breaches these terms, is used for fraud, or is legally required to be removed. Where reasonable, we will tell you why first.</>,
          ]}
        />
      </Section>

      <Section id="contributions" heading="6. Free service and optional contributions">
        <p>
          {CONTRIBUTIONS.summary} You do not have to pay anything to use Study Hall, and no feature is withheld from an
          account that has never paid.
        </p>
        <p>
          If you want to support the project you may leave a <strong>voluntary one-time contribution</strong> from the{' '}
          <Link href="/support" className="underline decoration-foreground/30 underline-offset-2 hover:text-foreground">
            support page
          </Link>
          . A contribution is a gift, not a purchase: no goods or services are supplied in return, no subscription or
          licence is created, and your account, your data and your access stay exactly as they are.
        </p>
        <Bullets
          items={[
            <>
              Contributions are processed by <strong>Razorpay</strong> on our behalf. Razorpay handles your card, UPI,
              net-banking or wallet details; we never see or store your full card number, CVV, UPI PIN or bank
              credentials.
            </>,
            <>
              There is no automatic renewal, mandate or saved instruction. Each contribution is a single payment you
              start yourself, and nothing is charged again unless you choose to contribute again.
            </>,
            <>
              Contributions are <strong>not charitable donations</strong>. We are not registered under section 12A or
              80G of the Income Tax Act, and no contribution is eligible for any tax deduction. {OPERATOR.gstin} is
              stated for identification only.
            </>,
            <>
              You must be 18 or older, or have a parent or guardian make the payment for you, to contribute.
            </>,
            <>
              If a payment is duplicated or taken in error, write to {CONTACT.supportEmail} within{' '}
              {CONTRIBUTIONS.refundWindowDays} days with the payment reference and we will refund it.
            </>,
          ]}
        />
        <p>
          Refunds of contributions are handled under our{' '}
          <Link
            href="/refund-policy"
            className="underline decoration-foreground/30 underline-offset-2 hover:text-foreground"
          >
            Refunds policy
          </Link>
          , which forms part of these terms.
        </p>
      </Section>

      <Section id="acceptable-use" heading="7. Acceptable use">
        <p>You agree not to:</p>
        <Bullets
          items={[
            <>use {BRAND} for anything unlawful, or in a way that infringes another person’s rights;</>,
            <>attempt to access another user’s account, data or workspace, or probe, scan or test the security of the service without written permission;</>,
            <>reverse engineer, decompile, scrape, resell or sublicense the service, or use it to build a competing product;</>,
            <>upload malware, or content that is harassing, defamatory, obscene, or that you do not have the right to share;</>,
            <>place unreasonable load on our systems, circumvent usage limits, or use automated means to create accounts or generate AI replies at scale;</>,
            <>use the AI coach to generate content that is illegal, harmful, or that impersonates a real person;</>,
            <>remove or obscure any copyright, trademark or attribution notice.</>,
          ]}
        />
      </Section>

      <Section id="your-content" heading="8. Your content">
        <p>
          You keep ownership of everything you put into {BRAND} — subjects, logs, notes, tasks, habits, projects, exam
          dates and messages. You grant us a limited licence to store, process, transmit and display that content only
          as needed to run the service for you: syncing it to your account, generating your analytics and reports, and
          sending your prompt and the study figures it relies on to our AI provider when you ask the coach a question.
        </p>
        <p>
          You are responsible for your content and for having the right to store it. We do not read your workspace for
          our own purposes, do not sell it, and do not use it to train AI models. We may access it where you ask us to
          for support, or where the law compels us to.
        </p>
        <p>
          You can export your data at any time. If you delete content or your account, we remove it from our live systems
          as described in the Privacy Policy.
        </p>
      </Section>

      <Section id="intellectual-property" heading="9. Our intellectual property">
        <p>
          The {BRAND} name, logo, interface, code and documentation are owned by us or our licensors and are protected by
          copyright, trademark and other laws. These terms give you a personal, non-exclusive, non-transferable,
          revocable licence to use the service for your own study. No other rights are granted.
        </p>
        <p>
          Third-party names and products mentioned in the app — including fonts, frameworks and AI providers — belong to
          their respective owners and are used only for identification. Our design references the Roboto® RB/25 system
          and uses Inter and IBM Plex Mono, which are distributed under their own licences.
        </p>
        <p>
          If you send us feedback or a suggestion, you allow us to use it without restriction or payment. Please do not
          send us ideas you want to keep confidential.
        </p>
      </Section>

      <Section id="availability" heading="10. Availability and changes">
        <p>
          We work to keep {BRAND} available, but it is provided on an “as is” and “as available” basis. Maintenance,
          third-party outages (including Supabase, Vercel, Razorpay and AI providers), and events outside our control can
          interrupt it. We do not promise uninterrupted or error-free operation, and we do not promise that any specific
          feature will remain available.
        </p>
        <p>
          We may add, change or withdraw features. Nothing you have contributed entitles you to a particular feature
          continuing to exist, because contributions buy no feature in the first place.
        </p>
        <p>
          Keep your own copies of anything you cannot afford to lose. The app exports CSV, JSON and Markdown backups from
          the Reports module, and you are responsible for taking them.
        </p>
      </Section>

      <Section id="disclaimers" heading="11. Disclaimers">
        <p>
          To the extent permitted by law, we exclude all implied warranties, including fitness for a particular purpose
          and non-infringement. We do not warrant that the service will meet your requirements, that study data will be
          free of errors, or that using {BRAND} will improve your grades, results or admission prospects.
        </p>
        <p>
          <strong>Nothing in these terms excludes or limits any right you have as a consumer under the Consumer
          Protection Act, 2019 or any other law that cannot be excluded by agreement.</strong>
        </p>
      </Section>

      <Section id="liability" heading="12. Limitation of liability">
        <p>
          To the extent permitted by law, we are not liable for indirect, incidental, special, consequential or punitive
          loss, or for loss of data, profits, goodwill or opportunity, arising from your use of {BRAND}. Our total
          liability for any claim relating to the service is limited to the greater of (a) the contributions you made in
          the six months before the event giving rise to the claim, or (b) ₹1,000.
        </p>
        <p>
          This section does not limit liability for fraud, wilful misconduct, death or personal injury caused by our
          negligence, or anything else that cannot lawfully be limited. Consumer claims are subject to the Consumer
          Protection Act, 2019 and the rules made under it.
        </p>
      </Section>

      <Section id="indemnity" heading="13. Indemnity">
        <p>
          You agree to indemnify us against claims, losses and reasonable legal costs arising from your content, your
          breach of these terms, or your violation of another person’s rights or of applicable law — but only to the
          extent the claim is caused by your own conduct, and never for claims arising from our own negligence or breach.
        </p>
      </Section>

      <Section id="termination" heading="14. Suspension and termination">
        <p>
          You may stop using {BRAND} at any time and delete your account. We may suspend or terminate your access if you
          materially breach these terms, if we are required to by law, or if continuing would expose other users or us to
          risk. Because nothing is prepaid, termination never leaves you with paid-for time you cannot use.
        </p>
        <p>
          On termination, your right to use the service ends. Sections on your content ownership, disclaimers, liability,
          indemnity, governing law and any payment obligations that accrued before termination survive.
        </p>
      </Section>

      <Section id="law" heading="15. Governing law and disputes">
        <p>
          These terms are governed by the laws of India. Subject to the paragraph below, the courts at{' '}
          {GRIEVANCE.jurisdictionCity} have exclusive jurisdiction.
        </p>
        <p>
          If you have a complaint, write to our grievance officer first — most issues are resolved within days. Under the
          Consumer Protection (E-Commerce) Rules, 2020 we acknowledge consumer complaints within{' '}
          {GRIEVANCE.acknowledgementHours} hours and aim to resolve them within {GRIEVANCE.resolutionDays} days of
          receipt. You keep the right to approach a Consumer Commission, the National Consumer Helpline, or the Data
          Protection Board of India where applicable.
        </p>
      </Section>

      <Section id="changes" heading="16. Changes to these terms">
        <p>
          We may update these terms as the service or the law changes. The “last updated” date at the top always shows
          the current version. If a change materially affects your rights or obligations, we will notify you by email or
          in-app at least 15 days before it takes effect. Continued use after that date means you accept the updated
          terms; if you do not, you may cancel and stop using the service.
        </p>
      </Section>

      <Section id="general" heading="17. General">
        <Bullets
          items={[
            <>If any provision is found unenforceable, the rest stays in force and the unenforceable part is read down to the minimum extent necessary.</>,
            <>Our failure to enforce a provision is not a waiver of it.</>,
            <>You may not transfer your rights under these terms without our written consent; we may transfer ours as part of a merger, acquisition or sale of assets, provided your rights are not reduced.</>,
            <>These terms, the Privacy Policy and the Cancellation and Refunds policy are the entire agreement between us about the service.</>,
            <>Notices to you go to the email address on your account; notices to us go to {CONTACT.supportEmail}.</>,
          ]}
        />
      </Section>

      <Section id="contact" heading="18. Contact us">
        <p>
          {OPERATOR.legalName}
          <br />
          {OPERATOR.address}
          <br />
          Email: {CONTACT.supportEmail} · Phone: {CONTACT.phone}
          <br />
          Grievance officer: {GRIEVANCE.officerName}, {GRIEVANCE.officerDesignation} ({SUPPORT_HOURS})
        </p>
        <p>
          Formal notice should be sent to <Mono>{CONTACT.supportEmail}</Mono> with “Legal notice” in the subject line.
        </p>
      </Section>
    </LegalShell>
  );
}
