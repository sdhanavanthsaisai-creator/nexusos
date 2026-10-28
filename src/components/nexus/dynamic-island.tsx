'use client';

// ─── Dynamic Island — self-mounting floating command pod ─────────────────────
// Compact pill (alert → free timer → pomodoro → music → daily summary) that
// morphs into an expanded panel with Timer / Stats / Music modules. Mount it
// once anywhere (e.g. the app shell); it positions itself fixed at the top.

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import {
  Activity, CheckCircle2, ChevronDown, Flame, ListTodo, Music, Pause, Play,
  SkipBack, SkipForward, Square, Timer, Volume2, X, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { lofiEngine } from '@/lib/nexus/lofi';
import { pomoPhaseDurationMs, pomoRemainingMs, useIsland } from '@/lib/nexus/island-store';
import { timerElapsedMs, useNexus, useTimerTick, useUI } from '@/lib/nexus/store';
import {
  clamp, computeStreak, dateKey, dayTotalMinutes, isDueToday, isOverdue,
  minutesToHM, pad2, secondsToClock, todayKey,
} from '@/lib/nexus/utils';

const SPRING = { type: 'spring', stiffness: 300, damping: 28 } as const;

/** m:ss countdown format. */
const fmtMs = (ms: number) => `${Math.floor(ms / 60000)}:${pad2(Math.floor(ms / 1000) % 60)}`;

/** True after hydration — SSR-safe mounted gate without setState-in-effect. */
const emptySubscribe = () => () => {};
const useMounted = () => useSyncExternalStore(emptySubscribe, () => true, () => false);

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function DynamicIsland() {
  const mounted = useMounted();

  const expanded = useIsland((s) => s.expanded);
  const alert = useIsland((s) => s.alert);

  // Auto-dismiss island alerts after ~4.5s.
  useEffect(() => {
    if (!alert) return;
    const id = window.setTimeout(() => useIsland.getState().clearAlert(), 4500);
    return () => window.clearTimeout(id);
  }, [alert]);

  // Cross-store notification subscriptions (task completions, timer start/stop).
  useEffect(() => {
    const countDone = (tasks: readonly { status: string }[]) =>
      tasks.reduce((n, t) => (t.status === 'done' ? n + 1 : n), 0);

    const unsubNexus = useNexus.subscribe((s, prev) => {
      if (countDone(s.tasks) > countDone(prev.tasks)) {
        useIsland.getState().notify({ title: 'Task completed', detail: '+1 task cleared', tone: 'success' });
      }
    });

    const unsubUI = useUI.subscribe((s, prev) => {
      const t = s.timer;
      const p = prev.timer;
      // Timer started from a fully idle state.
      if (t.running && !p.running && p.subjectId === null && p.accumulatedMs === 0) {
        const name = useNexus.getState().subjects.find((x) => x.id === t.subjectId)?.name ?? 'Free session';
        useIsland.getState().notify({ title: 'Focus started', detail: name, tone: 'info' });
      }
      // Timer stopped (full reset — pause keeps subjectId / accumulatedMs).
      if (p.running && !t.running && t.subjectId === null && t.startedAt === null && t.accumulatedMs === 0) {
        const minutes = Math.max(1, Math.round(timerElapsedMs(p) / 60000));
        useIsland.getState().notify({
          title: 'Session logged',
          detail: `${minutesToHM(minutes)} focused`,
          tone: 'success',
        });
      }
    });

    return () => {
      unsubNexus();
      unsubUI();
    };
  }, []);

  // Escape closes the island while expanded.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useIsland.getState().collapse();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  // Music playing flag: shared by compact pill (eq) + music module (waveform).
  const [musicPlaying, setMusicPlaying] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setMusicPlaying(lofiEngine.isPlaying()), 1000); // safety poll
    return () => window.clearInterval(id);
  }, []);
  const pomo = useIsland((s) => s.pomo);
  const timer = useUI((s) => s.timer);

  // Reconcile timestamp-based clocks when the tab becomes visible again —
  // background tabs throttle interval ticks, so recover on `visibilitychange`.
  // All clocks use Date.now() deltas, so a single reconcile is self-correcting.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const { pomo: p } = useIsland.getState();
      if (p.phase !== 'idle' && p.pausedRemainingMs === null && p.endsAt !== null) {
        useIsland.getState().completePhaseByClock(Date.now());
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Keep the document title in sync with the live countdown (works with the
  // phone screen off / app backgrounded — timestamp math, not interval counts).
  const titlePomoActive = pomo.phase !== 'idle' && pomo.pausedRemainingMs === null && pomo.endsAt !== null;
  const titleFreeActive = timer.running && timer.startedAt !== null;
  const titleNow = useTimerTick(titlePomoActive || titleFreeActive);
  useEffect(() => {
    if (titlePomoActive && pomo.endsAt !== null) {
      document.title = `${fmtIslandClock(titleNow, pomo.endsAt)} focus — NexusOS`;
    } else if (titleFreeActive) {
      document.title = `${secondsToClock(timerElapsedMs(timer) / 1000)} focus — NexusOS`;
    } else {
      document.title = BASE_TITLE;
    }
  }, [titlePomoActive, titleFreeActive, titleNow, timer, pomo]);

  if (!mounted) return null; // hydration guard (persisted island/pomo state)

  return (
    <>
      {expanded && (
        <div
          className="pointer-events-auto fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px]"
          onClick={() => useIsland.getState().collapse()}
          aria-hidden="true"
        />
      )}
      <div className="pointer-events-none fixed inset-x-0 top-2.5 z-[60] flex flex-col items-center max-md:top-[calc(env(safe-area-inset-top,0px)+3.5rem)]">
        {expanded ? (
          <ExpandedPanel musicPlaying={musicPlaying} onMusicChange={setMusicPlaying} />
        ) : (
          <CompactPill musicPlaying={musicPlaying} />
        )}
      </div>
    </>
  );
}

const BASE_TITLE = 'NexusOS — Student Productivity OS';
const fmtIslandClock = (nowMs: number, endsAt: number) =>
  `${Math.floor((endsAt - nowMs) / 60000)}:${pad2(Math.max(0, Math.floor((endsAt - nowMs) / 1000) % 60))}`;

// ─── Compact pill ─────────────────────────────────────────────────────────────
function CompactPill({ musicPlaying }: { musicPlaying: boolean }) {
  const alert = useIsland((s) => s.alert);
  const pomo = useIsland((s) => s.pomo);
  const timer = useUI((s) => s.timer);
  const subjects = useNexus((s) => s.subjects);
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const habits = useNexus((s) => s.habits);
  const habitRecords = useNexus((s) => s.habitRecords);

  const timerActive = timer.subjectId !== null || timer.accumulatedMs > 0 || timer.running;
  const pomoActive = pomo.phase !== 'idle';
  const now = useTimerTick(timerActive || pomoActive);
  const pomoLeft = pomoRemainingMs(pomo, now);

  const todayMin = useMemo(() => dayTotalMinutes(dailyLogs[todayKey()]), [dailyLogs]);
  const habitScore = useMemo(() => {
    const active = habits.filter((h) => !h.archived);
    const key = todayKey();
    const done = active.reduce((n, h) => (habitRecords[h.id]?.[key] ? n + 1 : n), 0);
    return `${done}/${active.length}`;
  }, [habits, habitRecords]);
  const subjectLabel = useMemo(
    () => subjects.find((x) => x.id === timer.subjectId)?.name ?? '',
    [subjects, timer.subjectId],
  );

  // Pulse the pill whenever a new alert arrives.
  const pulse = useAnimationControls();
  const alertId = alert?.id ?? 0;
  useEffect(() => {
    if (!alertId) return;
    void pulse.start({ scale: [1, 1.06, 1], transition: { duration: 0.55, times: [0, 0.35, 1], ease: 'easeOut' } });
  }, [alertId, pulse]);

  const contentKey = alert ? 'alert' : timerActive ? 'timer' : pomoActive ? 'pomo' : musicPlaying ? 'music' : 'idle';

  return (
    <>
      {/* Phones: compact tappable capsule, horizontally scrollable metric strip.
          Shows two metrics at once (timer state + focus minutes), swipe for
          Pomodoro, habit score and the lo-fi mini player. */}
      <motion.div
        layoutId="island-pod"
        animate={pulse}
        whileTap={{ scale: 0.97 }}
        transition={SPRING}
        className="island-shell pointer-events-auto flex h-11 w-[min(288px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] cursor-pointer items-center overflow-hidden rounded-full pl-3 pr-1 text-foreground md:hidden"
      >
        <button
          type="button"
          className="pointer-events-auto flex h-full max-w-[44%] shrink-0 cursor-pointer items-center gap-2 overflow-hidden pr-1"
          onClick={() => useIsland.getState().expand()}
          aria-label="Open Dynamic Island"
        >
          {alert ? (
            <>
              <span
                className={`island-live-dot h-1.5 w-1.5 shrink-0 rounded-full ${
                  alert.tone === 'success' ? 'bg-foreground' : alert.tone === 'warning' ? 'bg-foreground/55' : 'bg-[var(--primary)]'
                }`}
              />
              <span className="truncate text-xs font-medium">{alert.title}</span>
            </>
          ) : timerActive ? (
            <>
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  timer.running ? 'island-live-dot animate-pulse bg-[var(--primary)]' : 'bg-white/40'
                }`}
              />
              <span className="font-mono text-[11px] tabular-nums">{secondsToClock(timerElapsedMs(timer) / 1000)}</span>
              {subjectLabel && <span className="max-w-[72px] truncate text-[10px] text-white/50">{subjectLabel}</span>}
            </>
          ) : pomoActive ? (
            <>
              <span
                className={`island-live-dot animate-pulse h-1.5 w-1.5 shrink-0 rounded-full ${
                  pomo.phase === 'focus' ? 'bg-foreground' : 'bg-foreground/55'
                }`}
              />
              <span className="font-mono text-[11px] tabular-nums">{fmtMs(pomoLeft)}</span>
              <span className="text-[10px] text-white/55">
                {pomo.phase === 'focus' ? 'Focus' : pomo.phase === 'longBreak' ? 'Long break' : 'Break'}
              </span>
            </>
          ) : (
            <>
              <Zap className="h-3 w-3 shrink-0 text-[var(--aur-1)]" aria-hidden="true" />
              <span className="font-mono text-[11px] tabular-nums">{minutesToHM(todayMin)}</span>
            </>
          )}
        </button>
        {/* Metric strip — swipeable */}
        <div
          className="island-metric-strip flex min-w-0 flex-1 snap-x snap-mandatory items-center gap-1.5 overflow-x-auto overscroll-contain px-1"
          role="group"
          aria-label="Live metrics — swipe for more"
        >
          <MetricChip label="focus" value={minutesToHM(todayMin)} first />
          <MetricChip label="pomo" value={pomoActive ? fmtMs(pomoLeft) : 'idle'} />
          <MetricChip label="habits" value={habitScore} />
          <div className="shrink-0 snap-start">
            <button
              type="button"
              onClick={() => {
                if (musicPlaying) lofiEngine.pause();
                else {
                  lofiEngine.unlock();
                  lofiEngine.play();
                }
              }}
              aria-label={musicPlaying ? 'Pause lo-fi music' : 'Play lo-fi music'}
              className="flex h-8 min-w-16 snap-start items-center justify-center gap-1.5 rounded-full bg-white/[0.08] px-2.5 text-[10px] text-white/85 ring-1 ring-white/10 transition active:scale-95"
            >
              {musicPlaying ? (
                <span className="island-eq flex h-3.5 shrink-0 items-center gap-[2px]" aria-hidden="true">
                  <span /><span /><span /><span />
                </span>
              ) : (
                <Music className="h-3 w-3 shrink-0" aria-hidden="true" />
              )}
              <span className="font-mono tabular-nums">{musicPlaying ? 'on' : 'lo-fi'}</span>
            </button>
          </div>
        </div>
        <ChevronDown className="mx-1 h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
      </motion.div>

      {/* Desktop: original glass pill. Keep it out of the mobile shared-layout
          transition so the CSS-hidden desktop node cannot paint a ghost box. */}
      <motion.button
        type="button"
        onClick={() => useIsland.getState().expand()}
        animate={pulse}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={SPRING}
        className="island-shell pointer-events-auto hidden h-9 max-w-[92vw] cursor-pointer items-center gap-2 rounded-full px-3.5 text-foreground md:flex"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={contentKey}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.14 }}
            className="flex min-w-0 items-center gap-2"
          >
            {alert ? (
              <>
                <span
                  className={`island-live-dot h-1.5 w-1.5 shrink-0 rounded-full ${
                    alert.tone === 'success' ? 'bg-foreground' : alert.tone === 'warning' ? 'bg-foreground/55' : 'bg-[var(--primary)]'
                  }`}
                />
                <span className="max-w-[220px] truncate text-xs font-medium">{alert.title}</span>
              </>
            ) : timerActive ? (
              <>
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    timer.running ? 'island-live-dot animate-pulse bg-[var(--primary)]' : 'bg-white/40'
                  }`}
                />
                <span className="font-mono text-[11px] tabular-nums">{secondsToClock(timerElapsedMs(timer) / 1000)}</span>
                {subjectLabel && <span className="max-w-[80px] truncate text-[10px] text-white/50">{subjectLabel}</span>}
              </>
            ) : pomoActive ? (
              <>
                <span
                  className={`island-live-dot animate-pulse h-1.5 w-1.5 shrink-0 rounded-full ${
                    pomo.phase === 'focus' ? 'bg-foreground' : 'bg-foreground/55'
                  }`}
                />
                <span className="font-mono text-[11px] tabular-nums">{fmtMs(pomoLeft)}</span>
                <span className="text-[10px] text-white/55">
                  {pomo.phase === 'focus' ? 'Focus' : pomo.phase === 'longBreak' ? 'Long break' : 'Break'}
                </span>
              </>
            ) : musicPlaying ? (
              <>
                <span className="island-eq flex h-4 shrink-0 items-center gap-[2.5px]" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
                <span className="max-w-[150px] truncate text-[11px]">{lofiEngine.getTrack().name}</span>
              </>
            ) : (
              <>
                <Zap className="h-3 w-3 shrink-0 text-[var(--aur-1)]" />
                <span className="font-mono text-[11px] tabular-nums">{minutesToHM(todayMin)}</span>
                <span className="h-0.5 w-0.5 shrink-0 rounded-full bg-white/30" />
                <CheckCircle2 className="h-3 w-3 shrink-0 text-foreground" />
                <span className="font-mono text-[11px] tabular-nums">{habitScore}</span>
              </>
            )}
          </motion.span>
        </AnimatePresence>
        <ChevronDown className="h-3 w-3 shrink-0 text-white/40" />
      </motion.button>
    </>
  );
}

