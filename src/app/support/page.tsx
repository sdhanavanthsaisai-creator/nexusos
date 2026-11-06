import type { Metadata } from 'next';
import Link from 'next/link';
import { Coffee, HeartHandshake, Server, Sparkles } from 'lucide-react';
import SupportForm from '@/components/support/support-form';
import { BRAND, CONTACT } from '@/lib/legal/config';
import { CONTRIBUTION, isRazorpayConfigured } from '@/lib/support/config';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Support ${BRAND}`,
  description: `${BRAND} is free and stays free. If you would like to support development, you can leave an optional one-time contribution through Razorpay.`,
  robots: { index: true, follow: true },
};

const WHERE_IT_GOES = [
  { icon: Server, title: 'Hosting and database', body: 'Vercel, Supabase and the domain keep the workspace online and in sync.' },
  { icon: Sparkles, title: 'AI coach credits', body: 'Every coach reply costs a fraction of a rupee. Contributions keep it free for everyone.' },
  { icon: Coffee, title: 'Late-night fixes', body: 'Bugs reported on a Sunday get fixed on a Sunday.' },
];

export default function SupportPage() {
  const live = isRazorpayConfigured();

  return (
    <main className="relative min-h-screen bg-background px-4 py-10 text-foreground sm:py-14">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            ← Back to {BRAND}
          </Link>
          <span className="rounded-full border border-border/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Support
          </span>
        </div>

        <header className="mb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{BRAND}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Study Hall is free. All of it.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Every module — the tracker, tasks, habits, calendar, analytics, roadmap, DSA plan, notes and the AI coach —
            is free, with no account upgrade, no trial and no locked features. If the app has been useful and you want
            to keep it that way, you can leave an optional contribution.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
          <section className="glass rounded-3xl border border-border/60 p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <HeartHandshake className="h-4 w-4" aria-hidden="true" />
              Leave a contribution
            </h2>
            <p className="mt-1 mb-4 text-[11px] leading-relaxed text-muted-foreground">
              One-time, any amount, entirely optional. It unlocks nothing because there is nothing to unlock.
            </p>
            {live ? (
              <SupportForm />
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-foreground/[0.03] p-5 text-center">
                <p className="text-xs font-semibold">Contributions aren&apos;t switched on yet</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  The payment gateway is being set up. In the meantime you can write to {CONTACT.supportEmail} — and
                  thank you for wanting to help.
                </p>
              </div>
            )}
          </section>

          <aside className="space-y-3">
            <div className="glass rounded-3xl border border-border/60 p-5">
              <h2 className="text-sm font-semibold">What it covers</h2>
              <ul className="mt-3 space-y-3">
                {WHERE_IT_GOES.map((item) => (
                  <li key={item.title} className="flex gap-2.5">
                    <item.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/70" aria-hidden="true" />
                    <span>
                      <span className="block text-[11px] font-medium">{item.title}</span>
                      <span className="block text-[11px] leading-relaxed text-muted-foreground">{item.body}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass rounded-3xl border border-border/60 p-5">
              <h2 className="text-sm font-semibold">The honest fine print</h2>
              <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
                <li>· This is a voluntary contribution, not a purchase. No goods or services are supplied in return.</li>
                <li>· It is not a charitable donation and not eligible for 80G or any tax deduction.</li>
                <li>· It does not change your account, your data or your access. Nothing is gated either way.</li>
                <li>· Accidental or duplicate charges are refunded — see the{' '}
                  <Link href="/refund-policy" className="underline underline-offset-2 hover:text-foreground">
                    refund policy
                  </Link>
                  .
                </li>
                <li>· {CONTRIBUTION.currency === 'INR' ? 'Indian rupees only' : CONTRIBUTION.currency}, processed by Razorpay.</li>
              </ul>
            </div>
          </aside>
        </div>

        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Legal documents">
          {[
            { href: '/terms', label: 'Terms of Service' },
            { href: '/privacy', label: 'Privacy Policy' },
            { href: '/refund-policy', label: 'Refunds' },
            { href: '/contact', label: 'Contact & Grievance' },
          ].map((doc) => (
            <Link
              key={doc.href}
              href={doc.href}
              className="rounded-full border border-border/60 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              {doc.label}
            </Link>
          ))}
        </nav>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {BRAND} · Built for focus
        </p>
      </div>
    </main>
  );
}
