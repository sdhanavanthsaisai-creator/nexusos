'use client';

// ─── Analytics Suite — advanced cross-metric charts (9, 10) ──────────────────

import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { useNexus } from '@/lib/nexus/store';
import { dayTotalMinutes, minutesToHM, minutesToLabel } from '@/lib/nexus/utils';
import { ChartCard, baseTooltip, useChartTheme } from '../../ui-bits';
import { asNum, sessionsInDays, type ChartProps } from './helpers';

// ─── 9 · Sleep vs Study ──────────────────────────────────────────────────────
export function SleepVsStudyChart({ range }: ChartProps) {
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const theme = useChartTheme();
  const { days } = range;
  const rows = useMemo(() => {
    const out: { date: string; sleepHours: number; minutes: number; energy: number }[] = [];
    for (const d of days) {
      const log = dailyLogs[d];
      if (!log) continue;
      out.push({ date: d, sleepHours: log.sleepHours, minutes: dayTotalMinutes(log), energy: log.energy });
    }
    return out;
  }, [dailyLogs, days]);

  const option = useMemo<EChartsOption>(() => ({
    tooltip: {
      ...baseTooltip(theme), trigger: 'item',
      formatter: (p) => {
        const q = Array.isArray(p) ? p[0] : p;
        const v = q.value as number[];
        return `${String(q.name)}<br/>sleep ${asNum(v[0])}h · ${minutesToHM(asNum(v[1]))} · energy ${asNum(v[2])}/5`;
      },
    },
    grid: { left: 44, right: 20, top: 30, bottom: 30 },
    xAxis: {
      type: 'value', name: 'sleep (h)',
      nameTextStyle: { color: theme.subtext, fontSize: 10 },
      min: 3, max: 12,
      splitLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11 },
    },
    yAxis: {
      type: 'value', name: 'study minutes',
      nameTextStyle: { color: theme.subtext, fontSize: 10 },
      splitLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11, formatter: (v) => minutesToLabel(asNum(v)) },
    },
    series: [{
      name: 'Days', type: 'scatter', symbolSize: 10,
      itemStyle: { color: '#22d3ee', opacity: 0.7 },
      data: rows.map((r) => ({
        name: r.date,
        value: [r.sleepHours, r.minutes, r.energy],
        symbolSize: 6 + r.energy * 2,
      })),
    }],
  }), [theme, rows]);

  return (
    <ChartCard
      title="Sleep vs Study" subtitle="one point per logged day · size = energy"
      option={option}
      csv={{ name: 'sleep-vs-study', rows: rows.map((r) => ({ date: r.date, sleep_hours: r.sleepHours, minutes: r.minutes, energy: r.energy })) }}
    />
  );
}

// ─── 10 · Session Duration Distribution ──────────────────────────────────────
const DURATION_BINS = [
  { label: '0–15', min: 0, max: 15 },
  { label: '15–30', min: 15, max: 30 },
  { label: '30–45', min: 30, max: 45 },
  { label: '45–60', min: 45, max: 60 },
  { label: '60–90', min: 60, max: 90 },
  { label: '90–120', min: 90, max: 120 },
  { label: '120+', min: 120, max: Number.POSITIVE_INFINITY },
] as const;

export function SessionDurationChart({ range }: ChartProps) {
  const sessions = useNexus((s) => s.sessions);
  const theme = useChartTheme();
  const { days } = range;
  const inRange = useMemo(() => sessionsInDays(sessions, days), [sessions, days]);
  const rows = useMemo(
    () => DURATION_BINS.map((b) => ({
      bin: b.label,
      count: inRange.filter((s) => s.durationMin >= b.min && s.durationMin < b.max).length,
    })),
    [inRange],
  );

  const option = useMemo<EChartsOption>(() => ({
    tooltip: { ...baseTooltip(theme), trigger: 'item', valueFormatter: (v) => `${asNum(v)} sessions` },
    grid: { left: 36, right: 14, top: 24, bottom: 24 },
    xAxis: {
      type: 'category', data: rows.map((r) => r.bin),
      axisTick: { show: false }, axisLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11 },
    },
    yAxis: {
      type: 'value', minInterval: 1,
      splitLine: { lineStyle: { color: theme.split } },
      axisLabel: { color: theme.subtext, fontSize: 11 },
    },
    series: [{
      name: 'Sessions', type: 'bar', barMaxWidth: 28,
      itemStyle: { color: '#22d3ee', borderRadius: [6, 6, 0, 0] },
      data: rows.map((r) => r.count),
    }],
  }), [theme, rows]);

  return (
    <ChartCard
      title="Session Duration Distribution" subtitle={`${inRange.length} sessions in range (minutes)`}
      option={option}
      csv={{ name: 'session-duration-distribution', rows: rows.map((r) => ({ bin: r.bin, sessions: r.count })) }}
    />
  );
}