/** One metric in the mobile swipe strip. */
function MetricChip({ label, value, first = false }: { label: string; value: string; first?: boolean }) {
  return (
    <span
      className={cnxChip(first)}
      role="status"
      aria-label={`${label}: ${value}`}
    >
      <span className="text-[9px] uppercase tracking-[0.08em] text-white/45">{label}</span>
      <span className="font-mono text-[11px] font-semibold tabular-nums text-white/95">{value}</span>
    </span>
  );
}
function cnxChip(first: boolean) {
  return `flex h-8 w-[calc(100%+8px)] shrink-0 snap-start items-center justify-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 ring-1 ring-white/10 ${first ? 'ring-white/20' : ''}`;
}

// ─── Expanded panel ───────────────────────────────────────────────────────────
function ExpandedPanel({ musicPlaying, onMusicChange }: { musicPlaying: boolean; onMusicChange: (v: boolean) => void }) {
  const activeModule = useIsland((s) => s.module);
  const setModule = useIsland((s) => s.setModule);

  return (
    <motion.div
      layoutId="island-pod"
      layout
      role="dialog"
      aria-modal="true"
      aria-label="Dynamic Island"
      transition={SPRING}
      className="island-shell pointer-events-auto w-[min(380px,calc(100vw-1.5rem))] rounded-[28px] p-4 text-foreground max-md:w-full max-md:rounded-b-none max-md:rounded-t-[26px] max-md:pb-[max(env(safe-area-inset-bottom,0px),1rem)] max-md:pt-5 max-sm:animate-sheet-up"
    >
      <div className="mb-3 flex items-center gap-1">
        <TabButton active={activeModule === 'timer'} onClick={() => setModule('timer')} icon={Timer} label="Timer" />
        <TabButton active={activeModule === 'stats'} onClick={() => setModule('stats')} icon={Activity} label="Stats" />
        <TabButton active={activeModule === 'music'} onClick={() => setModule('music')} icon={Music} label="Music" />
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => useIsland.getState().collapse()}
          aria-label="Close island"
          className="flex h-7 w-7 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeModule}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.16 }}
        >
          {activeModule === 'timer' && <TimerModule />}
          {activeModule === 'stats' && <StatsModule />}
          {activeModule === 'music' && <MusicModule playing={musicPlaying} onPlayingChange={onMusicChange} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium transition-colors ${
        active ? 'text-foreground' : 'text-white/45 hover:text-white/80'
      }`}
    >
      {active && (
        <motion.span
          layoutId="island-tab"
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          className="glass-chip absolute inset-0 rounded-full"
        />
      )}
      <Icon className="relative z-10 h-3.5 w-3.5" />
      <span className="relative z-10">{label}</span>
    </button>
  );
}

// ─── Timer module ─────────────────────────────────────────────────────────────
function TimerModule() {
  const pomo = useIsland((s) => s.pomo);
  const timer = useUI((s) => s.timer);
  const pomoActive = pomo.phase !== 'idle';
  const timerActive = timer.subjectId !== null || timer.accumulatedMs > 0 || timer.running;
  const now = useTimerTick(pomoActive || timerActive);
  const pomoLeft = pomoRemainingMs(pomo, now);

  return (
    <div className="flex flex-col gap-3">
      {pomoActive ? <PomoActiveView pomoLeft={pomoLeft} /> : <PomoLauncher />}
      <FreeTimerSection />
    </div>
  );
}

function PomoActiveView({ pomoLeft }: { pomoLeft: number }) {
  const pomo = useIsland((s) => s.pomo);
  const subjects = useNexus((s) => s.subjects);

  const duration = pomoPhaseDurationMs(pomo);
  const fraction = duration > 0 ? clamp(1 - pomoLeft / duration, 0, 1) : 0;
  const R = 44;
  const CIRC = 2 * Math.PI * R;
  const ringColor = pomo.phase === 'focus' ? 'var(--aur-3)' : 'rgba(255,255,255,0.55)';
  const subjectName = subjects.find((x) => x.id === pomo.subjectId)?.name ?? 'First subject';
  const filled = pomo.cycles % 4;
  const paused = pomo.pausedRemainingMs !== null;

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="6" />
          <circle
            cx="50" cy="50" r={R} fill="none" stroke={ringColor} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - fraction)}
            style={{ transition: 'stroke-dashoffset 0.6s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl leading-none tabular-nums">{fmtMs(pomoLeft)}</span>
          <span className="mt-1.5 text-[9px] uppercase tracking-[0.2em] text-white/50">
            {pomo.phase === 'focus' ? 'Focus' : pomo.phase === 'longBreak' ? 'Long break' : 'Break'}
          </span>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <div className="flex items-center gap-1.5" aria-label={`${filled} of 4 cycles completed`}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < filled ? 'bg-[var(--primary)]' : 'bg-white/15'}`} />
            ))}
          </div>
          <div className="mt-1.5 truncate text-[10px] text-white/45">
            Logging to <span className="text-white/80">{subjectName}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {paused ? (
            <Button size="sm" variant="secondary" className="h-7 rounded-full px-3 text-[11px]" onClick={() => useIsland.getState().resumePomodoro()}>
              <Play className="h-3 w-3" /> Resume
            </Button>
          ) : (
            <Button size="sm" variant="secondary" className="h-7 rounded-full px-3 text-[11px]" onClick={() => useIsland.getState().pausePomodoro()}>
              <Pause className="h-3 w-3" /> Pause
            </Button>
          )}
          <Button
            size="sm" variant="outline"
            className="h-7 rounded-full border-white/15 bg-white/5 px-3 text-[11px] text-white/80 hover:bg-white/10 hover:text-white"
            onClick={() => useIsland.getState().skipPhase()}
          >
            Skip
          </Button>
          <Button
            size="sm" variant="outline"
            className="h-7 rounded-full border-foreground/40 bg-foreground/[0.08] px-3 text-[11px] text-foreground hover:bg-foreground/[0.14]"
            onClick={() => useIsland.getState().stopPomodoro()}
          >
            <Square className="h-3 w-3" /> Stop
          </Button>
        </div>
      </div>
    </div>
  );
}

