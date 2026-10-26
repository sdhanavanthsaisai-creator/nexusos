'use client';

// ─── Analytics Suite — time-based charts (1, 2, 4, 5, 6, 16, 17, 18) ─────────

import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { SubjectCategory } from '@/lib/nexus/types';
import { useNexus } from '@/lib/nexus/store';
import {
  addDays, dateKey, dayTotalMinutes, eachDayKeys, fmtDayNum, minutesToHM,
  minutesToLabel, parseKey, round1, startOfWeek, todayKey,
} from '@/lib/nexus/utils';
import { CATEGORY_META } from '@/lib/nexus/constants';
import { ChartCard, baseTooltip, useChartTheme } from '../../ui-bits';
import {
  CATEGORY_ORDER, areaGradient, asNum, buildForecast, categoryMinutesPerDay, dailyMinutes,
  dataZoomStyled, extendDayKeys, lastNWeeks, totalMinutesInDays, weekDaysOf, weeklySubjectMap,
  type ChartProps, type DayCategorySplit,
} from './helpers';

// ─── 1 · Daily Study Minutes ─────────────────────────────────────────────────
export function DailyMinutesChart({ range }: ChartProps) {
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const dailyTargetMinutes = useNexus((s) => s.profile.dailyTargetHours) * 60;
  const theme = useChartTheme();
  const { days } = range;
  const rows = useMemo(() => dailyMinutes(dailyLogs, days), [dailyLogs, days]);

  const option = useMemo<EChartsOption>(() => ({
    tooltip: {
      ...baseTooltip(theme), trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: theme.split } },
      valueFormatter: (v) => minutesToHM(asNum(v)),
    },
    grid: { left: 44, right: 14, top: 28, bottom: days.length > 31 ? 48 : 24 },
    xAxis: {
      type: 'category', data: days, boundaryGap: false,
      axisLine: { lineStyle: { color: theme.split } }, axisTick: { show: false },
      axisLabel: { color: theme.subtext, fontSize: 11, hideOverlap: true, formatter: (v) => fmtDayNum(String(v)) },
    },
    yAxis: {
      type: 'value', splitLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11, formatter: (v) => minutesToLabel(asNum(v)) },
    },
    dataZoom: days.length > 31 ? dataZoomStyled(theme) : undefined,
    series: [{
      name: 'Study minutes', type: 'line', smooth: true, symbol: 'none',
      lineStyle: { width: 2, color: '#22d3ee' }, itemStyle: { color: '#22d3ee' },
      areaStyle: { color: areaGradient('#22d3ee') },
      markLine: {
        silent: true, symbol: 'none',
        lineStyle: { type: 'dashed', color: '#fbbf24', width: 1 },
        label: { formatter: 'target', color: '#fbbf24', fontSize: 10, position: 'insideEndTop' },
        data: [{ yAxis: dailyTargetMinutes }],
      },
      data: rows.map((r) => r.minutes),
    }],
  }), [theme, days, rows, dailyTargetMinutes]);

  return (
    <ChartCard
      title="Daily Study Minutes"
      subtitle={`${days.length} days · target ${minutesToLabel(dailyTargetMinutes)}/day`}
      option={option}
      csv={{ name: 'daily-study-minutes', rows: rows.map((r) => ({ day: r.day, minutes: r.minutes, hours: round1(r.minutes / 60) })) }}
    />
  );
}

