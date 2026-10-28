'use client';

// ─── Mobile shell: bottom tab bar + "More" sheet + FAB quick-add ─────────────
// Mobile is the baseline at NexusOS: destinations are Home · Track · Tasks ·
// Analytics · More; secondary modules live in the More sheet; a glass FAB on
// the right opens the quick-add bottom sheet (log session / add task / habit).
// Desktop keeps the full sidebar from `md` up — tab bar is hidden there.

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3, BookOpenCheck, CalendarDays, Braces, CalendarRange, Flame,
  Home, LayoutDashboard, ListChecks, Map, MoreHorizontal, Plus, NotebookPen,
  FileBarChart2, Settings2, Sparkles, Timer, X, Lock, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNexus, useUI } from '@/lib/nexus/store';
import type { ModuleId } from '@/lib/nexus/types';

interface TabDef {
  id: ModuleId;
  label: string;
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'tracker', label: 'Track', icon: BookOpenCheck },
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

interface MoreDest {
  id: ModuleId;
  label: string;
  desc: string;
  icon: LucideIcon;
  locked?: boolean;
}

const MORE_DEST: MoreDest[] = [
  { id: 'sessions', label: 'Sessions', desc: 'Focus timer & log', icon: Timer },
  { id: 'habits', label: 'Habits', desc: 'Streaks & consistency', icon: Flame },
  { id: 'calendar', label: 'Calendar', desc: 'Unified timeline', icon: CalendarDays },
  { id: 'timetable', label: 'Timetable', desc: 'Editable weekly grid', icon: CalendarRange },
  { id: 'roadmap', label: 'Roadmap', desc: 'Skills & projects', icon: Map },
  { id: 'dsa', label: 'DSA Plan', desc: 'Unlocks after Semester 1', icon: Braces, locked: true },
  { id: 'notes', label: 'Notes', desc: 'Markdown & resources', icon: NotebookPen },
  { id: 'reports', label: 'Reports', desc: 'Summaries & export', icon: FileBarChart2 },
  { id: 'settings', label: 'Settings', desc: 'Profile, themes & AI', icon: Settings2 },
];

