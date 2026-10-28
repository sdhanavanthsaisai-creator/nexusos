// ─── Analytics Suite — shared data-derivation helpers ────────────────────────
// Pure functions only. Chart components call these inside useMemo.

import type { EChartsOption } from 'echarts';
import type { ChartThemeInfo } from '@/components/nexus/echarts-wrapper';
import type { DailyLog, HabitRecords, StudySession, Subject, SubjectCategory } from '@/lib/nexus/types';
import {
  addDays, dateKey, dayTotalMinutes, eachDayKeys, fmtDayNum,
  linearRegression, parseKey, round1, startOfWeek, sum,
} from '@/lib/nexus/utils';

export interface RangeWindow { start: Date; end: Date; days: string[]; }
export interface ChartProps { range: RangeWindow; }
export interface WeekWindow { start: Date; end: Date; label: string; }

export const CATEGORY_ORDER: SubjectCategory[] = ['college', 'coding', 'language', 'music', 'fitness', 'dsa'];

// ─── Colors ──────────────────────────────────────────────────────────────────
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = Number.parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Vertical fade gradient (solid top → transparent bottom) from a hex color. */
export const areaGradient = (hex: string) => ({
  type: 'linear' as const,
  x: 0, y: 0, x2: 0, y2: 1,
  colorStops: [
    { offset: 0, color: hexToRgba(hex, 0.35) },
    { offset: 1, color: hexToRgba(hex, 0.02) },
  ],
});

/** NexusOS-styled dataZoom pair (inside + slider) — monochrome RB/25. */
export const dataZoomStyled = (theme: ChartThemeInfo): EChartsOption['dataZoom'] => [
  { type: 'inside' },
  {
    type: 'slider', height: 16, bottom: 6,
    fillerColor: theme.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)', borderColor: 'transparent',
    handleStyle: { color: theme.dark ? '#ffffff' : '#000000' },
    moveHandleStyle: { color: theme.dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' },
    emphasis: {
      handleStyle: { color: theme.dark ? '#ffffff' : '#000000' },
      moveHandleStyle: { color: theme.dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' },
    },
    dataBackground: {
      lineStyle: { color: theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)' },
      areaStyle: { color: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
    },
    selectedDataBackground: {
      lineStyle: { color: theme.dark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.32)' },
      areaStyle: { color: theme.dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)' },
    },
    textStyle: { color: theme.subtext, fontSize: 10 },
  },
];

// ─── Weeks ───────────────────────────────────────────────────────────────────
/** Last n Monday-based weeks, oldest → newest (current week included). */
export function lastNWeeks(n: number, ref = new Date()): WeekWindow[] {
  const anchor = startOfWeek(ref);
  const weeks: WeekWindow[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const start = addDays(anchor, -i * 7);
    const end = addDays(start, 6);
    end.setHours(23, 59, 59, 999);
    weeks.push({ start, end, label: fmtDayNum(dateKey(start)) });
  }
  return weeks;
}

export const weekDaysOf = (w: WeekWindow): string[] => eachDayKeys(w.start, w.end);

// ─── Daily logs ──────────────────────────────────────────────────────────────
export function dailyMinutes(logs: Record<string, DailyLog>, days: string[]): { day: string; minutes: number }[] {
  return days.map((day) => ({ day, minutes: dayTotalMinutes(logs[day]) }));
}

export function totalMinutesInDays(logs: Record<string, DailyLog>, days: string[]): number {
  return sum(days.map((d) => dayTotalMinutes(logs[d])));
}

export function sessionsInDays(sessions: StudySession[], days: string[]): StudySession[] {
  const set = new Set(days);
  return sessions.filter((s) => set.has(s.date));
}

function subjectMinutesInDays(logs: Record<string, DailyLog>, days: string[], subjectId: string): number {
  let total = 0;
  for (const d of days) total += logs[d]?.minutes[subjectId] ?? 0;
  return total;
}

export interface SubjectTotal { subject: Subject; minutes: number; }

export function topSubjectsByMinutes(
  subjects: Subject[], logs: Record<string, DailyLog>, days: string[], n: number,
): SubjectTotal[] {
  return subjects
    .map((subject) => ({ subject, minutes: subjectMinutesInDays(logs, days, subject.id) }))
    .filter((x) => x.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, Math.max(0, n));
}

/** Per-week totals keyed by subjectId, for stacked week × subject charts. */
export function weeklySubjectMap(
  weeks: WeekWindow[], logs: Record<string, DailyLog>,
): { week: WeekWindow; bySubject: Map<string, number> }[] {
  return weeks.map((week) => {
    const bySubject = new Map<string, number>();
    for (const d of weekDaysOf(week)) {
      const log = logs[d];
      if (!log) continue;
      for (const [id, m] of Object.entries(log.minutes)) bySubject.set(id, (bySubject.get(id) ?? 0) + m);
    }
    return { week, bySubject };
  });
}

// ─── Categories ──────────────────────────────────────────────────────────────
export interface DayCategorySplit {
  day: string; college: number; coding: number; language: number; music: number; fitness: number; dsa: number;
}

export function categoryMinutesPerDay(
  subjects: Subject[], logs: Record<string, DailyLog>, days: string[],
): DayCategorySplit[] {
  const catOf = new Map(subjects.map((s) => [s.id, s.category] as const));
  return days.map((day) => {
    const split: DayCategorySplit = { day, college: 0, coding: 0, language: 0, music: 0, fitness: 0, dsa: 0 };
    const log = logs[day];
    if (log) {
      for (const [id, m] of Object.entries(log.minutes)) {
        const cat = catOf.get(id);
        if (cat) split[cat] += m;
      }
    }
    return split;
  });
}

export function categoryTotals(splits: DayCategorySplit[]): Record<SubjectCategory, number> {
  const totals: Record<SubjectCategory, number> = { college: 0, coding: 0, language: 0, music: 0, fitness: 0, dsa: 0 };
  for (const s of splits) for (const c of CATEGORY_ORDER) totals[c] += s[c];
  return totals;
}

// ─── Habits ──────────────────────────────────────────────────────────────────
export function habitDoneDays(records: HabitRecords, habitId: string, days: string[]): number {
  const rec = records[habitId] ?? {};
  let done = 0;
  for (const d of days) if (rec[d]) done += 1;
  return done;
}

/** % of the weekly target hit (capped at 100). */
export function habitWeekPct(doneDays: number, targetPerWeek: number): number {
  if (targetPerWeek <= 0) return doneDays > 0 ? 100 : 0;
  return Math.min(100, Math.round((doneDays / targetPerWeek) * 100));
}

// ─── Forecast ────────────────────────────────────────────────────────────────
export interface ForecastResult { forecast: (number | null)[]; slopePerDay: number; }

/** Least-squares trend over `minutes`, evaluated from the last point + `extend` days. */
export function buildForecast(minutes: number[], extend: number): ForecastResult {
  const { a, b } = linearRegression(minutes.map((y, x) => ({ x, y })));
  const last = Math.max(0, minutes.length - 1);
  const at = (x: number) => Math.max(0, round1(a + b * x));
  const forecast: (number | null)[] = minutes.map((_, i) => (i === last ? at(i) : null));
  for (let i = 1; i <= extend; i += 1) forecast.push(at(last + i));
  return { forecast, slopePerDay: round1(b) };
}

export function extendDayKeys(lastDay: string, n: number): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= n; i += 1) keys.push(dateKey(addDays(parseKey(lastDay), i)));
  return keys;
}

// ─── Misc ────────────────────────────────────────────────────────────────────
export const asNum = (v: unknown): number => Number(v ?? 0);