function PomoLauncher() {
  const pomo = useIsland((s) => s.pomo);
  const setPomo = useIsland((s) => s.setPomo);
  const subjects = useNexus((s) => s.subjects);
  const canStart = (pomo.subjectId ?? subjects[0]?.id) != null;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-[9px] uppercase tracking-[0.18em] text-white/40">Focus length</div>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {[25, 50, 15].map((m) => {
            const active = pomo.lengths.focus === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setPomo({ lengths: { ...pomo.lengths, focus: m } })}
                aria-pressed={active}
                className={`glass-chip h-8 rounded-xl text-[11px] font-medium transition ${
                  active ? 'text-white ring-1 ring-[var(--primary)]/60' : 'text-white/55 hover:text-white/85'
                }`}
              >
                {m} min
              </button>
            );
          })}
        </div>
      </div>
      <SubjectSelect />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/70">Auto-start break</span>
        <Switch checked={pomo.autoStartBreak} onCheckedChange={(v) => setPomo({ autoStartBreak: v })} aria-label="Auto-start break" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/70">Auto-start focus</span>
        <Switch checked={pomo.autoStartFocus} onCheckedChange={(v) => setPomo({ autoStartFocus: v })} aria-label="Auto-start focus" />
      </div>
      <button
        type="button"
        disabled={!canStart}
        onClick={() => useIsland.getState().startPomodoro()}
        className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-foreground text-background text-xs font-semibold shadow-[0_10px_28px_-10px_rgba(255,255,255,0.22)] transition-colors hover:bg-foreground/90 disabled:opacity-40"
      >
        <Play className="h-3.5 w-3.5" /> Start Pomodoro
      </button>
    </div>
  );
}

