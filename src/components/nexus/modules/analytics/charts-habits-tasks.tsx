'use client';

// ─── Analytics Suite — habit & task charts (7, 8, 12, 13) ────────────────────

import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNexus } from '@/lib/nexus/store';
import {
  addDays, avg, clamp, dayTotalMinutes, downloadCSV, eachDayKeys, minutesToHM, startOfWeek,
} from '@/lib/nexus/utils';
import { ChartCard, RingProgress, baseTooltip, useChartTheme } from '../../ui-bits';
import {
  areaGradient, habitDoneDays, habitWeekPct, lastNWeeks, totalMinutesInDays, weekDaysOf,
} from './helpers';

// ─── 7 · Task Completion Trend ───────────────────────────────────────────────
export function TaskCompletionTrendChart() {
  const tasks = useNexus((s) => s.tasks);
  const theme = useChartTheme();
  const weeks = useMemo(() => lastNWeeks(12), []);
  const rows = useMemo(() => {
    const doneDates: Date[] = [];
    for (const t of tasks) if (t.completedAt) doneDates.push(new Date(t.completedAt));
    return weeks.map((w) => ({ label: w.label, count: doneDates.filter((d) => d >= w.start && d <= w.end).length }));
  }, [tasks, weeks]);

  const option = useMemo<EChartsOption>(() => ({
    tooltip: {
      ...baseTooltip(theme), trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: theme.split } },
    },
    grid: { left: 36, right: 14, top: 24, bottom: 24 },
    xAxis: {
      type: 'category', data: rows.map((r) => r.label), boundaryGap: false,
      axisTick: { show: false }, axisLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11 },
    },
    yAxis: {
      type: 'value', minInterval: 1,
      splitLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11 },
    },
    series: [{
      name: 'Tasks completed', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5, showSymbol: false,
      lineStyle: { width: 2, color: theme.palette[0] }, itemStyle: { color: theme.palette[0] },
      areaStyle: { color: areaGradient(theme.dark ? '#ffffff' : '#000000') },
      data: rows.map((r) => r.count),
    }],
  }), [theme, rows]);

  return (
    <ChartCard
      title="Task Completion Trend" subtitle="tasks completed per week · last 12 weeks"
      option={option}
      csv={{ name: 'task-completion-trend', rows: rows.map((r) => ({ week: r.label, completed: r.count })) }}
    />
  );
}

