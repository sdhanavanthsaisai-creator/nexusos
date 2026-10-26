'use client';

// ─── Analytics Suite — subject-based charts (3, 11, 14, 15, 19, 20, 21, 22) ──

import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { useNexus } from '@/lib/nexus/store';
import {
  addDays, avg, dayTotalMinutes, eachDayKeys, minutesToHM, minutesToLabel, round1, sum,
} from '@/lib/nexus/utils';
import { CATEGORY_META } from '@/lib/nexus/constants';
import { ChartCard, baseTooltip, useChartTheme } from '../../ui-bits';
import {
  CATEGORY_ORDER, asNum, categoryMinutesPerDay, categoryTotals, lastNWeeks, sessionsInDays,
  topSubjectsByMinutes, weekDaysOf, weeklySubjectMap, type ChartProps,
} from './helpers';

// ─── 3 · Subject Distribution ────────────────────────────────────────────────
export function SubjectDistributionChart() {
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const subjects = useNexus((s) => s.subjects);
  const theme = useChartTheme();
  const weeks = useMemo(() => lastNWeeks(12), []);
  const allDays = useMemo(() => weeks.flatMap((w) => weekDaysOf(w)), [weeks]);
  const top = useMemo(() => topSubjectsByMinutes(subjects, dailyLogs, allDays, 8), [subjects, dailyLogs, allDays]);
  const weekly = useMemo(() => weeklySubjectMap(weeks, dailyLogs), [weeks, dailyLogs]);

  const option = useMemo<EChartsOption>(() => ({
    tooltip: {
      ...baseTooltip(theme), trigger: 'axis', axisPointer: { type: 'shadow' },
      valueFormatter: (v) => minutesToHM(asNum(v)),
    },
    color: top.map((t) => t.subject.color),
    legend: { orient: 'vertical', right: 0, top: 14, itemWidth: 10, itemHeight: 10, textStyle: { color: theme.text, fontSize: 11 } },
    grid: { left: 44, right: 118, top: 20, bottom: 24 },
    xAxis: {
      type: 'category', data: weekly.map((w) => w.week.label),
      axisTick: { show: false }, axisLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11 },
    },
    yAxis: {
      type: 'value', splitLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11, formatter: (v) => minutesToLabel(asNum(v)) },
    },
    series: top.map((t) => ({
      name: t.subject.name, type: 'bar', stack: 'total', barMaxWidth: 26,
      itemStyle: { color: t.subject.color }, emphasis: { focus: 'series' },
      data: weekly.map((w) => w.bySubject.get(t.subject.id) ?? 0),
    })),
  }), [theme, top, weekly]);

  const csvRows = useMemo(
    () => weekly.flatMap((w) => top.map((t) => ({ week: w.week.label, subject: t.subject.name, minutes: w.bySubject.get(t.subject.id) ?? 0 }))),
    [weekly, top],
  );

  return (
    <ChartCard title="Subject Distribution" subtitle="top 8 subjects · stacked weekly minutes" option={option} csv={{ name: 'subject-distribution', rows: csvRows }} />
  );
}

// ─── 11 · Coding Skill Hours / Week ──────────────────────────────────────────
export function CodingHoursChart() {
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const subjects = useNexus((s) => s.subjects);
  const theme = useChartTheme();
  const weeks = useMemo(() => lastNWeeks(8), []);
  const weekly = useMemo(() => weeklySubjectMap(weeks, dailyLogs), [weeks, dailyLogs]);
  const coding = useMemo(() => {
    const totals = new Map<string, number>();
    for (const { bySubject } of weekly) {
      for (const [id, m] of bySubject) totals.set(id, (totals.get(id) ?? 0) + m);
    }
    return subjects.filter((s) => s.category === 'coding' && (totals.get(s.id) ?? 0) > 0);
  }, [subjects, weekly]);

  const option = useMemo<EChartsOption>(() => ({
    tooltip: {
      ...baseTooltip(theme), trigger: 'axis', axisPointer: { type: 'shadow' },
      valueFormatter: (v) => `${asNum(v).toFixed(1)}h`,
    },
    color: coding.map((s) => s.color),
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: theme.text, fontSize: 11 } },
    grid: { left: 40, right: 14, top: 30, bottom: 24 },
    xAxis: {
      type: 'category', data: weekly.map((w) => w.week.label),
      axisTick: { show: false }, axisLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11 },
    },
    yAxis: {
      type: 'value', splitLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11, formatter: (v) => `${asNum(v)}h` },
    },
    series: coding.map((s) => ({
      name: s.name, type: 'bar', stack: 'coding', barMaxWidth: 30,
      itemStyle: { color: s.color }, emphasis: { focus: 'series' },
      data: weekly.map((w) => round1((w.bySubject.get(s.id) ?? 0) / 60)),
    })),
  }), [theme, coding, weekly]);

  const csvRows = useMemo(
    () => weekly.flatMap((w) => coding.map((s) => ({ week: w.week.label, subject: s.name, hours: round1((w.bySubject.get(s.id) ?? 0) / 60) }))),
    [weekly, coding],
  );

  return (
    <ChartCard title="Coding Skill Hours / Week" subtitle="coding-category subjects · last 8 weeks" option={option} csv={{ name: 'coding-hours-weekly', rows: csvRows }} />
  );
}

