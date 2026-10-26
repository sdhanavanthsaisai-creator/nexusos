'use client';

import { useEffect, useMemo } from 'react';
import type { ComponentType } from 'react';
import { Toaster } from 'sonner';
import { useNexus, useUI } from '@/lib/nexus/store';
import type { ModuleId } from '@/lib/nexus/types';
import Sidebar from './sidebar';
import Topbar from './topbar';
import StatusBar from './status-bar';
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
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main id="nexus-main" className="slim-scroll grid-bg min-h-0 flex-1 overflow-y-auto p-4 md:p-6" tabIndex={-1}>
            <div key={active} className="nxs-fade-in mx-auto w-full max-w-7xl">
              <ActiveModule />
            </div>
          </main>
          <StatusBar />
        </div>
      </div>
      <CommandPalette />
      <AIDrawer />
      <Toaster position="bottom-right" richColors closeButton theme={DARK_THEMES.includes(theme) ? 'dark' : 'light'} />
    </div>
  );
}

/** Navigate programmatically from anywhere (used by palette/notifications). */
export function gotoModule(m: ModuleId) {
  useUI.getState().setActiveModule(m);
  document.getElementById('nexus-main')?.scrollTo({ top: 0 });
}