// ─── 8 · Habit Consistency Heatmap ───────────────────────────────────────────
export function HabitConsistencyHeatmapChart() {
  const habits = useNexus((s) => s.habits);
  const habitRecords = useNexus((s) => s.habitRecords);
  const theme = useChartTheme();
  const weeks = useMemo(() => lastNWeeks(10), []);
  const rows = useMemo(
    () => habits.flatMap((h, yi) => weeks.map((w, xi) => {
      const done = habitDoneDays(habitRecords, h.id, weekDaysOf(w));
      return {
        xi, yi, habit: h.name, week: w.label,
        pct: habitWeekPct(done, h.targetPerWeek), done, target: h.targetPerWeek,
      };
    })),
    [habits, habitRecords, weeks],
  );

  const option = useMemo<EChartsOption>(() => {
    const weekCount = weeks.length;
    return {
      tooltip: {
        ...baseTooltip(theme),
        formatter: (p) => {
          const q = Array.isArray(p) ? p[0] : p;
          const v = q.value as number[];
          const row = rows[v[1] * weekCount + v[0]];
          return `${row?.habit ?? '—'} · ${row?.week ?? '—'} · ${row?.pct ?? 0}% (${row?.done ?? 0}/${row?.target ?? 0} days)`;
        },
      },
      grid: { left: 8, right: 16, top: 12, bottom: 46, containLabel: true },
      xAxis: {
        type: 'category', data: weeks.map((w) => w.label),
        axisTick: { show: false }, axisLine: { lineStyle: { color: theme.split } },
        axisLabel: { color: theme.subtext, fontSize: 10 },
      },
      yAxis: {
        type: 'category', data: habits.map((h) => h.name),
        axisTick: { show: false }, axisLine: { show: false },
        axisLabel: { color: theme.text, fontSize: 11, width: 128, overflow: 'truncate' },
      },
      visualMap: {
        min: 0, max: 100, orient: 'horizontal', left: 'center', bottom: 4,
        itemWidth: 10, itemHeight: 72, text: ['on track', 'off track'],
        textStyle: { color: theme.subtext, fontSize: 10 },
        inRange: {
          color: theme.dark
            ? ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.20)', 'rgba(255,255,255,0.45)', 'rgba(255,255,255,0.72)', 'rgba(255,255,255,0.95)']
            : ['rgba(0,0,0,0.03)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.42)', 'rgba(0,0,0,0.70)', 'rgba(0,0,0,0.92)'],
        },
      },
      series: [{
        name: 'Consistency', type: 'heatmap',
        data: rows.map((r) => [r.xi, r.yi, r.pct]),
        itemStyle: { borderRadius: 3, borderColor: theme.bg, borderWidth: 2 },
        emphasis: { itemStyle: { borderColor: theme.text, borderWidth: 1 } },
      }],
    };
  }, [theme, rows, weeks, habits]);

  return (
    <ChartCard
      className="xl:col-span-2"
      title="Habit Consistency Heatmap" subtitle="% of weekly target hit · last 10 weeks"
      option={option} height={300}
      csv={{ name: 'habit-consistency', rows: rows.map((r) => ({ habit: r.habit, week: r.week, pct: r.pct, done_days: r.done, target_per_week: r.target })) }}
    />
  );
}

// ─── 13 · Task Burndown ──────────────────────────────────────────────────────
export function TaskBurndownChart() {
  const tasks = useNexus((s) => s.tasks);
  const theme = useChartTheme();
  const weeks = useMemo(() => lastNWeeks(12), []);
  const rows = useMemo(() => {
    const now = Date.now();
    return weeks.map((w) => {
      const weekEnd = w.end.getTime() > now ? new Date(now) : w.end;
      const open = tasks.filter(
        (t) => new Date(t.createdAt) <= weekEnd && (!t.completedAt || new Date(t.completedAt) > weekEnd),
      ).length;
      return { label: w.label, open };
    });
  }, [tasks, weeks]);

  const option = useMemo<EChartsOption>(() => ({
    tooltip: {
      ...baseTooltip(theme), trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: theme.split } },
    },
    grid: { left: 36, right: 14, top: 24, bottom: 24 },
    xAxis: {
      type: 'category', data: rows.map((r) => r.label), boundaryGap: false,
      axisTick: { show: false }, axisLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11 },
    },
    yAxis: {
      type: 'value', minInterval: 1,
      splitLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11 },
    },
    series: [{
      name: 'Open tasks', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5, showSymbol: false,
      lineStyle: { width: 2, color: theme.palette[0] }, itemStyle: { color: theme.palette[0] },
      areaStyle: { color: areaGradient(theme.dark ? '#ffffff' : '#000000') },
      data: rows.map((r) => r.open),
    }],
  }), [theme, rows]);

  return (
    <ChartCard
      title="Task Burndown" subtitle="open tasks at end of each week · last 12 weeks"
      option={option}
      csv={{ name: 'task-burndown', rows: rows.map((r) => ({ week: r.label, open: r.open })) }}
    />
  );
}