// ─── 2 · Weekly Totals ───────────────────────────────────────────────────────
export function WeeklyTotalsChart() {
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const theme = useChartTheme();
  const weeks = useMemo(() => lastNWeeks(12), []);
  const rows = useMemo(
    () => weeks.map((w) => ({ label: w.label, minutes: totalMinutesInDays(dailyLogs, weekDaysOf(w)) })),
    [weeks, dailyLogs],
  );

  const option = useMemo<EChartsOption>(() => ({
    tooltip: {
      ...baseTooltip(theme), trigger: 'axis', axisPointer: { type: 'shadow' },
      valueFormatter: (v) => minutesToHM(asNum(v)),
    },
    grid: { left: 44, right: 14, top: 24, bottom: 24 },
    xAxis: {
      type: 'category', data: rows.map((r) => r.label),
      axisTick: { show: false }, axisLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11 },
    },
    yAxis: {
      type: 'value', splitLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11, formatter: (v) => minutesToLabel(asNum(v)) },
    },
    series: [{
      name: 'Weekly minutes', type: 'bar', barMaxWidth: 26,
      itemStyle: { color: '#22d3ee', borderRadius: [6, 6, 0, 0] },
      data: rows.map((r) => r.minutes),
    }],
  }), [theme, rows]);

  return (
    <ChartCard
      title="Weekly Totals" subtitle="total focus per week · last 12 weeks"
      option={option}
      csv={{ name: 'weekly-totals', rows: rows.map((r) => ({ week_start: r.label, minutes: r.minutes, hours: round1(r.minutes / 60) })) }}
    />
  );
}

// ─── 4 · College vs Coding ───────────────────────────────────────────────────
export function CollegeVsCodingChart({ range }: ChartProps) {
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const subjects = useNexus((s) => s.subjects);
  const theme = useChartTheme();
  const { days } = range;
  const rows = useMemo(() => categoryMinutesPerDay(subjects, dailyLogs, days), [subjects, dailyLogs, days]);

  const option = useMemo<EChartsOption>(() => {
    const groups: { name: string; color: string; pick: (r: DayCategorySplit) => number }[] = [
      { name: CATEGORY_META.college.label, color: CATEGORY_META.college.color, pick: (r) => r.college },
      { name: CATEGORY_META.coding.label, color: CATEGORY_META.coding.color, pick: (r) => r.coding },
      { name: 'Other', color: '#fbbf24', pick: (r) => r.language + r.music + r.fitness + r.dsa },
    ];
    return {
      tooltip: {
        ...baseTooltip(theme), trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: theme.split } },
        valueFormatter: (v) => minutesToHM(asNum(v)),
      },
      color: groups.map((g) => g.color),
      legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: theme.text, fontSize: 11 } },
      grid: { left: 44, right: 14, top: 30, bottom: days.length > 31 ? 48 : 24 },
      xAxis: {
        type: 'category', data: days, boundaryGap: false,
        axisLine: { lineStyle: { color: theme.split } }, axisTick: { show: false },
        axisLabel: { color: theme.subtext, fontSize: 11, hideOverlap: true, formatter: (v) => fmtDayNum(String(v)) },
      },
      yAxis: {
        type: 'value', splitLine: { lineStyle: { color: theme.split } },
        axisLabel: { color: theme.subtext, fontSize: 11, formatter: (v) => minutesToLabel(asNum(v)) },
      },
      dataZoom: days.length > 31 ? dataZoomStyled(theme) : undefined,
      series: groups.map((g) => ({
        name: g.name, type: 'line', stack: 'focus', smooth: true, symbol: 'none',
        lineStyle: { width: 1.5, color: g.color }, itemStyle: { color: g.color },
        areaStyle: { color: areaGradient(g.color) }, emphasis: { focus: 'series' },
        data: rows.map((r) => g.pick(r)),
      })),
    };
  }, [theme, days, rows]);

  const csvRows = useMemo(
    () => rows.map((r) => ({
      day: r.day, college: r.college, coding: r.coding,
      other: r.language + r.music + r.fitness + r.dsa,
    })),
    [rows],
  );

  return (
    <ChartCard title="College vs Coding" subtitle="stacked daily minutes by category group" option={option} csv={{ name: 'college-vs-coding', rows: csvRows }} />
  );
}

