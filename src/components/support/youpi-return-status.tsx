'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { formatInr } from '@/lib/support/config';

type Phase = 'pending' | 'success' | 'failed' | 'expired' | 'cancelled' | 'unknown';

const POLL_MS = 3_000;
/** ~2 minutes. The gateway's own verification window is 30 seconds. */
const MAX_ATTEMPTS = 40;

function phaseFor(status: string): Phase {
  switch (status) {
    case 'SUCCESS':
      return 'success';
    case 'FAILED':
      return 'failed';
    case 'EXPIRED':
      return 'expired';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'pending';
  }
}

export default function YoupiReturnStatus({
  orderId,
  paymentId,
}: {
  orderId?: string;
  paymentId?: string;
}) {
  // The gateway echoes our return URL, so one of these is normally present. If
  // neither is, there is nothing to poll and the page says so straight away
  // rather than rendering a spinner that can never resolve.
  const identifier = paymentId
    ? `payment_id=${encodeURIComponent(paymentId)}`
    : orderId
      ? `order_id=${encodeURIComponent(orderId)}`
      : '';

  const [phase, setPhase] = useState<Phase>(identifier ? 'pending' : 'unknown');
  const [amountPaise, setAmountPaise] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const confettiFired = useRef(false);

  const poll = useCallback(async (): Promise<Phase> => {
    const res = await fetch(`/api/support/youpi/status?${identifier}`, { cache: 'no-store' });
    if (!res.ok) {
      // A row can lag the gateway by a moment after the redirect, so a 404 on
      // the first tries is not an error — keep polling.
      return 'pending';
    }
    const data = (await res.json()) as { status?: string; amountPaise?: number | null };
    if (typeof data.amountPaise === 'number') setAmountPaise(data.amountPaise);
    return phaseFor(String(data.status ?? ''));
  }, [identifier]);

  useEffect(() => {
    if (!identifier) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = async (count: number) => {
      if (cancelled) return;
      let next: Phase = 'pending';
      try {
        next = await poll();
      } catch {
        next = 'pending';
      }
      if (cancelled) return;
      setAttempts(count);

      if (next !== 'pending') {
        setPhase(next);
        return;
      }
      if (count >= MAX_ATTEMPTS) {
        setPhase('unknown');
        return;
      }
      timer = setTimeout(() => void run(count + 1), POLL_MS);
    };

    void run(1);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [identifier, poll]);

  useEffect(() => {
    if (phase !== 'success' || confettiFired.current) return;
    confettiFired.current = true;
    void confetti({
      particleCount: 120,
      spread: 75,
      origin: { y: 0.65 },
      colors: ['#FFFFFF', '#C9C9C9', '#F1F1F1'],
      disableForReducedMotion: true,
    });
  }, [phase]);

  const heading =
    phase === 'success'
      ? 'Contribution received'
      : phase === 'failed'
        ? 'That payment did not go through'
        : phase === 'expired'
          ? 'The payment window closed'
          : phase === 'cancelled'
            ? 'Payment cancelled'
            : phase === 'unknown'
              ? 'Still confirming'
              : 'Confirming your payment';

  const body =
    phase === 'success'
      ? `${amountPaise ? formatInr(amountPaise / 100) : 'Your contribution'} reached us. Thank you — nothing about your account changes, because Study Hall is free either way.`
      : phase === 'failed'
        ? 'Nothing was recorded as paid. If your bank shows a debit, it is normally reversed within a few business days — write to us with the UTR if it is not.'
        : phase === 'expired'
          ? 'The gateway closes a session after five minutes. Nothing was charged — you can start again from the support page.'
          : phase === 'cancelled'
            ? 'You closed the checkout before paying. Nothing was charged.'
            : phase === 'unknown'
              ? 'We could not confirm this within two minutes. If your UPI app shows the payment as successful, it is recorded on our side — send us the UTR and we will match it.'
              : 'The gateway is checking the bank credit alert. This usually takes a few seconds — keep this page open.';

  const tone =
    phase === 'success'
      ? 'border-foreground/25 bg-foreground/[0.06]'
      : phase === 'failed' || phase === 'expired' || phase === 'cancelled'
        ? 'border-border/60 bg-foreground/[0.03]'
        : 'border-border/60 bg-foreground/[0.04]';

  return (
    <div className={`rounded-2xl border p-6 text-center ${tone}`}>
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-foreground/20 bg-foreground/[0.06]">
        {phase === 'success' ? (
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        ) : phase === 'pending' ? (
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        ) : phase === 'unknown' ? (
          <Clock className="h-6 w-6" aria-hidden="true" />
        ) : (
          <XCircle className="h-6 w-6" aria-hidden="true" />
        )}
      </span>

      <p className="mt-3 text-sm font-semibold" role="status" aria-live="polite">
        {heading}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>

      {phase === 'pending' && attempts > 1 && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          checked {attempts} times
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/support"
          className="rounded-full border border-border/60 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Back to support
        </Link>
        <Link
          href="/"
          className="rounded-full border border-border/60 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Open Study Hall
        </Link>
      </div>
    </div>
  );
}