// ─── 14 · Subject Balance Radar ──────────────────────────────────────────────
export function SubjectBalanceRadarChart() {
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const subjects = useNexus((s) => s.subjects);
  const theme = useChartTheme();
  const days28 = useMemo(() => eachDayKeys(addDays(new Date(), -27), new Date()), []);
  const top = useMemo(() => topSubjectsByMinutes(subjects, dailyLogs, days28, 8), [subjects, dailyLogs, days28]);
  const values = useMemo(() => top.map((t) => round1(t.minutes / 4)), [top]);
  const cap = useMemo(() => Math.ceil((Math.max(...values, 60) * 1.15) / 30) * 30, [values]);

  const option = useMemo<EChartsOption>(() => {
    const indicators = top.length > 0
      ? top.map((t) => ({ name: t.subject.name, max: cap }))
      : [{ name: 'No data yet', max: 60 }];
    const seriesValues = top.length > 0 ? values : [0];
    return {
      tooltip: { ...baseTooltip(theme) },
      radar: [{
        indicator: indicators, radius: '64%', center: ['50%', '52%'],
        splitArea: { show: false },
        axisName: { color: theme.subtext, fontSize: 10 },
        axisLine: { lineStyle: { color: theme.split } },
        splitLine: { lineStyle: { color: theme.split } },
      }],
      series: [{
        type: 'radar', symbol: 'circle', symbolSize: 4,
        data: [{
          name: 'Avg weekly minutes', value: seriesValues,
          lineStyle: { color: '#22d3ee', width: 2 },
          itemStyle: { color: '#22d3ee' },
          areaStyle: { color: 'rgba(34,211,238,0.25)' },
        }],
      }],
    };
  }, [theme, top, values, cap]);

  return (
    <ChartCard
      title="Subject Balance Radar" subtitle="top subjects · avg weekly minutes, last 28 days"
      option={option} height={300}
      csv={{ name: 'subject-balance-radar', rows: top.map((t, i) => ({ subject: t.subject.name, avg_weekly_minutes: values[i] })) }}
    />
  );
}

// ─── 15 · Time Allocation (donut) ────────────────────────────────────────────
export function TimeAllocationChart({ range }: ChartProps) {
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const subjects = useNexus((s) => s.subjects);
  const theme = useChartTheme();
  const { days } = range;
  const totals = useMemo(
    () => categoryTotals(categoryMinutesPerDay(subjects, dailyLogs, days)),
    [subjects, dailyLogs, days],
  );
  const total = useMemo(() => sum(CATEGORY_ORDER.map((c) => totals[c])), [totals]);
  const data = useMemo(
    () => CATEGORY_ORDER
      .filter((c) => totals[c] > 0)
      .map((c) => ({ name: CATEGORY_META[c].label, value: totals[c], itemStyle: { color: CATEGORY_META[c].color } })),
    [totals],
  );

  const option = useMemo<EChartsOption>(() => ({
    tooltip: {
      ...baseTooltip(theme), trigger: 'item',
      formatter: (p) => {
        const q = Array.isArray(p) ? p[0] : p;
        return `${q.name}<br/>${minutesToHM(asNum(q.value))} · ${asNum(q.percent)}%`;
      },
    },
    title: {
      text: `${round1(total / 60)}h`, subtext: 'total focus',
      left: 'center', top: '44%',
      textStyle: { color: theme.text, fontSize: 20, fontWeight: 600 },
      subtextStyle: { color: theme.subtext, fontSize: 10 },
    },
    series: [{
      type: 'pie', radius: ['45%', '70%'], center: ['50%', '50%'], avoidLabelOverlap: true,
      itemStyle: { borderColor: theme.bg, borderWidth: 2, borderRadius: 6 },
      label: { color: theme.subtext, fontSize: 11, formatter: (p) => `${String(p.name)}\n${(asNum(p.value) / 60).toFixed(1)}h` },
      labelLine: { lineStyle: { color: theme.split } },
      data,
    }],
  }), [theme, total, data]);

  return (
    <ChartCard
      title="Time Allocation" subtitle="by category over the selected range"
      option={option} height={300}
      csv={{ name: 'time-allocation', rows: CATEGORY_ORDER.map((c) => ({ category: CATEGORY_META[c].label, minutes: totals[c], hours: round1(totals[c] / 60) })) }}
    />
  );
}

