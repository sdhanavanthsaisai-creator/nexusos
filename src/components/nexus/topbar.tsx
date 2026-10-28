'use client';

import { useMemo } from 'react';
import {
  Search, Bell, Sparkles, Flame, Menu, Sun, Moon, MonitorSmartphone,
  Palette, AlertTriangle, CalendarClock, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useNexus, useUI } from '@/lib/nexus/store';
import type { ThemeId } from '@/lib/nexus/types';
import { MODULE_NAV } from '@/lib/nexus/constants';
import { todayKey, fmtDayFull, isOverdue, computeStreak } from '@/lib/nexus/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { NavList } from './sidebar';

const THEME_OPTIONS: { id: ThemeId; label: string; icon: LucideIcon }[] = [
  { id: 'dark', label: 'Obsidian Cyber Glass', icon: Moon },
  { id: 'light', label: 'Frost Light', icon: Sun },
  { id: 'oled', label: 'OLED Void', icon: MonitorSmartphone },
  { id: 'cyberpunk', label: 'Graphite Fog', icon: Palette },
];

type Notification = { id: string; title: string; detail: string; tone: 'danger' | 'warning' | 'info'; module: string };

export default function Topbar() {
  const profile = useNexus((s) => s.profile);
  const theme = useNexus((s) => s.settings.theme);
  const setSetting = useNexus((s) => s.setSetting);
  const tasks = useNexus((s) => s.tasks);
  const exams = useNexus((s) => s.exams);
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const setActiveModule = useUI((s) => s.setActiveModule);
  const setPaletteOpen = useUI((s) => s.setPaletteOpen);
  const setAiOpen = useUI((s) => s.setAiOpen);
  const mobileNavOpen = useUI((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUI((s) => s.setMobileNavOpen);
  const activeModule = useUI((s) => s.activeModule);

  const streakCount = useMemo(() => computeStreak(dailyLogs).current, [dailyLogs]);

  const notifications = useMemo<Notification[]>(() => {
    const today = todayKey();
    const list: Notification[] = [];
    for (const t of tasks) {
      if (t.status === 'done') continue;
      if (isOverdue(t)) {
        list.push({ id: t.id, title: t.title, detail: `Overdue since ${fmtDayFull(t.dueDate!)}`, tone: 'danger', module: 'tasks' });
      } else if (t.dueDate === today) {
        list.push({ id: t.id, title: t.title, detail: 'Due today', tone: 'warning', module: 'tasks' });
      }
    }
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    for (const e of exams) {
      if (e.date >= today && e.date <= in7.toISOString().slice(0, 10)) {
        list.push({ id: e.id, title: e.title, detail: `${e.type === 'exam' ? 'Exam' : 'Deadline'} · ${fmtDayFull(e.date)}`, tone: 'info', module: 'calendar' });
      }
    }
    return list;
  }, [tasks, exams]);

  const moduleLabel = MODULE_NAV.find((m) => m.id === activeModule)?.label ?? 'Dashboard';

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-0 px-3 md:glass md:border-x-0 md:border-t-0 md:px-5 max-md:pt-[env(safe-area-inset-top,0px)]">
      {/* Mobile nav */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="glass-strong w-64 p-0">
          <SheetHeader className="px-4 pb-0 pt-4">
            <SheetTitle className="text-left text-sm font-bold text-gradient">NEXUS OS</SheetTitle>
          </SheetHeader>
          <div className="px-3 pt-2">
            <button
              onClick={() => { setMobileNavOpen(false); setPaletteOpen(true); }}
              className="glass-chip flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Open command palette (Cmd+K)"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="flex-1 text-left">Search & commands</span>
              <span className="kbd">⌘K</span>
            </button>
          </div>
          <NavList collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="min-w-0 shrink">
        <p className="max-w-[76px] truncate text-sm font-black tracking-tight sm:max-w-none">{moduleLabel}</p>
        <p className="hidden truncate text-[11px] text-muted-foreground sm:block">{fmtDayFull(todayKey())} · {profile.university}</p>
      </div>

      {/* Top center intentionally left empty — the Dynamic Island floats there (fixed, z-60) */}
      <Button variant="ghost" size="icon" className="ml-auto inline-flex" onClick={() => setPaletteOpen(true)} aria-label="Search and commands">
        <Search className="h-4.5 w-4.5" aria-hidden="true" />
      </Button>

      <div className="ml-auto flex items-center gap-1 max-sm:hidden">
        {/* Compact glass search trigger (sm+) */}
        <motion.button
          onClick={() => setPaletteOpen(true)}
          className="glass-chip hidden items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs text-muted-foreground sm:flex"
          aria-label="Open command palette (Cmd+K)"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="kbd">⌘K</span>
        </motion.button>

        {/* Streak pill */}
        <div
          className="glass-chip hidden items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-foreground sm:flex"
          title="Current study streak"
        >
          <Flame className="h-3.5 w-3.5" aria-hidden="true" />
          {streakCount}d
        </div>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <motion.div
              className="inline-flex"
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${notifications.length})`}>
                <Bell className="h-4.5 w-4.5" aria-hidden="true" />
                {notifications.length > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-0.5 text-[9px] font-bold text-background">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </Button>
            </motion.div>
          </PopoverTrigger>
          <PopoverContent align="end" className="glass-strong w-80 p-2">
            <p className="px-2 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notification center
            </p>
            <div className="slim-scroll max-h-80 space-y-1 overflow-y-auto">
              {notifications.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">All clear — nothing needs attention 🎉</p>
              )}
              {notifications.slice(0, 12).map((n) => (
                <button
                  key={n.id}
                  onClick={() => setActiveModule(n.module as never)}
                  className="flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-accent"
                >
                  {n.tone === 'danger' ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-foreground font-medium" aria-hidden="true" />
                  ) : n.tone === 'warning' ? (
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-foreground/80" aria-hidden="true" />
                  ) : (
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden="true" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">{n.title}</span>
                    <span className="block text-[11px] text-muted-foreground">{n.detail}</span>
                  </span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Theme switcher (sm+ — Settings module covers mobile) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label="Switch theme">
              {THEME_OPTIONS.find((t) => t.id === theme)?.icon && (() => {
                const I = THEME_OPTIONS.find((t) => t.id === theme)!.icon;
                return <I className="h-4.5 w-4.5" aria-hidden="true" />;
              })()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-strong">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Theme</DropdownMenuLabel>
            {THEME_OPTIONS.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => setSetting({ theme: t.id })}
                className={cn('gap-2 text-xs', theme === t.id && 'bg-primary/10 text-primary')}
              >
                <t.icon className="h-3.5 w-3.5" aria-hidden="true" /> {t.label}
                {theme === t.id && <Badge variant="secondary" className="ml-auto px-1 py-0 text-[9px]">on</Badge>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* AI Coach */}
        <motion.div
          className="rounded-xl"
          whileHover={{ scale: 1.04, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
          whileTap={{ scale: 0.96, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
          animate={{
            boxShadow: [
              '0 0 20px -4px rgba(255,255,255,0.35)',
              '0 0 30px -2px rgba(255,255,255,0.45)',
              '0 0 20px -4px rgba(255,255,255,0.35)',
            ],
          }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Button
            size="sm"
            onClick={() => setAiOpen(true)}
            className="gap-1.5 rounded-xl bg-foreground px-2.5 text-background transition-colors hover:bg-foreground/90"
            aria-label="Open AI productivity coach"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden md:inline">AI Coach</span>
          </Button>
        </motion.div>
      </div>
    </header>
  );
}