// ─── 5 · Study Heatmap (GitHub-style calendar) ───────────────────────────────
export function StudyHeatmapChart() {
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const theme = useChartTheme();
  const win = useMemo(() => {
    const today = new Date();
    return { startKey: dateKey(addDays(startOfWeek(today), -15 * 7)), endKey: dateKey(today) };
  }, []);
  const data = useMemo(() => {
    const days = eachDayKeys(parseKey(win.startKey), parseKey(win.endKey));
    return days.map((d) => [d, dayTotalMinutes(dailyLogs[d])] as [string, number]);
  }, [win, dailyLogs]);
  const maxMinutes = useMemo(() => Math.max(60, ...data.map(([, m]) => m)), [data]);

  const option = useMemo<EChartsOption>(() => ({
    tooltip: {
      ...baseTooltip(theme),
      formatter: (p) => {
        const q = Array.isArray(p) ? p[0] : p;
        const v = q.value as (string | number)[];
        return `${String(v[0])}<br/>${minutesToHM(asNum(v[1]))}`;
      },
    },
    visualMap: {
      min: 0, max: maxMinutes, orient: 'horizontal', left: 'center', bottom: 2,
      itemWidth: 10, itemHeight: 72, text: ['more', 'less'],
      textStyle: { color: theme.subtext, fontSize: 10 },
      inRange: { color: [theme.dark ? '#1a1a20' : '#eef0f3', '#22d3ee', '#a78bfa'] },
    },
    calendar: {
      top: 30, left: 'center', cellSize: 14, range: [win.startKey, win.endKey],
      itemStyle: { color: theme.dark ? '#1a1a20' : '#eef0f3', borderColor: theme.bg, borderWidth: 3 },
      splitLine: { show: false },
      dayLabel: { color: theme.subtext, fontSize: 10, margin: 6 },
      monthLabel: { color: theme.subtext, fontSize: 10 },
      yearLabel: { show: false },
    },
    series: [{ name: 'Study minutes', type: 'heatmap', coordinateSystem: 'calendar', data }],
  }), [theme, win, data, maxMinutes]);

  return (
    <ChartCard
      className="xl:col-span-2"
      title="Study Heatmap" subtitle="last 16 weeks · deeper = more focus"
      option={option} height={232}
      csv={{ name: 'study-heatmap', rows: data.map(([date, minutes]) => ({ date, minutes, hours: round1(minutes / 60) })) }}
    />
  );
}

// ─── 6 · Weekly Focus by Category ────────────────────────────────────────────
export function WeeklyFocusByCategoryChart() {
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const subjects = useNexus((s) => s.subjects);
  const theme = useChartTheme();
  const weeks = useMemo(() => lastNWeeks(12), []);
  const rows = useMemo(() => {
    const catOf = new Map(subjects.map((s) => [s.id, s.category] as const));
    return weeklySubjectMap(weeks, dailyLogs).map(({ week, bySubject }) => {
      const cats: Record<SubjectCategory, number> = { college: 0, coding: 0, language: 0, music: 0, fitness: 0, dsa: 0 };
      for (const [id, m] of bySubject) {
        const cat = catOf.get(id);
        if (cat) cats[cat] += m;
      }
      return { label: week.label, cats };
    });
  }, [weeks, subjects, dailyLogs]);
  const present = useMemo(() => CATEGORY_ORDER.filter((c) => rows.some((r) => r.cats[c] > 0)), [rows]);

  const option = useMemo<EChartsOption>(() => ({
    tooltip: {
      ...baseTooltip(theme), trigger: 'axis', axisPointer: { type: 'shadow' },
      valueFormatter: (v) => minutesToHM(asNum(v)),
    },
    color: present.map((c) => CATEGORY_META[c].color),
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: theme.text, fontSize: 11 } },
    grid: { left: 44, right: 14, top: 30, bottom: 24 },
    xAxis: {
      type: 'category', data: rows.map((r) => r.label),
      axisTick: { show: false }, axisLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11 },
    },
    yAxis: {
      type: 'value', splitLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11, formatter: (v) => minutesToLabel(asNum(v)) },
    },
    series: present.map((c) => ({
      name: CATEGORY_META[c].label, type: 'bar', stack: 'focus', barMaxWidth: 24,
      itemStyle: { color: CATEGORY_META[c].color }, emphasis: { focus: 'series' },
      data: rows.map((r) => r.cats[c]),
    })),
  }), [theme, rows, present]);

  const csvRows = useMemo(
    () => rows.flatMap((r) => CATEGORY_ORDER.map((c) => ({ week: r.label, category: c, minutes: r.cats[c] }))),
    [rows],
  );

  return (
    <ChartCard title="Weekly Focus by Category" subtitle="minutes per category · last 12 weeks" option={option} csv={{ name: 'weekly-focus-category', rows: csvRows }} />
  );
}

