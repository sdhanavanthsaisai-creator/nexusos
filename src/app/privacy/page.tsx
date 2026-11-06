import type { Metadata } from 'next';
import Link from 'next/link';
import { Bullets, Callout, LegalShell, Mono, Section } from '@/components/legal/legal-shell';
import { BRAND, CONTACT, GRIEVANCE, OPERATOR, THIRD_PARTIES } from '@/lib/legal/config';

export const metadata: Metadata = {
  title: `Privacy Policy — ${BRAND}`,
  description: `What personal data ${BRAND} collects, why, who it is shared with, how long it is kept, and how to exercise your rights under India’s Digital Personal Data Protection Act, 2023.`,
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      summary={`This notice explains, in plain language, what personal data ${BRAND} collects, why we need it, who processes it, how long we keep it and how you can access, correct or delete it. It is written to meet the notice requirements of India’s Digital Personal Data Protection Act, 2023 and the Digital Personal Data Protection Rules, 2025.`}
    >
      <Section id="controller" heading="1. Who is responsible for your data">
        <p>
          {OPERATOR.legalName}, {OPERATOR.address}, {OPERATOR.country}, is the data fiduciary (controller) for the
          personal data described here. Questions, requests and complaints about privacy go to{' '}
          <Mono>{CONTACT.privacyEmail}</Mono>.
        </p>
        <p>
          This policy covers the {BRAND} web app, the {BRAND} installable app, and this website. It does not cover other
          companies’ sites or apps, even where we link to them.
        </p>
      </Section>

      <Section id="what-we-collect" heading="2. What we collect">
        <p>
          <strong>a. Account data.</strong> Your email address and password. Passwords are handled by our authentication
          provider, Supabase, using industry-standard hashing; we never see your password. We also record whether your
          email is verified and when you last signed in.
        </p>
        <p>
          <strong>b. Profile data you enter.</strong> Your name, university, degree, semester, daily study target and
          weekly coding target, plus your theme and app preferences.
        </p>
        <p>
          <strong>c. Study data you create.</strong> This is the substance of the workspace: subjects, daily logs (study
          minutes per subject, sleep hours, energy, notes), focus sessions, tasks and subtasks, habits and completion
          records, notes, saved resources, exam and deadline entries, your timetable, coding roadmap and projects, DSA
          topic progress, and your coach chat history.
        </p>
        <p>
          <strong>d. AI coach inputs.</strong> When you send a coach message, we transmit your message, the recent
          conversation, and a computed summary of your study figures (such as minutes studied, streaks, and progress
          against targets) to the AI provider selected in Settings. If you choose the Gemini option, the API key you
          entered is sent with that request.
        </p>
        <p>
          <strong>e. Payment data (only if you choose to contribute).</strong> Study Hall has no paid plan; a
          contribution is optional and unlocks nothing. If you make one, Razorpay collects and processes your payment
          instrument, and we receive only a payment identifier, the amount in rupees, the status, and the email you give
          at checkout. <strong>We never receive or store your full card number, CVV, UPI PIN, net-banking password or
          wallet credentials.</strong>
        </p>
        <p>
          <strong>f. Technical data.</strong> Our hosting providers automatically log IP address, browser and device type,
          requested URL, timestamps and error information in order to serve and secure the service.
        </p>
        <Callout>
          <strong>What we do not collect.</strong> We do not use advertising or cross-site tracking cookies, we do not
          build advertising profiles, we do not buy contact lists, we do not access your contacts, photos, files, camera,
          microphone or precise location, and we do not sell or rent personal data to anyone.
        </Callout>
      </Section>

      <Section id="why" heading="3. Why we use it, and on what basis">
        <p>
          Under the DPDP Act we process your data on the basis of your consent, given when you create an account and
          whenever you use an optional feature, and on the basis of the contract between us for the paid plan. The
          purposes are itemised below.
        </p>
        <Bullets
          items={[
            <><strong>Creating and securing your account</strong> — verifying your email, signing you in, resetting your password, and protecting against unauthorised access.</>,
            <><strong>Providing the workspace</strong> — storing, syncing and displaying your study data across your devices, and calculating your analytics and reports.</>,
            <><strong>Answering your coach questions</strong> — sending your prompt and the study summary to the AI provider you selected, only when you send a message.</>,
            <><strong>Processing optional contributions</strong> — taking a payment through Razorpay only when you start one, passing it to receipts, handling refunds and preventing payment fraud.</>,
            <><strong>Support</strong> — responding to your emails and diagnosing problems you report.</>,
            <><strong>Safety and legal compliance</strong> — detecting abuse, enforcing our terms, and meeting record-keeping and tax obligations.</>,
            <><strong>Service improvement</strong> — understanding aggregate, non-identifying usage and error patterns to fix bugs. We do not use your study content or chats to train AI models.</>,
          ]}
        />
        <p>
          You can withdraw consent for optional processing at any time (for example by turning off the AI coach or
          deleting your account). Withdrawal does not affect processing that already happened, and it does not affect
          processing we must do to perform the contract or to comply with law.
        </p>
      </Section>

      <Section id="cookies" heading="4. Cookies and local storage">
        <p>
          We use only what is needed to keep you signed in and to make the app work offline. There are no advertising,
          social-media or analytics-tracking cookies on this service.
        </p>
        <Bullets
          items={[
            <><strong>Authentication cookies and tokens</strong> set by Supabase (for example <Mono>sb-…-auth-token</Mono>) keep your session alive. They are strictly necessary; blocking them signs you out.</>,
            <><strong>Workspace cache</strong> in browser localStorage under <Mono>nexusos-data-v1</Mono> holds a copy of your workspace so the app loads instantly and works offline. It is tied to your account and replaced on sign-in.</>,
            <><strong>Interface state</strong> under <Mono>nexusos-island-v1</Mono> remembers small UI preferences such as the timer panel you last used.</>,
            <><strong>Your Gemini API key</strong>, if you enter one, is stored only in this browser’s localStorage and in the app’s in-memory state. It is sent to Google with each request you make and is never written to our database.</>,
          ]}
        />
        <p>
          Clearing your browser storage removes the local cache and any saved key. Your account data remains in your
          cloud workspace and is loaded again on your next sign-in.
        </p>
      </Section>

      <Section id="sharing" heading="5. Who we share data with">
        <p>
          We do not sell your data. We share it only with service providers who process it on our instructions, and only
          as far as needed for the purpose above:
        </p>
        <Bullets items={THIRD_PARTIES.map((party) => (<><strong>{party.name}</strong> — {party.role}.</>))} />
        <p>
          We may also disclose data where we are legally required to (for example a valid court order or a request from a
          regulator), where necessary to establish or defend legal claims, or to prevent serious harm. If our business is
          sold or merged, your data may transfer to the successor, who must honour this policy; we will tell you before
          that happens.
        </p>
        <p>
          Some providers process data outside India. Where that happens we rely on the providers’ data-processing terms and
          standard contractual clauses, and we share only the minimum needed. AI prompts are sent to the provider you
          choose at the moment you send them.
        </p>
      </Section>

      <Section id="retention" heading="6. How long we keep it">
        <Bullets
          items={[
            <>Your account and workspace are kept while your account is open.</>,
            <>When you delete your account, we delete your profile and workspace from our live database, and your email is released so it can be used again. Encrypted backups are overwritten within 30 days.</>,
            <>Payment records for contributions are kept for as long as tax and accounting law requires, even after account deletion. They contain transaction details, not your card number.</>,
            <>Server logs are kept for a short period for security and debugging, then discarded.</>,
          ]}
        />
      </Section>

      <Section id="security" heading="7. How we protect it">
        <p>
          Data is transmitted over HTTPS and stored in a database with row-level security, so each account can only read
          and write its own records. Access to production systems is limited to the people who need it. Passwords are
          hashed by our authentication provider and payment credentials are handled entirely by Razorpay, a PCI-DSS Level
          1 certified processor.
        </p>
        <p>
          No system is perfectly secure. If a personal data breach occurs, we will notify the Data Protection Board of
          India and affected users as required by the DPDP Act and Rules, describing what happened, what we have done, and
          what you can do.
        </p>
      </Section>

      <Section id="rights" heading="8. Your rights">
        <p>As a data principal under the DPDP Act you can:</p>
        <Bullets
          items={[
            <><strong>Access</strong> a summary of the personal data we hold about you and how it is processed — or simply export it yourself from Reports → CSV / JSON backup.</>,
            <><strong>Correct or complete</strong> inaccurate or incomplete data. Most fields are editable directly in Settings.</>,
            <><strong>Erase</strong> your data by deleting your account in Settings, or by asking us.</>,
            <><strong>Withdraw consent</strong> for optional processing at any time.</>,
            <><strong>Nominate</strong> another person to exercise your rights if you die or become incapacitated.</>,
            <><strong>Complain</strong> to our grievance officer first, and to the Data Protection Board of India if you are not satisfied.</>,
          ]}
        />
        <p>
          Write to <Mono>{CONTACT.privacyEmail}</Mono> from the email address on your account. We verify requests to
          protect your data and respond within 30 days, usually much sooner. There is no charge. If you are contacting us
          from outside India, you also have the rights granted by your local law, and we honour comparable requests.
        </p>
      </Section>

      <Section id="children" heading="9. Children and teenagers">
        <p>
          {BRAND} is built for students, and many of our users are in school or college. We do not knowingly collect
          personal data from children under 13. If you are between 13 and 18, you may use the free service only with the
          consent and supervision of a parent or guardian, and we may ask for verifiable consent before processing your
          data. Paid plans may only be purchased by an adult.
        </p>
        <p>
          We do not carry out behavioural monitoring or targeted advertising of children, and we do not share children’s
          data in any way that the DPDP Act prohibits. A parent or guardian can ask us to review, correct or delete a
          child’s data at {CONTACT.privacyEmail}.
        </p>
      </Section>

      <Section id="ai" heading="10. Automated features">
        <p>
          The AI coach generates replies automatically; it does not make decisions that have legal or similarly
          significant effects on you, and it cannot lock, delete or change your data. Your subscription and account
          status are never decided by an automated system alone.
        </p>
      </Section>

      <Section id="changes" heading="11. Changes to this policy">
        <p>
          We will update this page when our practices or the law change, and the “last updated” date at the top will
          change with it. If a change materially affects how we use your data, we will tell you by email or in-app before
          it applies. Earlier versions are available on request.
        </p>
      </Section>

      <Section id="grievance" heading="12. Grievance officer and contact">
        <p>
          <strong>Grievance officer:</strong> {GRIEVANCE.officerName}, {GRIEVANCE.officerDesignation}
          <br />
          <strong>Email:</strong> {CONTACT.privacyEmail} · <strong>Phone:</strong> {CONTACT.phone}
          <br />
          <strong>Address:</strong> {OPERATOR.legalName}, {OPERATOR.address}
        </p>
        <p>
          We acknowledge complaints within {GRIEVANCE.acknowledgementHours} hours and aim to resolve them within{' '}
          {GRIEVANCE.resolutionDays} days. If you are not satisfied, you may complain to the Data Protection Board of
          India. Our{' '}
          <Link href="/contact" className="underline decoration-foreground/30 underline-offset-2 hover:text-foreground">
            contact page
          </Link>{' '}
          sets out the full escalation path, and our{' '}
          <Link href="/terms" className="underline decoration-foreground/30 underline-offset-2 hover:text-foreground">
            Terms of Service
          </Link>{' '}
          explain the rest of our agreement with you.
        </p>
      </Section>
    </LegalShell>
  );
}
