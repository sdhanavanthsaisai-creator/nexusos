'use client';

// ─── Dynamic Island store: expanded state, alerts + pomodoro engine ──────────
// Persisted to localStorage (`nexusos-island-v1`) — only `module` and `pomo`
// are persisted (expanded/alert are ephemeral). Pomodoro phase completion is
// driven by the UI clock tick via `completePhaseByClock(now)`.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useNexus } from './store';
import { todayKey } from './utils';

export type IslandModule = 'timer' | 'stats' | 'music';
export type PomoPhase = 'idle' | 'focus' | 'break' | 'longBreak';

export interface IslandAlert {
  id: number;
  title: string;
  detail: string;
  tone: 'info' | 'success' | 'warning';
}

export interface PomoState {
  phase: PomoPhase;
  cycles: number;                   // completed focus cycles
  endsAt: number | null;            // epoch ms when the phase ends
  pausedRemainingMs: number | null; // remaining ms while paused
  subjectId: string | null;         // subject focus sessions are logged to
  phaseStartedAt: number | null;    // epoch ms the current phase started
  lengths: { focus: number; break: number; longBreak: number }; // minutes
  autoStartBreak: boolean;
  autoStartFocus: boolean;
}

export interface IslandState {
  expanded: boolean;
  module: IslandModule;
  alert: IslandAlert | null;
  pomo: PomoState;
  expand: (m?: IslandModule) => void;
  collapse: () => void;
  setModule: (m: IslandModule) => void;
  notify: (alert: Omit<IslandAlert, 'id'>) => void;
  clearAlert: () => void;
  setPomo: (patch: Partial<PomoState>) => void;
  startPomodoro: () => void;
  pausePomodoro: () => void;
  resumePomodoro: () => void;
  skipPhase: () => void;
  stopPomodoro: () => void;
  completePhaseByClock: (now: number) => void;
}

