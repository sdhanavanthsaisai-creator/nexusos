import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { BRAND, LEGAL_EFFECTIVE, LEGAL_UPDATED, hasUnfilledPlaceholders } from '@/lib/legal/config';

const DOCS = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/refund-policy', label: 'Refunds' },
  { href: '/contact', label: 'Contact & Grievance' },
];

/**
 * Shared shell for the public legal pages. These routes render outside the
 * signed-in app so they can be linked from the App Store listing, the Razorpay
 * review and the marketing site.
 */
export function LegalShell({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <main className="relative min-h-screen bg-background px-4 py-10 text-foreground sm:py-14">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to {BRAND}
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <FileText className="h-3 w-3" aria-hidden="true" />
            Legal
          </span>
        </div>

        <header className="mb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{BRAND}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{summary}</p>
          <p className="mt-3 font-mono text-[11px] text-muted-foreground">
            Last updated {LEGAL_UPDATED} · Effective {LEGAL_EFFECTIVE}
          </p>
        </header>

        {hasUnfilledPlaceholders() && (
          <div className="mb-6 rounded-2xl border border-dashed border-foreground/40 bg-foreground/[0.04] p-4">
            <p className="text-xs font-semibold">Draft — operator details still missing</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Anything shown in square brackets has not been filled in yet. Do not publish, and do not start taking
              payments, until every bracket is replaced with real information.
            </p>
          </div>
        )}

        <article className="glass space-y-7 rounded-3xl border border-border/60 p-6 sm:p-8">{children}</article>

        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Legal documents">
          {DOCS.map((doc) => (
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

export function Section({ id, heading, children }: { id: string; heading: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 space-y-2.5">
      <h2 className="text-base font-semibold tracking-tight sm:text-lg">{heading}</h2>
      <div className="space-y-2.5 text-sm leading-relaxed text-foreground/80">{children}</div>
    </section>
  );
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="ml-4 list-disc space-y-1.5 marker:text-foreground/40">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-foreground/[0.04] px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground/80">
      {children}
    </div>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className="rounded bg-foreground/[0.08] px-1 py-0.5 font-mono text-[12px]">{children}</span>;
}