// ─── 16 · Cumulative Study Hours ─────────────────────────────────────────────
export function CumulativeHoursChart({ range }: ChartProps) {
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const theme = useChartTheme();
  const { days } = range;
  const rows = useMemo(() => {
    const src = dailyMinutes(dailyLogs, days);
    return src.map((r, i) => ({
      day: r.day,
      hours: round1(src.slice(0, i + 1).reduce((a, b) => a + b.minutes, 0) / 60),
    }));
  }, [dailyLogs, days]);

  const option = useMemo<EChartsOption>(() => ({
    tooltip: {
      ...baseTooltip(theme), trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: theme.split } },
      valueFormatter: (v) => `${asNum(v).toFixed(1)}h`,
    },
    grid: { left: 44, right: 14, top: 24, bottom: days.length > 31 ? 48 : 24 },
    xAxis: {
      type: 'category', data: rows.map((r) => r.day), boundaryGap: false,
      axisLine: { lineStyle: { color: theme.split } }, axisTick: { show: false },
      axisLabel: { color: theme.subtext, fontSize: 11, hideOverlap: true, formatter: (v) => fmtDayNum(String(v)) },
    },
    yAxis: {
      type: 'value', splitLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11, formatter: (v) => `${asNum(v)}h` },
    },
    dataZoom: days.length > 31 ? dataZoomStyled(theme) : undefined,
    series: [{
      name: 'Cumulative hours', type: 'line', smooth: true, symbol: 'none',
      lineStyle: { width: 2, color: '#a78bfa' }, itemStyle: { color: '#a78bfa' },
      areaStyle: { color: areaGradient('#a78bfa') },
      data: rows.map((r) => r.hours),
    }],
  }), [theme, days.length, rows]);

  const total = rows.length > 0 ? rows[rows.length - 1].hours : 0;
  return (
    <ChartCard
      title="Cumulative Study Hours" subtitle={`${total}h accumulated in range`}
      option={option}
      csv={{ name: 'cumulative-study-hours', rows: rows.map((r) => ({ day: r.day, cumulative_hours: r.hours })) }}
    />
  );
}