/** Shared subject picker — bound to island pomo.subjectId. */
function SubjectSelect() {
  const subjects = useNexus((s) => s.subjects);
  const pomo = useIsland((s) => s.pomo);
  const setPomo = useIsland((s) => s.setPomo);
  const value = pomo.subjectId ?? subjects[0]?.id ?? '';

  return (
    <Select value={value || undefined} onValueChange={(v) => setPomo({ subjectId: v })}>
      <SelectTrigger className="h-8 w-full rounded-xl border-white/10 bg-white/5 text-xs" aria-label="Focus subject">
        <SelectValue placeholder="Pick a subject" />
      </SelectTrigger>
      <SelectContent className="z-[70] rounded-xl border-white/10">
        {subjects.map((s) => (
          <SelectItem key={s.id} value={s.id} className="text-xs">
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FreeTimerSection() {
  const timer = useUI((s) => s.timer);
  const pomo = useIsland((s) => s.pomo);
  const subjects = useNexus((s) => s.subjects);
  const timerActive = timer.subjectId !== null || timer.accumulatedMs > 0 || timer.running;
  useTimerTick(timerActive); // 1s re-render while the free timer is active

  const subjectName = subjects.find((x) => x.id === timer.subjectId)?.name ?? 'Free session';
  const selected = pomo.subjectId ?? subjects[0]?.id ?? '';

  return (
    <>
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-white/35" aria-hidden="true">
        <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
      </div>
      {timerActive ? (
        <div className="flex flex-col gap-2">
          <div className="glass-chip flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5">
            <div className="min-w-0">
              <div className="truncate text-[10px] text-white/50">
                {subjectName} · free timer{timer.running ? '' : ' · paused'}
              </div>
              <div className="mt-0.5 font-mono text-lg leading-none tabular-nums">
                {secondsToClock(timerElapsedMs(timer) / 1000)}
              </div>
            </div>
            {timer.running ? (
              <Button size="icon" variant="secondary" className="h-8 w-8 shrink-0 rounded-full" onClick={() => useUI.getState().pauseTimer()} aria-label="Pause timer">
                <Pause className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="icon" variant="secondary" className="h-8 w-8 shrink-0 rounded-full" onClick={() => useUI.getState().resumeTimer()} aria-label="Resume timer">
                <Play className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <button
            type="button"
            onClick={() => useUI.getState().stopTimer()}
            className="flex h-8 items-center justify-center gap-1.5 rounded-full bg-foreground text-background text-[11px] font-semibold transition-colors hover:bg-foreground/90"
          >
            <Square className="h-3 w-3" /> Stop &amp; log session
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <SubjectSelect />
          <Button
            size="sm" variant="outline" disabled={!selected}
            className="h-8 rounded-full border-white/15 bg-white/5 text-[11px] text-white/85 hover:bg-white/10 hover:text-white"
            onClick={() => {
              if (selected) useUI.getState().startTimer(selected);
            }}
          >
            <Play className="h-3 w-3" /> Start free timer
          </Button>
        </div>
      )}
    </>
  );
}

// ─── Stats module ─────────────────────────────────────────────────────────────
function StatsModule() {
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const tasks = useNexus((s) => s.tasks);
  const habits = useNexus((s) => s.habits);
  const habitRecords = useNexus((s) => s.habitRecords);

  const todayMin = useMemo(() => dayTotalMinutes(dailyLogs[todayKey()]), [dailyLogs]);
  const habitStat = useMemo(() => {
    const active = habits.filter((h) => !h.archived);
    const key = todayKey();
    const done = active.reduce((n, h) => (habitRecords[h.id]?.[key] ? n + 1 : n), 0);
    return { done, total: active.length };
  }, [habits, habitRecords]);
  const streak = useMemo(() => computeStreak(dailyLogs).current, [dailyLogs]);
  const taskStat = useMemo(
    () => ({
      due: tasks.reduce((n, t) => (isDueToday(t) ? n + 1 : n), 0),
      overdue: tasks.reduce((n, t) => (isOverdue(t) ? n + 1 : n), 0),
    }),
    [tasks],
  );
  const last7 = useMemo(() => {
    const vals: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      vals.push(dayTotalMinutes(dailyLogs[dateKey(d)]));
    }
    return vals;
  }, [dailyLogs]);
  const max7 = Math.max(...last7, 30);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <StatCard icon={Zap} iconClass="text-[var(--aur-1)]" label="Today focus" value={minutesToHM(todayMin)} />
        <div className="glass-chip rounded-2xl p-3">
          <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-white/40">
            <CheckCircle2 className="h-3 w-3 text-foreground" /> Habit score
          </div>
          <div className="mt-1.5 text-base font-semibold leading-none tabular-nums">
            {habitStat.done}/{habitStat.total}
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-foreground transition-all"
              style={{ width: `${habitStat.total === 0 ? 0 : Math.round((habitStat.done / habitStat.total) * 100)}%` }}
            />
          </div>
        </div>
        <StatCard icon={Flame} iconClass="text-foreground" label="Streak" value={`${streak} day${streak === 1 ? '' : 's'}`} />
        <div className="glass-chip rounded-2xl p-3">
          <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-white/40">
            <ListTodo className="h-3 w-3 text-[var(--aur-4)]" /> Due today
          </div>
          <div className="mt-1.5 text-base font-semibold leading-none tabular-nums">{taskStat.due} due</div>
          <div className={`mt-1 text-[10px] ${taskStat.overdue > 0 ? 'text-foreground font-medium' : 'text-white/40'}`}>
            {taskStat.overdue} overdue
          </div>
        </div>
      </div>
      <div className="glass-chip rounded-2xl p-3">
        <div className="text-[9px] uppercase tracking-[0.18em] text-white/40">Last 7 days</div>
        <div className="mt-2 flex h-10 items-end gap-1.5">
          {last7.map((v, i) => (
            <div
              key={i}
              title={minutesToHM(v)}
              className={`w-full rounded-full ${i === last7.length - 1 ? 'bg-[var(--primary)]' : 'bg-white/15'}`}
              style={{ height: `${Math.max(3, Math.round((v / max7) * 40))}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, iconClass, label, value }: { icon: LucideIcon; iconClass: string; label: string; value: string }) {
  return (
    <div className="glass-chip rounded-2xl p-3">
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-white/40">
        <Icon className={`h-3 w-3 ${iconClass}`} /> {label}
      </div>
      <div className="mt-1.5 text-base font-semibold leading-none tabular-nums">{value}</div>
    </div>
  );
}

// ─── Music module ─────────────────────────────────────────────────────────────
function MusicModule({ playing, onPlayingChange }: { playing: boolean; onPlayingChange: (v: boolean) => void }) {
  const [volume, setVolume] = useState(lofiEngine.getVolume());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live oscilloscope — rAF only while playing.
  useEffect(() => {
    if (!playing) return;
    const canvas = canvasRef.current;
    const c2d = canvas?.getContext('2d');
    if (!canvas || !c2d) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    c2d.scale(dpr, dpr);
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#ffffff';
    const buf = new Uint8Array(512);
    let raf = 0;
    const draw = () => {
      raf = window.requestAnimationFrame(draw);
      lofiEngine.waveform(buf);
      c2d.clearRect(0, 0, w, h);
      c2d.beginPath();
      const step = w / (buf.length - 1);
      for (let i = 0; i < buf.length; i++) {
        const y = h / 2 + ((buf[i] - 128) / 128) * (h / 2) * 0.92;
        if (i === 0) c2d.moveTo(0, y);
        else c2d.lineTo(i * step, y);
      }
      c2d.strokeStyle = primary;
      c2d.lineWidth = 1.5;
      c2d.shadowColor = primary;
      c2d.shadowBlur = 8;
      c2d.stroke();
    };
    draw();
    return () => window.cancelAnimationFrame(raf);
  }, [playing]);

  const togglePlay = () => {
    if (playing) lofiEngine.pause();
    else {
      lofiEngine.unlock(); // first-gesture AudioContext unlock
      lofiEngine.play();
    }
    onPlayingChange(lofiEngine.isPlaying());
  };

  const track = lofiEngine.getTrack();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? 'Pause music' : 'Play music'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
          style={{ boxShadow: '0 0 22px -6px var(--primary)' }}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{track.name}</div>
          <div className="truncate text-[10px] text-white/50">
            {track.artist} · {track.bpm} BPM · {track.key}
          </div>
        </div>
        <span className="glass-chip shrink-0 rounded-full px-2 py-0.5 text-[8px] uppercase tracking-[0.14em] text-white/60">
          procedural lo-fi
        </span>
      </div>
      <canvas ref={canvasRef} className="h-12 w-full rounded-xl" aria-hidden="true" />
      <div className="flex items-center gap-2">
        <Button
          size="icon" variant="ghost" className="h-7 w-7 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
          onClick={() => {
            lofiEngine.prev();
            onPlayingChange(lofiEngine.isPlaying());
          }}
          aria-label="Previous track"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon" variant="ghost" className="h-7 w-7 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
          onClick={() => {
            lofiEngine.next();
            onPlayingChange(lofiEngine.isPlaying());
          }}
          aria-label="Next track"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </Button>
        <Volume2 className="ml-1 h-3.5 w-3.5 shrink-0 text-white/50" />
        <Slider
          value={[Math.round(volume * 100)]}
          onValueChange={(v) => {
            const nv = v[0] / 100;
            lofiEngine.setVolume(nv);
            setVolume(nv);
          }}
          aria-label="Music volume"
          className="w-full"
        />
      </div>
    </div>
  );
}