export const useIsland = create<IslandState>()(
  persist(
    (set, get) => ({
      expanded: false,
      module: 'timer',
      alert: null,
      pomo: {
        phase: 'idle',
        cycles: 0,
        endsAt: null,
        pausedRemainingMs: null,
        subjectId: null,
        phaseStartedAt: null,
        lengths: { focus: 25, break: 5, longBreak: 15 },
        autoStartBreak: true,
        autoStartFocus: false,
      },

      expand: (m) => set((s) => ({ expanded: true, module: m ?? s.module })),
      collapse: () => set({ expanded: false }),
      setModule: (m) => set({ module: m }),
      notify: (alert) => set({ alert: { ...alert, id: Date.now() } }),
      clearAlert: () => set({ alert: null }),
      setPomo: (patch) => set((s) => ({ pomo: { ...s.pomo, ...patch } })),

      startPomodoro: () => {
        const now = Date.now();
        set((s) => ({
          pomo: {
            ...s.pomo,
            phase: 'focus',
            cycles: 0,
            endsAt: now + s.pomo.lengths.focus * 60000,
            pausedRemainingMs: null,
            phaseStartedAt: now,
          },
        }));
      },

      pausePomodoro: () => {
        const { pomo } = get();
        if (pomo.phase === 'idle' || pomo.endsAt === null || pomo.pausedRemainingMs !== null) return;
        set({
          pomo: {
            ...pomo,
            pausedRemainingMs: Math.max(0, pomo.endsAt - Date.now()),
            endsAt: null,
          },
        });
      },

      resumePomodoro: () => {
        const { pomo } = get();
        if (pomo.phase === 'idle' || pomo.pausedRemainingMs === null) return;
        const now = Date.now();
        set({
          pomo: {
            ...pomo,
            endsAt: now + pomo.pausedRemainingMs,
            pausedRemainingMs: null,
            phaseStartedAt: pomo.phaseStartedAt ?? now,
          },
        });
      },

      skipPhase: () => {
        const { pomo } = get();
        if (pomo.phase === 'idle') return;
        const now = Date.now();
        if (pomo.phase === 'focus') {
          const isLong = pomo.cycles > 0 && pomo.cycles % 4 === 0;
          const len = isLong ? pomo.lengths.longBreak : pomo.lengths.break;
          set({
            pomo: {
              ...pomo,
              phase: isLong ? 'longBreak' : 'break',
              endsAt: now + len * 60000,
              pausedRemainingMs: null,
              phaseStartedAt: now,
            },
          });
        } else {
          set({
            pomo: {
              ...pomo,
              phase: 'focus',
              endsAt: now + pomo.lengths.focus * 60000,
              pausedRemainingMs: null,
              phaseStartedAt: now,
            },
          });
        }
      },

      stopPomodoro: () =>
        set((s) => ({
          pomo: {
            ...s.pomo,
            phase: 'idle',
            endsAt: null,
            pausedRemainingMs: null,
            phaseStartedAt: null,
            cycles: 0,
          },
        })),

      /** Called by the UI clock tick when remaining time hits zero. */
      completePhaseByClock: (now) => {
        const { pomo } = get();
        if (pomo.phase === 'idle' || pomo.pausedRemainingMs !== null || pomo.endsAt === null) return;
        if (now < pomo.endsAt) return;

        if (pomo.phase === 'focus') {
          // Log the focus block as a real study session.
          const started = pomo.phaseStartedAt ?? now - pomo.lengths.focus * 60000;
          const nexus = useNexus.getState();
          const subjectId = pomo.subjectId ?? nexus.subjects[0]?.id ?? 'general';
          nexus.addSession({
            subjectId,
            date: todayKey(),
            startTime: new Date(started).toTimeString().slice(0, 5),
            endTime: new Date(now).toTimeString().slice(0, 5),
            durationMin: pomo.lengths.focus,
            concentration: 4,
            energy: 4,
            tags: ['pomodoro'],
          });
          // Haptic pattern (mobile browsers) — two short + one long pulse.
          try { navigator.vibrate?.([110, 60, 110, 60, 220]); } catch { /* unsupported */ }
          const cycles = pomo.cycles + 1;
          const isLong = cycles % 4 === 0;
          if (pomo.autoStartBreak) {
            const len = isLong ? pomo.lengths.longBreak : pomo.lengths.break;
            set({
              pomo: {
                ...pomo,
                phase: isLong ? 'longBreak' : 'break',
                cycles,
                endsAt: now + len * 60000,
                pausedRemainingMs: null,
                phaseStartedAt: now,
              },
            });
          } else {
            set({
              pomo: {
                ...pomo,
                phase: 'idle',
                cycles,
                endsAt: null,
                pausedRemainingMs: null,
                phaseStartedAt: null,
              },
            });
          }
          get().notify({
            title: 'Focus block complete',
            detail: `${pomo.lengths.focus} min logged · break time`,
            tone: 'success',
          });
          return;
        }

        // Break finished (break | longBreak).
        if (pomo.autoStartFocus) {
          set({
            pomo: {
              ...pomo,
              phase: 'focus',
              endsAt: now + pomo.lengths.focus * 60000,
              pausedRemainingMs: null,
              phaseStartedAt: now,
            },
          });
        } else {
          set({
            pomo: {
              ...pomo,
              phase: 'idle',
              endsAt: null,
              pausedRemainingMs: null,
              phaseStartedAt: null,
            },
          });
        }
        get().notify({ title: 'Break over', detail: 'Back to focus', tone: 'info' });
      },
    }),
    {
      name: 'nexusos-island-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ module: s.module, pomo: s.pomo }),
    },
  ),
);

/** Ms remaining in the current phase (0 when idle). */
export const pomoRemainingMs = (pomo: PomoState, now: number): number => {
  if (pomo.phase === 'idle') return 0;
  if (pomo.pausedRemainingMs !== null) return Math.max(0, pomo.pausedRemainingMs);
  if (pomo.endsAt === null) return 0;
  return Math.max(0, pomo.endsAt - now);
};

/** Total duration (ms) of the current phase — for ring progress math. */
export const pomoPhaseDurationMs = (pomo: PomoState): number => {
  switch (pomo.phase) {
    case 'focus':
      return pomo.lengths.focus * 60000;
    case 'break':
      return pomo.lengths.break * 60000;
    case 'longBreak':
      return pomo.lengths.longBreak * 60000;
    default:
      return 0;
  }
};