export default function MobileTabBar() {
  const active = useUI((s) => s.activeModule);
  const setActive = useUI((s) => s.setActiveModule);
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const dsaActive = useNexus((s) => s.dsaActive);
  const allTasks = useNexus((s) => s.tasks);
  const pendingTasks = useMemo(() => allTasks.filter((t) => t.status !== 'done').length, [allTasks]);

  const isMoreActive = MORE_DEST.some((m) => m.id === active);

  return (
    <>
      {/* FAB — quick add (right, above the tab bar) */}
      <motion.button
        type="button"
        onClick={() => setQuickOpen(true)}
        aria-label="Quick add — log session, task or habit"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        className={cn(
          'fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-[0_12px_30px_-8px_rgba(0,0,0,0.55)] md:hidden',
          // Float above the detached bottom dock, leaving a clear 12px gap.
          'bottom-[calc(env(safe-area-inset-bottom,0px)+86px)]',
        )}
      >
        <span className="sr-only">Quick add</span>
        <motion.span
          animate={{ rotate: quickOpen ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className="flex"
        >
          {quickOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Plus className="h-6 w-6" aria-hidden="true" />}
        </motion.span>
      </motion.button>

      {/* Bottom tab bar — glass, 64px, icon + 11px label, spring-animated pill */}
      <nav
        aria-label="Mobile primary navigation"
        className="glass fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] z-50 rounded-full md:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-lg grid-cols-5 items-stretch px-1">
          {TABS.map((t) => {
            const isActive = active === t.id;
            const Icon = t.icon;
            const badge = t.id === 'tasks' && pendingTasks > 0 ? pendingTasks : null;
            return (
              <li key={t.id} className="relative flex">
                <motion.button
                  type="button"
                  onClick={() => setActive(t.id)}
                  aria-current={isActive ? 'page' : undefined}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                  className={cn(
                    'relative flex min-h-[44px] w-full touch-manipulation flex-col items-center justify-center gap-0.5 rounded-2xl px-1',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="mobile-tab-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-x-2 inset-y-1 rounded-2xl bg-foreground/[0.12] ring-1 ring-foreground/[0.08]"
                      aria-hidden="true"
                    />
                  )}
                  <Icon className="relative z-10 h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="relative z-10 flex items-center gap-1 text-[11px] leading-none font-medium">
                    {t.label}
                    {badge !== null && (
                      <span className="rounded-full bg-foreground px-1 text-[9px] font-bold leading-4 text-background">
                        {badge}
                      </span>
                    )}
                  </span>
                </motion.button>
              </li>
            );
          })}
          {/* More */}
          <li className="relative flex">
            <motion.button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-current={isMoreActive ? 'page' : undefined}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              className={cn(
                'relative flex min-h-[44px] w-full touch-manipulation flex-col items-center justify-center gap-0.5 rounded-2xl px-1',
                isMoreActive ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {isMoreActive && (
                <motion.span
                  layoutId="mobile-tab-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-x-2 inset-y-1 rounded-2xl bg-foreground/[0.12] ring-1 ring-foreground/[0.08]"
                  aria-hidden="true"
                />
              )}
              <MoreHorizontal className="relative z-10 h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="relative z-10 text-[11px] leading-none font-medium">More</span>
            </motion.button>
          </li>
        </ul>
      </nav>

      {/* More — secondary destinations sheet */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] md:hidden"
              aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-label="More destinations"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="glass-strong fixed inset-x-0 bottom-0 z-50 max-h-[75dvh] overflow-y-auto overscroll-contain rounded-t-3xl pb-[max(env(safe-area-inset-bottom,0px),0.75rem)] md:hidden slim-scroll"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 rounded-t-3xl bg-background/55 px-4 py-3 backdrop-blur-xl">
                <p className="text-sm font-bold text-gradient">All modules</p>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  aria-label="Close"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-accent"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <ul className="grid grid-cols-3 gap-2 p-3">
                {MORE_DEST.map((m) => {
                  const Icon = m.icon;
                  const locked = m.locked && !dsaActive;
                  const isActive = active === m.id;
                  return (
                    <li key={m.id}>
                      <motion.button
                        type="button"
                        onClick={() => {
                          if (locked) {
                            toast.info('DSA Plan unlocks after Semester 1', { description: 'Toggle it on in Settings → Semester progress.' });
                            return;
                          }
                          setActive(m.id);
                          setMoreOpen(false);
                        }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                        aria-label={`${m.label} — ${m.desc}`}
                        className={cn(
                          'glass flex min-h-[72px] w-full flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3 text-center',
                          isActive && 'ring-1 ring-primary/50',
                        )}
                      >
                        {locked ? <Lock className="h-5 w-5 text-muted-foreground" aria-hidden="true" /> : <Icon className="h-5 w-5" aria-hidden="true" />}
                        <span className="text-[11px] font-medium leading-tight">{m.label}</span>
                        <span className="text-[9px] leading-tight text-muted-foreground">{locked ? 'Sem 2' : m.desc}</span>
                      </motion.button>
                    </li>
                  );
                })}
                <li>
                  <motion.button
                    type="button"
                    onClick={() => {
                      setActive('dashboard');
                      setMoreOpen(false);
                      window.setTimeout(() => {
                        document.getElementById('mobile-ai-open')?.click();
                      }, 60);
                    }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="AI Coach"
                    className="glass flex min-h-[72px] w-full flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3 text-center"
                  >
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                    <span className="text-[11px] font-medium leading-tight">AI Coach</span>
                    <span className="text-[9px] leading-tight text-muted-foreground">Study coach</span>
                  </motion.button>
                </li>
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <QuickAddSheet open={quickOpen} onClose={() => setQuickOpen(false)} />
    </>
  );
}

// ─── Quick-add bottom sheet (FAB actions) ─────────────────────────────────────
function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const subjects = useNexus((s) => s.subjects);
  const allHabits = useNexus((s) => s.habits);
  const habits = useMemo(() => allHabits.filter((h) => !h.archived), [allHabits]);
  const habitRecords = useNexus((s) => s.habitRecords);
  const toggleHabit = useNexus((s) => s.toggleHabitDate);
  const setActiveModule = useUI((s) => s.setActiveModule);
  const [hapticking, setHapticking] = useState<ModuleId | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const startFreeTimer = () => {
    const first = subjects[0]?.id;
    if (!first) {
      toast.error('Add a subject first', { description: 'Settings → Subjects' });
      setActiveModule('settings');
      onClose();
      return;
    }
    useUI.getState().startTimer(first);
    islandNotify('Focus started', subjects.find((x) => x.id === first)?.name ?? 'Free session');
    setActiveModule('sessions');
    onClose();
  };

  const goNewTask = () => {
    setActiveModule('tasks');
    window.dispatchEvent(new CustomEvent('nexus:new-task'));
    onClose();
  };

  const markFirstHabit = () => {
    const pending = habits.find((h) => !habitRecords[h.id]?.[today]);
    if (!pending) {
      toast.success('All habits are done for today');
      onClose();
      return;
    }
    toggleHabit(pending.id, today);
    setHapticking('habits');
    try {
      navigator.vibrate?.(18);
    } catch { /* no haptics */ }
    toast.success(`${pending.name} logged`);
    setActiveModule('habits');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] md:hidden"
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-label="Quick add"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="glass-strong fixed inset-x-0 bottom-0 z-50 rounded-t-3xl pb-[max(env(safe-area-inset-bottom,0px),0.75rem)] pt-3 md:hidden"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-foreground/25" aria-hidden="true" />
            <p className="px-4 pb-2 text-sm font-bold text-gradient">Quick add</p>
            <div className="grid grid-cols-1 gap-2 px-3 pb-1">
              <ActionRow
                icon={Timer}
                title="Start focus session"
                desc={subjects[0]?.name ? `Timer · ${subjects[0].name}` : 'Timer — pick a subject in Settings first'}
                onClick={startFreeTimer}
                iconClass=""
              />
              <ActionRow icon={ListChecks} title="New task" desc="Kanban & planner" onClick={goNewTask} iconClass="" />
              <ActionRow
                icon={Flame}
                title="Mark a habit done"
                desc={`Next up: ${habits.find((h) => !habitRecords[h.id]?.[today])?.name ?? 'all clear 🎉'}`}
                onClick={markFirstHabit}
                iconClass={hapticking === 'habits' ? 'scale-110' : ''}
              />
              <ActionRow icon={BookOpenCheck} title="Log study in Daily Tracker" desc="Subjects & minutes" onClick={() => { setActiveModule('tracker'); onClose(); }} iconClass="" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ActionRow({ icon: Icon, title, desc, onClick, iconClass }: {
  icon: LucideIcon; title: string; desc: string; onClick: () => void; iconClass?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      className="glass flex min-h-[60px] w-full touch-manipulation items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors active:bg-accent"
    >
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.08] transition-transform', iconClass)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{desc}</span>
      </span>
    </motion.button>
  );
}

/** Shared island notify helper (avoids importing the island store here). */
function islandNotify(title: string, detail: string) {
  // Dynamic island alerts push through its own tiny store; import lazily to
  // keep this file tree-shake friendly on desktop builds.
  import('@/lib/nexus/island-store').then(({ useIsland }) => {
    useIsland.getState().notify({ title, detail, tone: 'info' });
  });
}

export function MobileModuleTitleIcons() {
  return <LayoutDashboard className="hidden" aria-hidden="true" />;
}
