import {
  LayoutDashboard, CalendarCheck2, Timer, ListChecks, Flame, BarChart3,
  Map, Braces, CalendarDays, CalendarRange, NotebookPen, FileBarChart2, Settings2,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleId } from '@/lib/nexus/types';

/** One icon per module, shared by every navigation surface. */
export const NAV_ICONS: Record<ModuleId, LucideIcon> = {
  dashboard: LayoutDashboard,
  tracker: CalendarCheck2,
  sessions: Timer,
  tasks: ListChecks,
  habits: Flame,
  analytics: BarChart3,
  roadmap: Map,
  dsa: Braces,
  calendar: CalendarDays,
  timetable: CalendarRange,
  notes: NotebookPen,
  reports: FileBarChart2,
  settings: Settings2,
};
