'use client';

import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Hexagon, KeyRound, LoaderCircle, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSupabaseClient } from '@/lib/supabase';

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function AuthScreen({
  configured,
  initialNotice,
  recovering = false,
  onPasswordUpdated,
}: {
  configured: boolean;
  initialNotice?: string;
  recovering?: boolean;
  onPasswordUpdated?: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState(initialNotice ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const resetForm = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
    setNotice('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!configured) {
      setError('Add the Supabase project URL and anonymous key to .env.local, then restart Next.js.');
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }
    if (password.length > 0 && password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Supabase is not configured. Check the public environment variables and restart the app.');
      return;
    }

    setBusy(true);
    try {
      if (recovering) {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        window.history.replaceState(null, '', window.location.pathname);
        onPasswordUpdated?.();
        setNotice('Password updated. You can continue to your workspace.');
        return;
      }

      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (signUpError) throw signUpError;

        if (data.session?.user.email_confirmed_at) {
          setNotice('Your email is verified. Loading your workspace…');
        } else {
          setMode('signin');
          setPassword('');
          setConfirmPassword('');
          setNotice('Account created. Please check your email to verify your account before logging in.');
        }
        return;
      }

      if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/?flow=recovery`,
        });
        if (resetError) throw resetError;
        setNotice('If an account exists for that email, we sent a password reset link. Check your inbox.');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        if (signInError.code === 'email_not_confirmed' || /email not confirmed/i.test(signInError.message)) {
          throw new Error('Please check your email to verify your account before logging in.');
        }
        throw signInError;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const heading = recovering
    ? 'Choose a new password'
    : mode === 'signup'
      ? 'Create your workspace'
      : mode === 'forgot'
        ? 'Reset your password'
        : 'Welcome back';
  const subheading = recovering
    ? 'Set a new password for your NexusOS account.'
    : mode === 'signup'
      ? 'Your study system, synced securely across devices.'
      : mode === 'forgot'
        ? 'We’ll send a secure reset link to your email.'
        : 'Sign in to continue to your personal study space.';

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <div className="aurora-stage pointer-events-none" aria-hidden="true">
        <div className="aurora-stars" />
        <div className="aurora-blob aurora-blob-a" />
        <div className="aurora-blob aurora-blob-c" />
        <div className="aurora-vignette" />
        <div className="aurora-grain" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-7 flex items-center justify-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-card/60 text-primary shadow-lg backdrop-blur-xl">
            <Hexagon className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-black tracking-tight text-gradient">NEXUS OS</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Your study workspace</p>
          </div>
        </div>

        <section className="glass-strong rounded-[28px] border border-border/60 p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="mb-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {recovering ? <KeyRound className="h-5 w-5" /> : mode === 'forgot' ? <Mail className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{subheading}</p>
          </div>

          {initialNotice && !notice && (
            <p role="status" className="mb-4 rounded-xl border border-primary/20 bg-primary/[0.07] px-3 py-2.5 text-sm text-foreground/90">{initialNotice}</p>
          )}
          {notice && <p role="status" className="mb-4 rounded-xl border border-primary/20 bg-primary/[0.07] px-3 py-2.5 text-sm text-foreground/90">{notice}</p>}
          {error && <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</p>}

          {!configured && (
            <div className="mb-5 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4 text-sm">
              <p className="font-medium">Connect a Supabase project to enable account access.</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">Set <code className="rounded bg-background/70 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="rounded bg-background/70 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>. The project schema is in <code>supabase/schema.sql</code>.</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {!recovering && (
              <label className="block space-y-1.5 text-sm font-medium">
                <span>Email address</span>
                <Input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" disabled={busy || !configured} className="h-11 rounded-xl bg-background/45" />
              </label>
            )}
            {mode !== 'forgot' && (
              <label className="block space-y-1.5 text-sm font-medium">
                <span>{recovering ? 'New password' : 'Password'}</span>
                <Input type="password" autoComplete={recovering ? 'new-password' : mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" disabled={busy || !configured} className="h-11 rounded-xl bg-background/45" />
              </label>
            )}
            {mode === 'signup' && !recovering && (
              <label className="block space-y-1.5 text-sm font-medium">
                <span>Confirm password</span>
                <Input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter your password again" disabled={busy || !configured} className="h-11 rounded-xl bg-background/45" />
              </label>
            )}

            <Button type="submit" disabled={busy || !configured} className="h-11 w-full rounded-xl font-semibold">
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : recovering ? <KeyRound className="h-4 w-4" /> : mode === 'forgot' ? <Mail className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {busy ? 'Please wait…' : recovering ? 'Update password' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}
              {!busy && <ArrowRight className="ml-auto h-4 w-4 opacity-70" />}
            </Button>
          </form>

          {!recovering && configured && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-sm">
              {mode === 'signin' ? (
                <>
                  <button type="button" onClick={() => resetForm('forgot')} className="text-muted-foreground transition hover:text-foreground">Forgot password?</button>
                  <button type="button" onClick={() => resetForm('signup')} className="font-medium text-primary transition hover:text-primary/80">Create an account</button>
                </>
              ) : mode === 'signup' ? (
                <button type="button" onClick={() => resetForm('signin')} className="inline-flex items-center gap-1.5 text-muted-foreground transition hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Back to sign in</button>
              ) : (
                <button type="button" onClick={() => resetForm('signin')} className="inline-flex items-center gap-1.5 text-muted-foreground transition hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Back to sign in</button>
              )}
            </div>
          )}

          <div className="mt-7 flex items-center justify-center gap-1.5 border-t border-border/50 pt-4 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Your study data is private to your account.
          </div>
        </section>
        <p className="mt-5 text-center text-[11px] text-muted-foreground">Built for focus. Designed for your flow.</p>
      </div>
    </main>
  );
}
