'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Timer, Command, Database } from 'lucide-react';
import { useNexus, useUI, useTimerTick } from '@/lib/nexus/store';
import { todayKey, dayTotalMinutes, minutesToHM, secondsToClock, computeStreak } from '@/lib/nexus/utils';

export default function StatusBar() {
  const profile = useNexus((s) => s.profile);
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const timer = useUI((s) => s.timer);
  const tick = useTimerTick(timer.running);

  const todayMinutes = useMemo(() => dayTotalMinutes(dailyLogs[todayKey()]), [dailyLogs]);
  const streak = useMemo(() => computeStreak(dailyLogs).current, [dailyLogs]);
  const elapsed = timer.running || timer.accumulatedMs > 0
    ? Math.floor((timer.running ? (tick - (timer.startedAt ?? tick)) : 0) / 1000) + Math.floor(timer.accumulatedMs / 1000)
    : 0;
  const timerActive = timer.running || timer.accumulatedMs > 0;

  return (
    <footer
      className="glass sticky bottom-0 z-30 flex h-9 shrink-0 items-center gap-3 overflow-x-auto border-x-0 border-b-0 px-3 pb-[env(safe-area-inset-bottom)] text-[11px] text-muted-foreground no-scrollbar md:px-5"
      role="contentinfo"
      aria-label="NexusOS status bar"
    >
      <span className="flex items-center gap-1.5 font-semibold text-foreground/80">
        <Database className="h-3 w-3 text-primary" aria-hidden="true" />
        NexusOS v1.0
      </span>
      <span className="hidden sm:inline">·</span>
      <span className="hidden truncate sm:inline">{profile.name} · {profile.degree} · Sem {profile.semester}</span>

      <span className="mx-auto flex items-center gap-3">
        <span className="flex items-center gap-1" title="Today's logged study time">
          ⏱ Today <b className="font-mono tabular-nums text-foreground/85">{minutesToHM(todayMinutes)}</b>
        </span>
        <span className="hidden items-center gap-1 sm:flex" title="Current streak">
          <Flame className="h-3 w-3 text-foreground" aria-hidden="true" />
          <b className="font-mono tabular-nums text-foreground/85">{streak}d streak</b>
        </span>
        {timerActive && (
          <motion.span
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="glass-chip flex items-center gap-1 rounded-full px-2 py-0.5 text-foreground"
            title="Focus timer"
          >
            <Timer className={timer.running ? 'h-3 w-3 animate-pulse' : 'h-3 w-3'} aria-hidden="true" />
            <b className="font-mono tabular-nums">{secondsToClock(elapsed)}</b>
            <span className="hidden sm:inline">{timer.running ? 'focus running' : 'paused'}</span>
          </motion.span>
        )}
      </span>

      <span className="hidden items-center gap-2 md:flex">
        <span className="flex items-center gap-1"><span className="kbd">⌘K</span> palette</span>
        <span className="flex items-center gap-1"><span className="kbd">N</span> new task</span>
        <span className="flex items-center gap-1"><span className="kbd">S</span> timer</span>
        <span className="flex items-center gap-1 text-foreground/80" title="All data stored locally in your browser">
          <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-foreground" aria-hidden="true" />
          local sync on
        </span>
        <Command className="h-3 w-3 opacity-40" aria-hidden="true" />
      </span>
    </footer>
  );
}
