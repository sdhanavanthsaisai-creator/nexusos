import type { Metadata } from 'next';
import Link from 'next/link';
import YoupiReturnStatus from '@/components/support/youpi-return-status';
import { BRAND } from '@/lib/legal/config';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Contribution status — ${BRAND}`,
  description: 'The status of your UPI contribution to Study Hall.',
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Landing page for the YOUPI PG return URL.
 *
 * The gateway echoes the return URL we sent, which carries our own order id.
 * The payment id is accepted too, because a gateway build that appends it is
 * both possible and harmless.
 */
export default async function SupportCompletePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const orderId = first(params.order_id) ?? first(params.orderId);
  const paymentId = first(params.payment_id) ?? first(params.paymentId);

  return (
    <main className="relative min-h-screen bg-background px-4 py-10 text-foreground sm:py-14">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/support" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            ← Back to support
          </Link>
          <span className="rounded-full border border-border/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Contribution
          </span>
        </div>

        <header className="mb-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{BRAND}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Thanks for supporting Study Hall</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We are checking the payment with the gateway. You can close this page — the contribution is recorded either
            way, and nothing about your account changes.
          </p>
        </header>

        <YoupiReturnStatus orderId={orderId} paymentId={paymentId} />

        <p className="mt-6 text-center text-[10px] leading-relaxed text-muted-foreground">
          A voluntary contribution, not a purchase. Questions about a payment? Write to us from the{' '}
          <Link href="/contact" className="underline underline-offset-2 hover:text-foreground">
            contact page
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
