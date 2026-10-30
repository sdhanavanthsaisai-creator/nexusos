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
import { getSupabaseClient, isCloudSnapshot } from '@/lib/supabase';
import type { NexusData } from '@/lib/nexus/types';
import { useNexus } from '@/lib/nexus/store';
import { buildSeed } from '@/lib/nexus/seed';

const LOCAL_ONBOARDING_KEY = 'nexusos-onboarding-complete-v1';

type GateStatus = 'checking' | 'auth' | 'onboarding' | 'ready';
type ProfileStatus = { exists: boolean; completed: boolean; plan: unknown };

function readLocalOnboardingStatus() {
  try {
    return window.localStorage.getItem(LOCAL_ONBOARDING_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [gate, setGate] = useState<GateStatus>('checking');
  const [user, setUser] = useState<User | null>(null);
  const [syncState, setSyncState] = useState<CloudSyncState>('connecting');
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
    setNotice(authError === 'config'
      ? 'Supabase returned the email link without creating a session. Confirm that the email template links to /auth/confirm with token_hash and type.'
      : authError === 'verification'
        ? 'That verification link is invalid or expired. Request a new email link to continue.'
        : initialNotice ?? '');
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

      if (!cloudError && cloudRow && cloudRow.revision !== revisionRef.current && isCloudSnapshot({ payload: cloudRow.payload, updated_at: cloudRow.updated_at })) {
        useNexus.setState(cloudRow.payload);
        revisionRef.current = String(cloudRow.revision);
        dirtyRef.current = false;
      } else if (cloudError && cloudError.code !== 'PGRST116' && cloudError.code !== '42P01') {
        setSyncState('error');
        setNotice(`Could not load your cloud workspace (${cloudError.message}). Your on-device copy is preserved; run supabase/schema.sql, then retry.`);
        setGate('auth');
        return;
      } else if (profileStatus?.completed && (!cloudRow || !isCloudSnapshot({ payload: cloudRow.payload, updated_at: cloudRow.updated_at }))) {
        // First login from another device before a complete snapshot exists: a
        // completed plan still seeds this account, but never ship demo histories.
        const local = useNexus.getState();
        const seed = buildSeed();
        useNexus.setState({
          ...seed,
          profile: { ...seed.profile, ...local.profile },
          settings: { ...seed.settings, ...local.settings },
          dailyLogs: {}, sessions: [], tasks: [], habits: [], habitRecords: {}, projects: [],
          notes: [], resources: [], exams: [], timetable: { ...seed.timetable, events: [] },
        });
        dirtyRef.current = true;
      }

      if (!profileStatus && readLocalOnboardingStatus()) {
        const local = useNexus.getState();
        const { error: saveError } = await supabase.from('profiles').upsert({
          id: current.id,
          email: current.email,
          full_name: local.profile.name,
          university: local.profile.university,
          degree: local.profile.degree,
          semester: local.profile.semester,
          daily_target_hours: local.profile.dailyTargetHours,
          weekly_coding_target_hours: local.profile.weeklyCodingTargetHours,
          theme_preference: local.settings.theme,
          dsa_active: local.dsaActive,
          onboarding_completed: true,
          onboarding: { migrated_from_local: true },
        });
        if (saveError) {
          setSyncState('error');
          setNotice(`Could not migrate your plan settings to Supabase (${saveError.message}).`);
          setGate('auth');
          return;
        }
        profileStatus = { exists: true, completed: true, plan: { migrated_from_local: true } };
        lastProfileRef.current = profileStatus;
        dirtyRef.current = true;
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
    const localComplete = readLocalOnboardingStatus();
    setSyncState('offline');
    setGate(localComplete ? 'ready' : 'onboarding');
    hydratedUserRef.current = current.id;
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setSyncState('offline');
      if (nexusHydrated) {
        setGate((current) => current === 'checking' ? (readLocalOnboardingStatus() ? 'ready' : 'onboarding') : current);
      }
      return;
    }
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
        const payload = Object.fromEntries(Object.entries(snapshot).filter(([key]) => !key.startsWith('_') && typeof snapshot[key as keyof typeof snapshot] !== 'function')) as unknown as NexusData;
        void supabase.from('user_state').upsert({ user_id: user.id, payload }, { onConflict: 'user_id' }).then(({ error }) => {
          if (error) {
            setSyncState('error');
            setNotice(`Cloud save failed. Your changes are saved on this device and will retry when connectivity returns. (${error.message})`);
          } else {
            dirtyRef.current = false;
            setSyncState('synced');
            setNotice('');
            const completed = lastProfileRef.current?.completed === true;
            if (completed) {
              const { error: profileError } = { error: null as null };
              void profileError;
            }
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
      const payload = Object.fromEntries(Object.entries(snapshot).filter(([key]) => !key.startsWith('_') && typeof snapshot[key as keyof typeof snapshot] !== 'function')) as unknown as NexusData;
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
    try {
      window.localStorage.setItem(LOCAL_ONBOARDING_KEY, 'true');
    } catch {
      // Cloud profile is the persistent signal when browser storage is disabled.
    }
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
    return <AuthScreen configured={Boolean(getSupabaseClient())} initialNotice={notice} recovering={recovering || recoveryFlow} onPasswordUpdated={() => { setRecovering(false); router.replace('/'); }} />;
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
      {syncState === 'error' && notice && <div role="status" className="fixed inset-x-3 bottom-3 z-[80] mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-amber-500/30 bg-background/95 px-4 py-3 text-xs text-muted-foreground shadow-2xl backdrop-blur-xl"><RefreshCw className="h-4 w-4 shrink-0 text-amber-400" /><span className="flex-1">{notice}</span><Button type="button" size="sm" variant="outline" onClick={() => { setSyncState(navigator.onLine ? 'connecting' : 'offline'); if (user) void checkAccount(user); }} className="h-7 rounded-lg">Retry</Button></div>}
    </CloudSyncContext.Provider>
  );
}