// ─── 12 · Semester Goal Progress (custom widget) ─────────────────────────────
function GoalBar({ label, value, color, detail }: { label: string; value: number; color: string; detail: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="text-foreground/90">{label}</span>
        <span className="font-mono tabular-nums text-muted-foreground">{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${clamp(value, 0, 100)}%`, backgroundColor: color }}
        />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{detail}</p>
    </div>
  );
}

export function SemesterGoalProgress() {
  const profile = useNexus((s) => s.profile);
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const subjects = useNexus((s) => s.subjects);
  const habits = useNexus((s) => s.habits);
  const habitRecords = useNexus((s) => s.habitRecords);

  const data = useMemo(() => {
    const end = new Date();
    const days = eachDayKeys(addDays(end, -83), end); // 84-day semester window
    const total = totalMinutesInDays(dailyLogs, days);
    const goal = Math.max(1, profile.dailyTargetHours * 60 * 84);
    const target = profile.dailyTargetHours * 60;
    const metDays = days.filter((d) => dayTotalMinutes(dailyLogs[d]) >= target).length;
    const adherence = Math.round((metDays / days.length) * 100);

    const weekDays = eachDayKeys(startOfWeek(end), end);
    const codingIds = new Set(subjects.filter((s) => s.category === 'coding').map((s) => s.id));
    let codingMin = 0;
    for (const d of weekDays) {
      for (const [id, m] of Object.entries(dailyLogs[d]?.minutes ?? {})) {
        if (codingIds.has(id)) codingMin += m;
      }
    }
    const codingPct = profile.weeklyCodingTargetHours > 0
      ? Math.round((codingMin / 60 / profile.weeklyCodingTargetHours) * 100)
      : 0;

    const monthDays = eachDayKeys(new Date(end.getFullYear(), end.getMonth(), 1), end);
    const scores = habits.map((h) => {
      const done = habitDoneDays(habitRecords, h.id, monthDays);
      return Math.min(100, Math.round((done / monthDays.length) * 100));
    });
    const habitScore = Math.round(avg(scores));

    return { total, goal, metDays, totalDays: days.length, adherence, codingMin, codingPct, habitScore };
  }, [profile, dailyLogs, subjects, habits, habitRecords]);

  const overall = Math.round((data.total / data.goal) * 100);
  const csvRows = [
    { metric: 'semester_focus_minutes', value: data.total, pct_of_goal: overall },
    { metric: 'daily_target_adherence', value: data.metDays, pct: data.adherence },
    { metric: 'coding_this_week_minutes', value: data.codingMin, pct: data.codingPct },
    { metric: 'habit_score_this_month', value: data.habitScore, pct: data.habitScore },
  ];

  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-1 flex items-start justify-between gap-2 pr-8">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Semester Goal Progress</h3>
          <p className="text-xs text-muted-foreground">84-day window · {data.metDays}/{data.totalDays} days met target</p>
        </div>
        <Button
          variant="ghost" size="sm"
          className="h-7 gap-1 px-2 text-[11px] text-muted-foreground"
          onClick={() => downloadCSV('semester-goal-progress', csvRows)}
          aria-label="Export semester goal progress as CSV"
        >
          <Download className="h-3 w-3" aria-hidden="true" /> CSV
        </Button>
      </div>

      <div className="mt-3 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <RingProgress value={overall} size={116} stroke={10} color="currentColor" label={`${overall}% of semester goal`}>
          <span className="font-mono text-xl font-semibold tabular-nums">{overall}%</span>
          <span className="text-[10px] text-muted-foreground">of goal</span>
        </RingProgress>
        <div className="w-full flex-1 space-y-3.5">
          <GoalBar
            label="Daily target adherence" value={data.adherence} color="var(--ink-2)"
            detail={`${data.metDays} of ${data.totalDays} days hit ${minutesToHM(profile.dailyTargetHours * 60)}`}
          />
          <GoalBar
            label="Coding weekly target" value={data.codingPct} color="var(--ink-3)"
            detail={`${minutesToHM(data.codingMin)} of ${profile.weeklyCodingTargetHours}h this week`}
          />
          <GoalBar
            label="Habit score (this month)" value={data.habitScore} color="var(--ink-4)"
            detail={`${data.habitScore}% avg completion across ${habits.length} habits`}
          />
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {minutesToHM(data.total)} of {minutesToHM(data.goal)} semester focus goal
      </p>
    </div>
  );
}