// ─── 19 · Concentration vs Duration ──────────────────────────────────────────
export function ConcentrationVsDurationChart({ range }: ChartProps) {
  const sessions = useNexus((s) => s.sessions);
  const subjects = useNexus((s) => s.subjects);
  const theme = useChartTheme();
  const { days } = range;
  const inRange = useMemo(() => sessionsInDays(sessions, days), [sessions, days]);
  const nameOf = useMemo(() => new Map(subjects.map((s) => [s.id, s.name] as const)), [subjects]);
  const cats = useMemo(() => CATEGORY_ORDER.filter((c) => inRange.some((s) => s.category === c)), [inRange]);

  const option = useMemo<EChartsOption>(() => ({
    tooltip: {
      ...baseTooltip(theme), trigger: 'item',
      formatter: (p) => {
        const q = Array.isArray(p) ? p[0] : p;
        const v = q.value as number[];
        return `${q.name}<br/>${asNum(v[0])} min · concentration ${asNum(v[1])}/5`;
      },
    },
    color: cats.map((c) => CATEGORY_META[c].color),
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: theme.text, fontSize: 11 } },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: {
      type: 'value', name: 'duration (min)',
      nameTextStyle: { color: theme.subtext, fontSize: 10 },
      min: 0, splitLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11 },
    },
    yAxis: {
      type: 'value', name: 'concentration',
      nameTextStyle: { color: theme.subtext, fontSize: 10 },
      min: 0.5, max: 5.5, interval: 1,
      splitLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11 },
    },
    series: cats.map((c) => ({
      name: CATEGORY_META[c].label, type: 'scatter', symbolSize: 11,
      itemStyle: { color: CATEGORY_META[c].color, opacity: 0.72 },
      data: inRange
        .filter((s) => s.category === c)
        .map((s) => ({ name: nameOf.get(s.subjectId) ?? s.subjectId, value: [s.durationMin, s.concentration] })),
    })),
  }), [theme, cats, inRange, nameOf]);

  const csvRows = useMemo(
    () => inRange.map((s) => ({ subject: nameOf.get(s.subjectId) ?? s.subjectId, category: s.category, duration_min: s.durationMin, concentration: s.concentration })),
    [inRange, nameOf],
  );

  return (
    <ChartCard title="Concentration vs Duration" subtitle="each point = one session, colored by category" option={option} csv={{ name: 'concentration-vs-duration', rows: csvRows }} />
  );
}

// ─── 20 · College vs Weekend Days ────────────────────────────────────────────
export function CollegeVsWeekendChart({ range }: ChartProps) {
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const theme = useChartTheme();
  const { days } = range;
  const stats = useMemo(() => {
    const college: number[] = [];
    const weekend: number[] = [];
    for (const d of days) {
      const log = dailyLogs[d];
      if (!log) continue;
      const minutes = dayTotalMinutes(log);
      if (log.dayType === 'weekend') weekend.push(minutes);
      else college.push(minutes);
    }
    return {
      collegeAvg: Math.round(avg(college)),
      weekendAvg: Math.round(avg(weekend)),
      collegeDays: college.length,
      weekendDays: weekend.length,
    };
  }, [dailyLogs, days]);

  const option = useMemo<EChartsOption>(() => ({
    tooltip: { ...baseTooltip(theme), trigger: 'item', valueFormatter: (v) => minutesToHM(asNum(v)) },
    grid: { left: 44, right: 14, top: 24, bottom: 24 },
    xAxis: {
      type: 'category', data: ['College days', 'Weekend days'],
      axisTick: { show: false }, axisLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11 },
    },
    yAxis: {
      type: 'value', splitLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11, formatter: (v) => minutesToLabel(asNum(v)) },
    },
    series: [{
      name: 'Avg minutes', type: 'bar', barWidth: 48,
      data: [
        { value: stats.collegeAvg, itemStyle: { color: '#a78bfa', borderRadius: [6, 6, 0, 0] } },
        { value: stats.weekendAvg, itemStyle: { color: '#fbbf24', borderRadius: [6, 6, 0, 0] } },
      ],
    }],
  }), [theme, stats]);

  return (
    <ChartCard
      title="College vs Weekend Days"
      subtitle={`${stats.collegeDays} college · ${stats.weekendDays} weekend logged days`}
      option={option}
      csv={{
        name: 'college-vs-weekend',
        rows: [
          { dayType: 'college', days: stats.collegeDays, avg_minutes: stats.collegeAvg },
          { dayType: 'weekend', days: stats.weekendDays, avg_minutes: stats.weekendAvg },
        ],
      }}
    />
  );
}

