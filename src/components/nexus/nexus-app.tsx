'use client';

import { useEffect, useMemo } from 'react';
import type { ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'sonner';
import { useNexus, useUI } from '@/lib/nexus/store';
import type { ModuleId } from '@/lib/nexus/types';
import AuroraBackground from './aurora-background';
import DynamicIsland from './dynamic-island';
import Sidebar from './sidebar';
import Topbar from './topbar';
import StatusBar from './status-bar';
import MobileTabBar from './mobile-tabbar';
import CommandPalette from './command-palette';
import AIDrawer from './ai-drawer';

import DashboardModule from './modules/dashboard';
import DailyTrackerModule from './modules/daily-tracker';
import SessionsModule from './modules/sessions';
import TasksModule from './modules/tasks';
import HabitsModule from './modules/habits';
import AnalyticsModule from './modules/analytics';
import RoadmapModule from './modules/roadmap';
import DsaModule from './modules/dsa';
import CalendarModule from './modules/calendar';
import TimetableModule from './modules/timetable';
import NotesModule from './modules/notes';
import ReportsModule from './modules/reports';
import SettingsModule from './modules/settings';

const MODULES: Record<ModuleId, ComponentType> = {
  dashboard: DashboardModule,
  tracker: DailyTrackerModule,
  sessions: SessionsModule,
  tasks: TasksModule,
  habits: HabitsModule,
  analytics: AnalyticsModule,
  roadmap: RoadmapModule,
  dsa: DsaModule,
  calendar: CalendarModule,
  timetable: TimetableModule,
  notes: NotesModule,
  reports: ReportsModule,
  settings: SettingsModule,
};

const DARK_THEMES = ['dark', 'oled', 'cyberpunk'];

function BootScreen() {
  return (
    <div className="grid-bg flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="animate-pulse-glow text-3xl font-bold tracking-tight text-gradient">NEXUS OS</div>
      <div className="flex items-center gap-1.5" aria-label="Loading NexusOS">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${i * 140}ms` }} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Booting your productivity system…</p>
    </div>
  );
}

export default function NexusApp() {
  const hydrated = useNexus((s) => s._hydrated);
  const theme = useNexus((s) => s.settings.theme);
  const active = useUI((s) => s.activeModule);
  const setActiveModule = useUI((s) => s.setActiveModule);
  const setPaletteOpen = useUI((s) => s.setPaletteOpen);

  // Apply data-theme + dark class
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark', DARK_THEMES.includes(theme));
    root.style.colorScheme = DARK_THEMES.includes(theme) ? 'dark' : 'light';
  }, [theme]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === 'n') {
        useUI.getState().setActiveModule('tasks');
        window.dispatchEvent(new CustomEvent('nexus:new-task'));
      } else if (e.key.toLowerCase() === 's') {
        useUI.getState().setActiveModule('sessions');
        window.dispatchEvent(new CustomEvent('nexus:toggle-timer'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPaletteOpen]);

  const ActiveModule = useMemo(() => MODULES[active] ?? DashboardModule, [active]);

  if (!hydrated) return <BootScreen />;

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      {/* GlassOS living aurora backdrop (fixed, z-0) */}
      <AuroraBackground />

      <div className="relative z-10 flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main id="nexus-main" className="slim-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pt-14 pb-28 [scrollbar-width:thin] sm:p-5 sm:pt-14 sm:pb-28 lg:p-6 lg:pt-16 lg:pb-6" tabIndex={-1}>
            {/* Spring-physics module transitions */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 16, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.99 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26, mass: 0.9 }}
                className="mx-auto w-full max-w-7xl"
              >
                <ActiveModule />
              </motion.div>
            </AnimatePresence>
          </main>
          <StatusBar />
        </div>
      </div>

      <MobileTabBar />

      <CommandPalette />
      <AIDrawer />
      <DynamicIsland />
      <Toaster position="bottom-right" richColors closeButton theme={DARK_THEMES.includes(theme) ? 'dark' : 'light'} />
    </div>
  );
}

/** Navigate programmatically from anywhere (used by palette/notifications). */
export function gotoModule(m: ModuleId) {
  useUI.getState().setActiveModule(m);
  document.getElementById('nexus-main')?.scrollTo({ top: 0 });
}
