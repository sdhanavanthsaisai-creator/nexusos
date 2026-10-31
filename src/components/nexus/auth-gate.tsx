'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';
import { LoaderCircle, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthScreen from '@/components/nexus/auth-screen';
import OnboardingWizard from '@/components/nexus/onboarding-wizard';
import { CloudSyncContext, type CloudSyncState } from '@/components/nexus/cloud-context';
import { createEmptySnapshot, getSupabaseClient, isCloudSnapshot, snapshotForCloud } from '@/lib/supabase';
import type { NexusData } from '@/lib/nexus/types';
import { useNexus } from '@/lib/nexus/store';

type GateStatus = 'checking' | 'auth' | 'onboarding' | 'ready';
type ProfileStatus = { exists: boolean; completed: boolean; plan: unknown };

export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Without a configured account service there is no signed-in session to
  // check, so start on the sign-in screen instead of a shared local workspace.
  const accountServiceReady = Boolean(getSupabaseClient());
  const [gate, setGate] = useState<GateStatus>(accountServiceReady ? 'checking' : 'auth');
  const [user, setUser] = useState<User | null>(null);
  const [syncState, setSyncState] = useState<CloudSyncState>(accountServiceReady ? 'connecting' : 'offline');
  const [notice, setNotice] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [recoverError, setRecoverError] = useState('');
  const revisionRef = useRef('');
  const dirtyRef = useRef(false);
  const lastProfileRef = useRef<ProfileStatus | null>(null);
  const hydratedUserRef = useRef<string | null>(null);
  const nexusHydrated = useNexus((state) => state._hydrated);
  const recoveryFlow = searchParams.get('flow') === 'recovery';
  const authError = searchParams.get('auth_error');
  const initialNotice = searchParams.get('notice');
  const paramNotice = authError === 'config'
    ? 'Supabase returned the email link without creating a session. Confirm that the email template links to /auth/confirm with token_hash and type.'
    : authError === 'verification'
      ? 'That verification link is invalid or expired. Request a new email link to continue.'
      : initialNotice ?? '';
  const displayNotice = notice || paramNotice;

  useEffect(() => {
    const root = document.documentElement;
    if (gate !== 'ready') {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      const theme = useNexus.getState().settings.theme;
      root.setAttribute('data-theme', theme);
      root.classList.toggle('dark', ['dark', 'oled', 'cyberpunk'].includes(theme));
      root.style.colorScheme = ['dark', 'oled', 'cyberpunk'].includes(theme) ? 'dark' : 'light';
    }
  }, [gate]);

  useEffect(() => {
    if (!authError && !initialNotice) return;
    router.replace('/');
  }, [authError, initialNotice, router]);

  const checkAccount = useCallback(async (current: User) => {
    if (!current.email_confirmed_at) {
      await getSupabaseClient()?.auth.signOut();
      setUser(null);
      setNotice('Please check your email to verify your account before logging in.');
      setGate('auth');
      setSyncState('offline');
      return;
    }

    setUser(current);
    setSyncState('connecting');
    const supabase = getSupabaseClient();
    let profileStatus: ProfileStatus | null = null;
    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, onboarding')
        .eq('id', current.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
        setSyncState('error');
        setNotice(`Could not read your account profile (${error.message}). Run supabase/schema.sql in your project and try again.`);
        setGate('auth');
        return;
      }
      profileStatus = data
        ? { exists: true, completed: data.onboarding_completed === true, plan: data.onboarding }
        : null;
      lastProfileRef.current = profileStatus;

      const { data: cloudRow, error: cloudError } = await supabase
        .from('user_state')
        .select('payload,revision,updated_at')
        .eq('user_id', current.id)
        .maybeSingle();

      const hasCloudSnapshot = !cloudError && cloudRow && isCloudSnapshot({ payload: cloudRow.payload, updated_at: cloudRow.updated_at });
      if (hasCloudSnapshot && cloudRow.revision !== revisionRef.current) {
        const payload = cloudRow.payload;
        useNexus.setState({
          ...payload,
          settings: { ...payload.settings, geminiKey: '' },
        });
        revisionRef.current = String(cloudRow.revision);
        dirtyRef.current = false;
      } else if (cloudError && cloudError.code !== 'PGRST116' && cloudError.code !== '42P01') {
        setSyncState('error');
        setNotice(`Could not load your cloud workspace (${cloudError.message}). Your on-device copy is preserved; run supabase/schema.sql, then retry.`);
        setGate('auth');
        return;
      } else if (!hasCloudSnapshot) {
        // Local storage is shared by this browser origin, not by account. Never
        // use its demo or previous-account contents to initialize a new account.
        useNexus.setState(createEmptySnapshot());
        dirtyRef.current = true;
        if (profileStatus?.completed) {
          profileStatus = { ...profileStatus, completed: false };
          lastProfileRef.current = profileStatus;
        }
      }

      if (!cloudRow) dirtyRef.current = true;
      if (profileStatus?.completed) {
        setSyncState('synced');
        setNotice('');
        setGate('ready');
      } else {
        setSyncState('synced');
        setGate('onboarding');
      }
      hydratedUserRef.current = current.id;
      return;
    }

    // Supabase is optional while developing and remains an offline, local-first
    // NexusOS when the project keys have not been configured.
    // Without Supabase, never fall back to a shared browser-local workspace for
    // public users. Authentication and per-account persistence are required.
    setSyncState('error');
    setNotice('Account services are not configured. Please try again later.');
    setGate('auth');
    hydratedUserRef.current = current.id;
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let active = true;
    const setUserAndCheck = (nextUser: User | null) => {
      if (!active) return;
      if (!nextUser) {
        setUser(null);
        setGate('auth');
        setSyncState('offline');
        dirtyRef.current = false;
        hydratedUserRef.current = null;
        return;
      }
      if (hydratedUserRef.current === nextUser.id) return;
      void checkAccount(nextUser);
    };

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setSyncState('error');
        setGate('auth');
        setNotice(error.message);
      } else {
        setUserAndCheck(data.session?.user ?? null);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer Supabase queries outside its synchronous auth event callback.
      window.setTimeout(() => setUserAndCheck(session?.user ?? null), 0);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [checkAccount, nexusHydrated]);

  useEffect(() => {
    if (gate !== 'ready' || !user || !nexusHydrated) return;
    let timer: number | undefined;
    const unsubscribe = useNexus.subscribe((state, previous) => {
      if (state._hydrated === previous._hydrated) dirtyRef.current = true;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const supabase = getSupabaseClient();
        if (!supabase || !dirtyRef.current) return;
        setSyncState('syncing');
        const snapshot = useNexus.getState();
        const payload = snapshotForCloud(Object.fromEntries(Object.entries(snapshot).filter(([key]) => !key.startsWith('_') && typeof snapshot[key as keyof typeof snapshot] !== 'function')) as unknown as NexusData);
        void supabase.from('user_state').upsert({ user_id: user.id, payload }, { onConflict: 'user_id' }).then(({ error }) => {
          if (error) {
            setSyncState('error');
            setNotice(`Cloud save failed. Your changes are saved on this device and will retry when connectivity returns. (${error.message})`);
          } else {
            dirtyRef.current = false;
            setSyncState('synced');
            setNotice('');
          }
        });
      }, 900);
    });

    const onOnline = () => {
      if (!dirtyRef.current) {
        setSyncState('synced');
        return;
      }
      const snapshot = useNexus.getState();
      const payload = snapshotForCloud(Object.fromEntries(Object.entries(snapshot).filter(([key]) => !key.startsWith('_') && typeof snapshot[key as keyof typeof snapshot] !== 'function')) as unknown as NexusData);
      setSyncState('syncing');
      const supabase = getSupabaseClient();
      if (!supabase) return;
      void supabase.from('user_state').upsert({ user_id: user.id, payload }, { onConflict: 'user_id' }).then(({ error }) => {
        setSyncState(error ? 'error' : 'synced');
        if (!error) dirtyRef.current = false;
      });
    };
    const onOffline = () => setSyncState('offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      unsubscribe();
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [gate, nexusHydrated, user]);

  const finishOnboarding = useCallback(() => {
    const profile = useNexus.getState().profile;
    if (user) {
      void getSupabaseClient()?.from('profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: profile.name,
        university: profile.university,
        degree: profile.degree,
        semester: profile.semester,
        daily_target_hours: profile.dailyTargetHours,
        weekly_coding_target_hours: profile.weeklyCodingTargetHours,
        theme_preference: useNexus.getState().settings.theme,
        dsa_active: useNexus.getState().dsaActive,
        onboarding_completed: true,
      }).then(({ error }) => {
        if (error) {
          setSyncState('error');
          setNotice(`Your plan is saved locally, but the onboarding profile could not sync (${error.message}).`);
          toast.error('Profile sync needs attention');
        }
      });
    }
    lastProfileRef.current = { exists: true, completed: true, plan: null };
    setGate('ready');
  }, [user]);

  useEffect(() => {
    const handle = (event: StorageEvent) => {
      if (event.key === 'supabase.auth.token' || event.key?.startsWith('sb-')) {
        hydratedUserRef.current = null;
        void getSupabaseClient()?.auth.getUser().then(({ data }) => {
          if (data.user) void checkAccount(data.user);
        });
      }
    };
    window.addEventListener('storage', handle);
    return () => window.removeEventListener('storage', handle);
  }, [checkAccount]);

  if (gate === 'checking') {
    return <div className="grid min-h-screen place-items-center bg-background text-foreground"><div className="flex items-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Checking your secure workspace…</div></div>;
  }

  if (gate === 'auth') {
    return <AuthScreen configured={accountServiceReady} initialNotice={displayNotice} recovering={recovering || recoveryFlow} onPasswordUpdated={() => { setRecovering(false); router.replace('/'); }} />;
  }

  if (gate === 'onboarding') {
    return <OnboardingWizard onComplete={finishOnboarding} />;
  }

  const signOut = async () => {
    await getSupabaseClient()?.auth.signOut();
    setUser(null);
    hydratedUserRef.current = null;
    setGate('auth');
    toast.success('Signed out of NexusOS');
  };

  return (
    <CloudSyncContext.Provider value={syncState}>
      {children}
      {user && <div className="fixed right-3 top-3 z-[80] flex items-center gap-1 rounded-full border border-border/60 bg-background/75 px-2 py-1 text-[10px] text-muted-foreground shadow-lg backdrop-blur-md"><ShieldCheck className="h-3 w-3 text-primary" /><span className="hidden max-w-32 truncate sm:inline">{user.email}</span><Button type="button" variant="ghost" size="icon" onClick={signOut} className="-my-1 ml-1 h-6 w-6 rounded-full" aria-label="Sign out"><LogOut className="h-3 w-3" /></Button></div>}
      {syncState === 'error' && displayNotice && <div role="status" className="fixed inset-x-3 bottom-3 z-[80] mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-amber-500/30 bg-background/95 px-4 py-3 text-xs text-muted-foreground shadow-2xl backdrop-blur-xl">          <RefreshCw className="h-4 w-4 shrink-0 text-amber-400" /><span className="flex-1">{displayNotice}</span><Button type="button" size="sm" variant="outline" onClick={() => { setSyncState(navigator.onLine ? 'connecting' : 'offline'); if (user) void checkAccount(user); }} className="h-7 rounded-lg">Retry</Button></div>}
    </CloudSyncContext.Provider>
  );
}
