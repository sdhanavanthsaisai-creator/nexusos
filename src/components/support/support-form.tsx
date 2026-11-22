'use client';

import { useState } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  CreditCard,
  HeartHandshake,
  Loader2,
  Lock,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { CONTRIBUTION, formatInr } from '@/lib/support/config';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'loading' | 'done' | 'error';
type Method = 'youpi' | 'razorpay';

interface CheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void; confirm_close?: boolean };
}

interface CheckoutInstance {
  open: () => void;
  on: (event: string, handler: () => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: CheckoutOptions) => CheckoutInstance;
  }
}

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let checkoutPromise: Promise<boolean> | null = null;

function loadCheckout(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (checkoutPromise) return checkoutPromise;
  checkoutPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      checkoutPromise = null;
      resolve(false);
    };
    document.head.appendChild(script);
  });
  return checkoutPromise;
}

interface SupportFormProps {
  /** YOUPI PG is configured on the server, so UPI can be offered. */
  youpiAvailable?: boolean;
  /** Razorpay credentials are present, so cards and net banking can be offered. */
  razorpayAvailable?: boolean;
}

export default function SupportForm({
  youpiAvailable = false,
  razorpayAvailable = true,
}: SupportFormProps) {
  const [presetId, setPresetId] = useState<string>(CONTRIBUTION.presets[1].id);
  const [custom, setCustom] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [method, setMethod] = useState<Method>(youpiAvailable ? 'youpi' : 'razorpay');
  const [paidWith, setPaidWith] = useState<Method>(youpiAvailable ? 'youpi' : 'razorpay');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  // Stays true while the Razorpay modal is open, so a second click cannot
  // create a duplicate order behind it.
  const [panelOpen, setPanelOpen] = useState(false);

  const bothAvailable = youpiAvailable && razorpayAvailable;
  const selectedPreset = CONTRIBUTION.presets.find((p) => p.id === presetId);
  const shownAmount = useCustom ? Number.parseInt(custom, 10) : (selectedPreset?.amountInr ?? 0);
  const amountValid =
    Number.isFinite(shownAmount) &&
    shownAmount >= CONTRIBUTION.minAmountInr &&
    shownAmount <= CONTRIBUTION.maxAmountInr;

  const amountPayload = () =>
    useCustom ? { amountInr: shownAmount } : { presetId };

  const thank = (amountInr: number) => {
    setStatus('done');
    setMessage(`${formatInr(amountInr)} received. Thank you — it genuinely helps.`);
    void confetti({
      particleCount: 120,
      spread: 75,
      origin: { y: 0.65 },
      colors: ['#FFFFFF', '#C9C9C9', '#F1F1F1'],
      disableForReducedMotion: true,
    });
  };

  /**
   * UPI through YOUPI PG. The server creates the session and hands back a
   * hosted checkout URL; this browser is redirected there and the gateway
   * authenticates the payer itself, so nothing sensitive passes through here.
   */
  const payWithYoupi = async () => {
    setPaidWith('youpi');
    try {
      const res = await fetch('/api/support/youpi/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(amountPayload()),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setStatus('error');
        setMessage(data.message ?? 'This did not go through. Please try again.');
        return;
      }

      const session = (await res.json()) as { checkoutUrl?: string };
      if (!session.checkoutUrl) {
        setStatus('error');
        setMessage('The UPI gateway did not return a checkout page. Please try again.');
        return;
      }

      setMessage('Taking you to the secure UPI page…');
      window.location.assign(session.checkoutUrl);
    } catch {
      setStatus('error');
      setMessage('Something went wrong starting the UPI payment. Please try again.');
    }
  };

  const payWithRazorpay = async () => {
    setPaidWith('razorpay');

    const ready = await loadCheckout();
    if (!ready) {
      setStatus('error');
      setMessage(
        'Could not load the secure payment window. Check your connection or an ad blocker, then try again.',
      );
      return;
    }

    const res = await fetch('/api/support/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(amountPayload()),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setStatus('error');
      setMessage(data.message ?? 'This did not go through. Please try again.');
      return;
    }

    const order = (await res.json()) as {
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
      description: string;
    };

    const checkout = new window.Razorpay!({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: 'Study Hall',
      description: order.description,
      theme: { color: '#000000' },
      notes: { purpose: CONTRIBUTION.purpose },
      handler: (response) => {
        setPanelOpen(false);
        void (async () => {
          const verify = await fetch('/api/support/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          });
          const result = (await verify.json().catch(() => ({ ok: false }))) as { ok?: boolean };
          if (result.ok) {
            thank(order.amount / 100);
          } else {
            setStatus('error');
            setMessage(
              'Payment went through but we could not confirm it here. It will still appear in your bank statement and in our Razorpay dashboard.',
            );
          }
        })();
      },
      modal: {
        confirm_close: true,
        ondismiss: () => {
          setPanelOpen(false);
          setStatus('idle');
        },
      },
    });

    checkout.on('payment.failed', () => {
      setPanelOpen(false);
      setStatus('error');
      setMessage('That payment failed. Nothing was charged — you can try again.');
    });

    checkout.open();
    setPanelOpen(true);
    setStatus('idle');
  };

  const contribute = async () => {
    setStatus('loading');
    setMessage('');
    try {
      if (method === 'youpi') await payWithYoupi();
      else await payWithRazorpay();
    } catch {
      setStatus('error');
      setMessage('Something went wrong starting the payment. Please try again.');
    }
  };

  if (status === 'done') {
    return (
      <div className="rounded-2xl border border-border/60 bg-foreground/[0.04] p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-foreground/20 bg-foreground/[0.06]">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-semibold">Thank you — contribution received</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{message}</p>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Nothing changes in your account — Study Hall stays exactly as free as it was.
          {paidWith === 'razorpay' ? ' A receipt is emailed by Razorpay.' : ''}
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus('idle');
            setMessage('');
          }}
          className="mt-4 rounded-full border border-border/60 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Contribute again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bothAvailable && (
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Payment method">
          <button
            type="button"
            role="radio"
            aria-checked={method === 'youpi'}
            onClick={() => setMethod('youpi')}
            className={cn(
              'rounded-xl border px-3 py-2.5 text-left transition-colors',
              method === 'youpi'
                ? 'border-foreground/50 bg-foreground/[0.08]'
                : 'border-border/60 hover:border-foreground/30',
            )}
          >
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
              UPI
            </span>
            <span className="mt-0.5 block text-[10px] text-muted-foreground">GPay, PhonePe, Paytm, any UPI app</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={method === 'razorpay'}
            onClick={() => setMethod('razorpay')}
            className={cn(
              'rounded-xl border px-3 py-2.5 text-left transition-colors',
              method === 'razorpay'
                ? 'border-foreground/50 bg-foreground/[0.08]'
                : 'border-border/60 hover:border-foreground/30',
            )}
          >
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
              Card / net banking
            </span>
            <span className="mt-0.5 block text-[10px] text-muted-foreground">Visa, Mastercard, RuPay, wallets</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {CONTRIBUTION.presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => {
              setUseCustom(false);
              setPresetId(preset.id);
            }}
            aria-pressed={!useCustom && presetId === preset.id}
            className={cn(
              'rounded-xl border px-3 py-3 text-left transition-colors',
              !useCustom && presetId === preset.id
                ? 'border-foreground/50 bg-foreground/[0.08]'
                : 'border-border/60 hover:border-foreground/30',
            )}
          >
            <span className="block font-mono text-lg tabular-nums">{formatInr(preset.amountInr)}</span>
            <span className="block text-[11px] text-muted-foreground">{preset.label}</span>
          </button>
        ))}
      </div>

      <div
        className={cn(
          'rounded-xl border px-3 py-3 transition-colors',
          useCustom ? 'border-foreground/50 bg-foreground/[0.08]' : 'border-border/60',
        )}
      >
        <label htmlFor="custom-amount" className="flex items-center justify-between gap-3 text-xs">
          <span>Choose your own amount</span>
          <input
            id="custom-amount"
            type="number"
            inputMode="numeric"
            min={CONTRIBUTION.minAmountInr}
            max={CONTRIBUTION.maxAmountInr}
            step={1}
            value={custom}
            onFocus={() => setUseCustom(true)}
            onChange={(event) => {
              setCustom(event.target.value);
              setUseCustom(true);
            }}
            placeholder={`₹${CONTRIBUTION.minAmountInr}+`}
            className="w-28 rounded-lg border border-border/60 bg-transparent px-2 py-1.5 text-right font-mono text-sm tabular-nums outline-none focus:border-foreground/40"
          />
        </label>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Between {formatInr(CONTRIBUTION.minAmountInr)} and {formatInr(CONTRIBUTION.maxAmountInr)}.{' '}
          {method === 'youpi' ? 'Pay from any UPI app.' : 'UPI, cards, net banking and wallets all work.'}
        </p>
      </div>

      <button
        type="button"
        onClick={() => void contribute()}
        disabled={status === 'loading' || panelOpen || !amountValid}
        aria-busy={status === 'loading'}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === 'loading' || panelOpen ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <HeartHandshake className="h-4 w-4" aria-hidden="true" />
        )}
        {status === 'loading'
          ? method === 'youpi'
            ? 'Opening UPI checkout…'
            : 'Opening secure checkout…'
          : panelOpen
            ? 'Payment window open'
            : amountValid
              ? method === 'youpi'
                ? `Pay ${formatInr(shownAmount)} by UPI`
                : `Contribute ${formatInr(shownAmount)}`
              : 'Enter an amount'}
      </button>

      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          {method === 'youpi' ? 'UPI via YOUPI PG' : 'Secured by Razorpay'}
        </span>
        <span aria-hidden="true">•</span>
        <span className="flex items-center gap-1">
          <Lock className="h-3 w-3" aria-hidden="true" />
          256-bit SSL encrypted
        </span>
      </p>

      {status === 'error' && message && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-xl border border-border/60 bg-foreground/[0.04] px-3 py-2 text-[11px] leading-relaxed text-muted-foreground"
        >
          {message}
        </p>
      )}

      <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground">
        <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
        <span>
          {method === 'youpi'
            ? 'The UPI payment is collected and confirmed by YOUPI PG, the payment gateway we run. We never see your UPI PIN, card number or bank credentials.'
            : 'Payments are processed securely by Razorpay. We never see your card number, CVV, UPI PIN or bank credentials.'}{' '}
          By continuing you agree to our{' '}
          <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/refund-policy" className="underline underline-offset-2 hover:text-foreground">
            refund policy
          </Link>
          .
        </span>
      </p>
    </div>
  );
}