// ─── 17 · Forecast Tracking ──────────────────────────────────────────────────
export function ForecastTrackingChart({ range }: ChartProps) {
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const targetMinutes = useNexus((s) => s.profile.dailyTargetHours) * 60;
  const theme = useChartTheme();
  const { days } = range;
  const rows = useMemo(() => dailyMinutes(dailyLogs, days), [dailyLogs, days]);
  const allDays = useMemo(() => [...days, ...extendDayKeys(days[days.length - 1] ?? todayKey(), 14)], [days]);
  const { forecast, slopePerDay } = useMemo(() => buildForecast(rows.map((r) => r.minutes), 14), [rows]);
  const actualData = useMemo<(number | null)[]>(() => [...rows.map((r) => r.minutes), ...new Array<null>(14).fill(null)], [rows]);
  const showZoom = allDays.length > 31;

  const option = useMemo<EChartsOption>(() => ({
    tooltip: {
      ...baseTooltip(theme), trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: theme.split } },
      valueFormatter: (v) => (v == null ? '—' : minutesToHM(asNum(v))),
    },
    legend: { top: 0, left: 0, itemWidth: 14, textStyle: { color: theme.text, fontSize: 11 } },
    grid: { left: 44, right: 14, top: 30, bottom: showZoom ? 48 : 24 },
    xAxis: {
      type: 'category', data: allDays, boundaryGap: false,
      axisLine: { lineStyle: { color: theme.split } }, axisTick: { show: false },
      axisLabel: { color: theme.subtext, fontSize: 11, hideOverlap: true, formatter: (v) => fmtDayNum(String(v)) },
    },
    yAxis: {
      type: 'value', splitLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11, formatter: (v) => minutesToLabel(asNum(v)) },
    },
    dataZoom: showZoom ? dataZoomStyled(theme) : undefined,
    series: [
      {
        name: 'Actual', type: 'line', smooth: true, symbol: 'none', connectNulls: false,
        lineStyle: { width: 2, color: '#22d3ee' }, itemStyle: { color: '#22d3ee' },
        areaStyle: { color: areaGradient('#22d3ee') },
        data: actualData,
      },
      {
        name: 'Forecast', type: 'line', smooth: true, symbol: 'none', connectNulls: false,
        lineStyle: { width: 2, type: 'dashed', color: '#a78bfa' }, itemStyle: { color: '#a78bfa' },
        data: forecast,
      },
      {
        name: 'Target', type: 'line', symbol: 'none', silent: true,
        lineStyle: { width: 1, type: 'dashed', color: '#fbbf24', opacity: 0.8 }, itemStyle: { color: '#fbbf24' },
        data: allDays.map(() => targetMinutes),
      },
    ],
  }), [theme, allDays, actualData, forecast, targetMinutes, showZoom]);

  const csvRows = useMemo(
    () => allDays.map((day, i) => ({
      day,
      minutes: i < rows.length ? rows[i].minutes : '',
      forecast: forecast[i] ?? '',
    })),
    [allDays, rows, forecast],
  );

  return (
    <ChartCard
      className="xl:col-span-2"
      title="Forecast Tracking"
      subtitle={`linear trend extended +14 days · ${slopePerDay >= 0 ? '+' : ''}${slopePerDay} min/day`}
      option={option} height={300}
      csv={{ name: 'forecast-tracking', rows: csvRows }}
    />
  );
}

// ─── 18 · Energy Trend ───────────────────────────────────────────────────────
export function EnergyTrendChart({ range }: ChartProps) {
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const theme = useChartTheme();
  const { days } = range;
  const rows = useMemo(
    () => days.map((d) => ({ day: d, energy: dailyLogs[d]?.energy ?? null })),
    [dailyLogs, days],
  );

  const option = useMemo<EChartsOption>(() => ({
    tooltip: {
      ...baseTooltip(theme), trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: theme.split } },
      valueFormatter: (v) => (v == null ? '—' : `${asNum(v)}/5`),
    },
    grid: { left: 36, right: 14, top: 24, bottom: days.length > 31 ? 48 : 24 },
    xAxis: {
      type: 'category', data: rows.map((r) => r.day), boundaryGap: false,
      axisLine: { lineStyle: { color: theme.split } }, axisTick: { show: false },
      axisLabel: { color: theme.subtext, fontSize: 11, hideOverlap: true, formatter: (v) => fmtDayNum(String(v)) },
    },
    yAxis: {
      type: 'value', min: 0, max: 5, interval: 1,
      splitLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11 },
    },
    dataZoom: days.length > 31 ? dataZoomStyled(theme) : undefined,
    series: [{
      name: 'Energy', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5, showSymbol: false,
      connectNulls: true,
      lineStyle: { width: 2, color: '#fbbf24' }, itemStyle: { color: '#fbbf24' },
      areaStyle: { color: areaGradient('#fbbf24') },
      data: rows.map((r) => r.energy),
    }],
  }), [theme, days.length, rows]);

  return (
    <ChartCard
      title="Energy Trend" subtitle="self-rated daily energy (1–5)"
      option={option}
      csv={{ name: 'energy-trend', rows: rows.map((r) => ({ day: r.day, energy: r.energy ?? '' })) }}
    />
  );
}
