'use client';

// ─── Study Hall · Analytics Suite module (22 interactive charts) ────────────────

import { useMemo, useState } from 'react';
import { Activity, BarChart3, BatteryCharging, Clock, Flame, Timer } from 'lucide-react';
import { useNexus } from '@/lib/nexus/store';
import {
  addDays, avg, dateKey, fmtDayFull, minutesToHM, minutesToLabel, rangeStartEnd, sum,
  todayKey, type RangeKey,
} from '@/lib/nexus/utils';
import { moduleMeta } from '@/lib/nexus/constants';
import { KpiCard, ModuleHeader, RangeFilter } from '../ui-bits';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { dailyMinutes, sessionsInDays, type RangeWindow } from './analytics/helpers';
import {
  CollegeVsCodingChart, CumulativeHoursChart, DailyMinutesChart, EnergyTrendChart,
  ForecastTrackingChart, StudyHeatmapChart, WeeklyFocusByCategoryChart, WeeklyTotalsChart,
} from './analytics/charts-time';
import {
  BiologicalPrimeTimeChart, CodingHoursChart, CollegeVsWeekendChart, ConcentrationVsDurationChart,
  SubjectBalanceRadarChart, SubjectDistributionChart, TimeAllocationChart, TopTagsChart,
} from './analytics/charts-subjects';
import {
  HabitConsistencyHeatmapChart, SemesterGoalProgress, TaskBurndownChart, TaskCompletionTrendChart,
} from './analytics/charts-habits-tasks';
import { SessionDurationChart, SleepVsStudyChart } from './analytics/charts-advanced';

export default function AnalyticsModule() {
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const sessions = useNexus((s) => s.sessions);

  const [range, setRange] = useState<RangeKey>('semester');
  const [customStart, setCustomStart] = useState<string>(() => dateKey(addDays(new Date(), -14)));
  const [customEnd, setCustomEnd] = useState<string>(() => todayKey());

  // Selected window — guaranteed to contain at least one day.
  const win = useMemo<RangeWindow>(() => {
    const r = rangeStartEnd(range, customStart, customEnd);
    return r.days.length > 0 ? r : rangeStartEnd('today');
  }, [range, customStart, customEnd]);

  const kpi = useMemo(() => {
    const rows = dailyMinutes(dailyLogs, win.days);
    const totalMinutes = sum(rows.map((r) => r.minutes));
    const inRange = sessionsInDays(sessions, win.days);
    const avgSession = inRange.length ? Math.round(avg(inRange.map((s) => s.durationMin))) : 0;
    const energies = win.days
      .map((d) => dailyLogs[d]?.energy)
      .filter((e): e is number => typeof e === 'number');
    let best = { day: '', minutes: -1 };
    for (const r of rows) if (r.minutes > best.minutes) best = { day: r.day, minutes: r.minutes };
    const activeDays = rows.filter((r) => r.minutes > 0).length;
    return { totalMinutes, sessionCount: inRange.length, avgSession, avgEnergy: energies.length ? avg(energies) : 0, best, activeDays };
  }, [dailyLogs, sessions, win]);

  const onCustom = (start?: string, end?: string) => {
    if (start) setCustomStart(start);
    if (end) setCustomEnd(end);
  };

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={BarChart3}
        title={moduleMeta('analytics').label}
        subtitle={moduleMeta('analytics').blurb}
      />

      <RangeFilter
        value={range} onChange={setRange}
        customStart={customStart} customEnd={customEnd} onCustom={onCustom}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          icon={Clock} label="Total Focus" tone="cyan"
          value={minutesToHM(kpi.totalMinutes)}
          sub={`${kpi.activeDays} active of ${win.days.length} days`}
        />
        <KpiCard
          icon={Timer} label="Sessions" tone="violet"
          value={kpi.sessionCount} sub="in selected range"
        />
        <KpiCard
          icon={Activity} label="Avg / Session" tone="emerald"
          value={minutesToLabel(kpi.avgSession)} sub="per focus block"
        />
        <KpiCard
          icon={BatteryCharging} label="Avg Energy" tone="amber"
          value={`${kpi.avgEnergy.toFixed(1)} / 5`} sub="logged daily energy"
        />
        <KpiCard
          icon={Flame} label="Best Day" tone="rose"
          value={minutesToHM(Math.max(0, kpi.best.minutes))}
          sub={kpi.best.day ? fmtDayFull(kpi.best.day) : '—'}
        />
      </div>

      <Tabs defaultValue="time">
        <TabsList className="grid w-full grid-cols-2 sm:inline-grid sm:w-auto sm:grid-cols-4">
          <TabsTrigger value="time" className="text-xs">Time</TabsTrigger>
          <TabsTrigger value="subjects" className="text-xs">Subjects</TabsTrigger>
          <TabsTrigger value="consistency" className="text-xs">Consistency</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs">Tasks &amp; habits</TabsTrigger>
        </TabsList>

        <TabsContent value="time" className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <DailyMinutesChart range={win} />
          <WeeklyTotalsChart />
          <StudyHeatmapChart />
          <CumulativeHoursChart range={win} />
          <ForecastTrackingChart range={win} />
          <EnergyTrendChart range={win} />
          <SemesterGoalProgress />
        </TabsContent>

        <TabsContent value="subjects" className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SubjectDistributionChart />
          <WeeklyFocusByCategoryChart />
          <CollegeVsCodingChart range={win} />
          <TimeAllocationChart range={win} />
          <SubjectBalanceRadarChart />
          <CodingHoursChart />
          <TopTagsChart range={win} />
        </TabsContent>

        <TabsContent value="consistency" className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <CollegeVsWeekendChart range={win} />
          <SleepVsStudyChart range={win} />
          <SessionDurationChart range={win} />
          <BiologicalPrimeTimeChart range={win} />
          <ConcentrationVsDurationChart range={win} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <TaskCompletionTrendChart />
          <TaskBurndownChart />
          <HabitConsistencyHeatmapChart />
        </TabsContent>
      </Tabs>
    </div>
  );
}