// ─── 21 · Top Tags ───────────────────────────────────────────────────────────
export function TopTagsChart({ range }: ChartProps) {
  const sessions = useNexus((s) => s.sessions);
  const theme = useChartTheme();
  const { days } = range;
  const rows = useMemo(() => {
    const map = new Map<string, { minutes: number; count: number }>();
    for (const s of sessionsInDays(sessions, days)) {
      for (const tag of s.tags) {
        const entry = map.get(tag) ?? { minutes: 0, count: 0 };
        entry.minutes += s.durationMin;
        entry.count += 1;
        map.set(tag, entry);
      }
    }
    return [...map.entries()]
      .map(([tag, v]) => ({ tag, minutes: v.minutes, count: v.count }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 10);
  }, [sessions, days]);

  const option = useMemo<EChartsOption>(() => ({
    tooltip: {
      ...baseTooltip(theme), trigger: 'item',
      formatter: (p) => {
        const q = Array.isArray(p) ? p[0] : p;
        const row = rows.find((r) => r.tag === q.name);
        return `${String(q.name)}<br/>${minutesToHM(asNum(q.value))} · ${row?.count ?? 0} sessions`;
      },
    },
    grid: { left: 8, right: 40, top: 16, bottom: 24, containLabel: true },
    xAxis: {
      type: 'value', splitLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11, formatter: (v) => minutesToLabel(asNum(v)) },
    },
    yAxis: {
      type: 'category', inverse: true, data: rows.map((r) => r.tag),
      axisTick: { show: false }, axisLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.text, fontSize: 11 },
    },
    series: [{
      name: 'Minutes', type: 'bar', barMaxWidth: 16,
      itemStyle: { color: '#a78bfa', borderRadius: [0, 6, 6, 0] },
      data: rows.map((r) => r.minutes),
    }],
  }), [theme, rows]);

  return (
    <ChartCard title="Top Tags" subtitle="top 10 session tags by focused minutes" option={option} csv={{ name: 'top-tags', rows: rows.map((r) => ({ tag: r.tag, minutes: r.minutes, sessions: r.count })) }} />
  );
}

// ─── 22 · Biological Prime Time (polar) ──────────────────────────────────────
export function BiologicalPrimeTimeChart({ range }: ChartProps) {
  const sessions = useNexus((s) => s.sessions);
  const theme = useChartTheme();
  const { days } = range;
  const rows = useMemo(() => {
    const minutes = new Array<number>(24).fill(0);
    const counts = new Array<number>(24).fill(0);
    for (const s of sessionsInDays(sessions, days)) {
      const h = Math.min(23, Math.max(0, Number.parseInt(s.startTime.split(':')[0] ?? '0', 10) || 0));
      minutes[h] += s.durationMin;
      counts[h] += 1;
    }
    return minutes.map((m, hour) => ({ hour, minutes: m, sessions: counts[hour] }));
  }, [sessions, days]);
  const peakHour = useMemo(() => {
    const max = Math.max(...rows.map((r) => r.minutes));
    return max > 0 ? (rows.find((r) => r.minutes === max)?.hour ?? -1) : -1;
  }, [rows]);

  const option = useMemo<EChartsOption>(() => ({
    tooltip: {
      ...baseTooltip(theme), trigger: 'item',
      formatter: (p) => {
        const q = Array.isArray(p) ? p[0] : p;
        const h = Number.parseInt(String(q.name), 10);
        const row = rows[h];
        return `${String(q.name)} · ${minutesToHM(asNum(q.value))} · ${row?.sessions ?? 0} sessions`;
      },
    },
    polar: { radius: ['16%', '80%'], center: ['50%', '52%'] },
    angleAxis: {
      type: 'category', data: rows.map((r) => `${r.hour}h`), startAngle: 90,
      axisLine: { lineStyle: { color: theme.split } }, axisTick: { show: false },
      axisLabel: { color: theme.subtext, fontSize: 10 },
      splitLine: { show: true, lineStyle: { color: theme.split } },
    },
    radiusAxis: { show: false },
    series: [{
      name: 'Minutes', type: 'bar', coordinateSystem: 'polar',
      data: rows.map((r) => ({
        value: r.minutes,
        itemStyle: { color: r.hour === peakHour ? '#a78bfa' : 'rgba(34,211,238,0.55)', borderRadius: 3 },
      })),
    }],
  }), [theme, rows, peakHour]);

  return (
    <ChartCard
      className="xl:col-span-2"
      title="Biological Prime Time"
      subtitle={peakHour >= 0 ? `peak focus window: ${peakHour}:00–${peakHour + 1}:00 · total minutes by session start hour` : 'total minutes by session start hour'}
      option={option} height={320}
      csv={{ name: 'biological-prime-time', rows: rows.map((r) => ({ hour: r.hour, minutes: r.minutes, sessions: r.sessions })) }}
    />
  );
}
