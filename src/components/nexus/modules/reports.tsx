'use client';

import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  CalendarCheck, CalendarRange, Copy, DatabaseBackup, FileBarChart2, FileDown, Flame,
  HardDriveDownload, ListChecks, Medal, Sparkles, Timer, TriangleAlert, Upload,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import type { EChartsOption } from 'echarts';
import type { DailyLog, SubjectCategory } from '@/lib/nexus/types';
import { useNexus } from '@/lib/nexus/store';
import { CATEGORY_META } from '@/lib/nexus/constants';
import {
  avg, computeStreak, dateKey, dayTotalMinutes, downloadCSV, downloadFile, downloadJSON,
  eachDayKeys, fmtDayFull, isOverdue, minutesToHM, pct, round1, startOfWeek, sum, todayKey,
} from '@/lib/nexus/utils';
import { baseTooltip, ChartCard, EmptyState, ModuleHeader, Segmented, useChartTheme } from '../ui-bits';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

type Period = 'weekly' | 'monthly';

const deltaLabel = (deltaMin: number): string =>
  `${deltaMin >= 0 ? '+' : '-'}${minutesToHM(Math.abs(deltaMin))}`;

// ─── Small building blocks ────────────────────────────────────────────────────
function ReportRow({ label, value, right }: { label: string; value: ReactNode; right: ReactNode }) {
  return (
    <TableRow className="border-border/50">
      <TableCell className="py-2 pl-0 text-xs text-muted-foreground">{label}</TableCell>
      <TableCell className="py-2 text-right font-mono text-sm font-semibold tabular-nums">{value}</TableCell>
      <TableCell className="py-2 pr-0 text-right font-mono text-[11px]">{right}</TableCell>
    </TableRow>
  );
}

function ExportButton({ icon: Icon, label, hint, onClick }: { icon: LucideIcon; label: string; hint: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium">{label}</span>
        <span className="block truncate text-[10px] text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

// ─── Module ───────────────────────────────────────────────────────────────────
export default function ReportsModule() {
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const sessions = useNexus((s) => s.sessions);
  const tasks = useNexus((s) => s.tasks);
  const habits = useNexus((s) => s.habits);
  const habitRecords = useNexus((s) => s.habitRecords);
  const profile = useNexus((s) => s.profile);
  const subjects = useNexus((s) => s.subjects);
  const importData = useNexus((s) => s.importData);
  const theme = useChartTheme();

  const [period, setPeriod] = useState<Period>('weekly');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const periodLabel = period === 'weekly' ? 'This Week' : 'This Month';

  // ── Report computation ──
  const report = useMemo(() => {
    const now = new Date();
    const start = period === 'weekly' ? startOfWeek(new Date()) : new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const days = eachDayKeys(start, now);
    const daySet = new Set(days);
    const weeks = Math.max(1, days.length / 7);
    const logsIn = days.map((k) => dailyLogs[k]).filter((l): l is DailyLog => Boolean(l));

    const totalMinutes = sum(days.map((k) => dayTotalMinutes(dailyLogs[k])));
    const targetMinutes = profile.dailyTargetHours * 60 * days.length;
    const codingIds = new Set(subjects.filter((s) => s.category === 'coding').map((s) => s.id));
    const codingMinutes = sum(
      days.flatMap((k) =>
        Object.entries(dailyLogs[k]?.minutes ?? {})
          .filter(([sid]) => codingIds.has(sid))
          .map(([, m]) => m),
      ),
    );
    const codingTargetMinutes = profile.weeklyCodingTargetHours * 60 * weeks;

    const sessionsIn = sessions.filter((x) => daySet.has(x.date));
    const tasksCompleted = tasks.filter((t) => t.completedAt && daySet.has(dateKey(new Date(t.completedAt)))).length;
    const overdueCount = tasks.filter(isOverdue).length;

    const activeHabits = habits.filter((h) => !h.archived);
    const slots = activeHabits.length * days.length;
    const habitRows = activeHabits.map((h) => {
      const done = days.filter((d) => habitRecords[h.id]?.[d]).length;
      const target = Math.max(1, Math.round((h.targetPerWeek * days.length) / 7));
      return { id: h.id, name: h.name, color: h.color, done, target, pctDone: pct(done, target) };
    });
    const doneTotal = habitRows.reduce((a, r) => a + r.done, 0);
    const consistency = pct(doneTotal, Math.max(1, slots));

    const streak = computeStreak(dailyLogs);
    const avgSleep = round1(avg(logsIn.map((l) => l.sleepHours).filter((v) => v > 0)));
    const avgEnergy = round1(avg(logsIn.map((l) => l.energy).filter((v) => v > 0)));

    const bySubject = new Map<string, number>();
    for (const k of days) {
      for (const [sid, m] of Object.entries(dailyLogs[k]?.minutes ?? {})) {
        bySubject.set(sid, (bySubject.get(sid) ?? 0) + m);
      }
    }
    const topSubjects = [...bySubject.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, minutes]) => {
        const su = subjects.find((s) => s.id === id);
        return { id, name: su?.name ?? id, color: su?.color ?? 'var(--ink-1)', minutes };
      });

    const byCategory = new Map<SubjectCategory, number>();
    for (const [id, m] of bySubject.entries()) {
      const su = subjects.find((s) => s.id === id);
      if (!su) continue;
      byCategory.set(su.category, (byCategory.get(su.category) ?? 0) + m);
    }
    const categoryRows = (Object.entries(CATEGORY_META) as [SubjectCategory, { label: string; color: string }][])
      .map(([cat, meta]) => ({ category: cat, label: meta.label, color: meta.color, minutes: byCategory.get(cat) ?? 0 }))
      .filter((r) => r.minutes > 0);

    const bestDay = days
      .map((k) => ({ key: k, minutes: dayTotalMinutes(dailyLogs[k]) }))
      .sort((a, b) => b.minutes - a.minutes)[0];

    const topHabit = [...habitRows].sort((a, b) => b.done - a.done)[0];
    const hasData = totalMinutes > 0 || sessionsIn.length > 0 || tasksCompleted > 0 || doneTotal > 0;

    return {
      start, days, totalMinutes, targetMinutes, codingMinutes, codingTargetMinutes,
      sessionsIn, tasksCompleted, overdueCount, habitRows, consistency, streak,
      avgSleep, avgEnergy, topSubjects, categoryRows, bestDay, topHabit, hasData,
    };
  }, [period, dailyLogs, sessions, tasks, habits, habitRecords, profile, subjects]);

  // ── Markdown rendering of the report ──
  const markdown = (() => {
    const L: string[] = [
      `# NexusOS Productivity Report — ${periodLabel}`,
      `_Generated ${new Date().toLocaleString()}_`,
      `_Window: ${fmtDayFull(dateKey(report.start))} → ${fmtDayFull(todayKey())}_`,
      '',
      '## Key numbers',
      '',
      '| Metric | Value | vs target |',
      '| --- | --- | --- |',
      `| Study time | ${minutesToHM(report.totalMinutes)} | ${minutesToHM(report.targetMinutes)} target (${deltaLabel(report.totalMinutes - report.targetMinutes)}) |`,
      `| Coding time | ${minutesToHM(report.codingMinutes)} | ${minutesToHM(report.codingTargetMinutes)} target (${deltaLabel(report.codingMinutes - report.codingTargetMinutes)}) |`,
      `| Sessions | ${report.sessionsIn.length} | — |`,
      `| Tasks completed | ${report.tasksCompleted} | — |`,
      `| Habit consistency | ${report.consistency}% | — |`,
      `| Current streak | ${report.streak.current} days (best ${report.streak.best}) | — |`,
      `| Avg sleep / energy | ${report.avgSleep}h · ${report.avgEnergy}/5 | — |`,
      '',
    ];
    if (report.topSubjects.length) {
      L.push('## Top subjects', '');
      for (const t of report.topSubjects) L.push(`- **${t.name}** — ${minutesToHM(t.minutes)}`);
      L.push('');
    }
    if (report.habitRows.length) {
      L.push('## Habit consistency', '');
      for (const h of report.habitRows) L.push(`- ${h.name}: ${h.done}/${h.target}`);
      L.push('');
    }
    L.push('## Highlights', '');
    if (report.bestDay && report.bestDay.minutes > 0) {
      L.push(`- Best study day: **${fmtDayFull(report.bestDay.key)}** (${minutesToHM(report.bestDay.minutes)})`);
    }
    if (report.topHabit && report.topHabit.done > 0) {
      L.push(`- Most consistent habit: **${report.topHabit.name}** (${report.topHabit.done}/${report.topHabit.target})`);
    }
    if (report.overdueCount > 0) {
      L.push(`- ⚠️ **${report.overdueCount}** overdue task${report.overdueCount === 1 ? '' : 's'} — clear ${report.overdueCount === 1 ? 'it' : 'them'} today.`);
    }
    L.push(`- Current streak: **${report.streak.current}** day${report.streak.current === 1 ? '' : 's'} (best ${report.streak.best}).`);
    return L.join('\n');
  })();

  // ── Chart options ──
  const subjectOption: EChartsOption = useMemo(
    () => ({
      tooltip: { ...baseTooltip(theme), trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 8, right: 44, top: 6, bottom: 0, containLabel: true },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: theme.split } },
        axisLabel: { color: theme.subtext, fontSize: 10, formatter: '{value}m' },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: report.topSubjects.map((t) => t.name),
        axisLabel: { color: theme.text, fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: 16,
          itemStyle: { borderRadius: [0, 6, 6, 0] },
          label: { show: true, position: 'right', formatter: '{c}m', color: theme.subtext, fontSize: 10 },
          data: report.topSubjects.map((t, i) => ({ value: t.minutes, itemStyle: { color: theme.palette[i % theme.palette.length] } })),
        },
      ],
    }),
    [report.topSubjects, theme],
  );

  const donutOption: EChartsOption = useMemo(
    () => ({
      tooltip: { ...baseTooltip(theme), trigger: 'item' },
      legend: { bottom: 0, icon: 'circle', itemWidth: 9, itemHeight: 9, textStyle: { color: theme.subtext, fontSize: 11 } },
      series: [
        {
          type: 'pie',
          radius: ['52%', '78%'],
          center: ['50%', '44%'],
          itemStyle: { borderColor: theme.bg, borderWidth: 2, borderRadius: 6 },
          label: { show: false },
          data: report.categoryRows.map((c, i) => ({ name: c.label, value: c.minutes, itemStyle: { color: theme.palette[i % theme.palette.length] } })),
        },
      ],
    }),
    [report.categoryRows, theme],
  );

  // ── Actions ──
  const copyMd = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      toast.success('Copied');
    } catch {
      toast.error('Clipboard unavailable in this browser');
    }
  };

  const downloadMd = () => {
    downloadFile(`nexusos-report-${todayKey()}.md`, markdown, 'text/markdown');
    toast.success('Report .md downloaded');
  };

  const downloadBackup = () => {
    const snapshot = useNexus.getState();
    const { _hydrated: _h, setHydrated: _sh, ...rest } = snapshot;
    void _h;
    void _sh;
    downloadJSON(`nexusos-backup-${todayKey()}`, rest);
    toast.success('JSON backup downloaded');
  };

  const exportSessions = () => {
    const rows = sessions.map((x) => ({
      date: x.date,
      startTime: x.startTime,
      endTime: x.endTime,
      subject: subjects.find((s) => s.id === x.subjectId)?.name ?? x.subjectId,
      category: x.category,
      durationMin: x.durationMin,
      concentration: x.concentration,
      energy: x.energy,
      tags: x.tags.join('; '),
      notes: x.notes,
    }));
    if (!rows.length) {
      toast.error('No sessions to export yet');
      return;
    }
    downloadCSV('nexusos-sessions', rows);
    toast.success(`Exported ${rows.length} sessions`);
  };

  const exportTasks = () => {
    const rows = tasks.map((t) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      area: t.area,
      dueDate: t.dueDate ?? '',
      startDate: t.startDate ?? '',
      estimatedHours: t.estimatedHours ?? '',
      actualHours: t.actualHours ?? '',
      recurrence: t.recurrence,
      tags: t.tags.join('; '),
      createdAt: t.createdAt,
      completedAt: t.completedAt ?? '',
      description: t.description,
    }));
    if (!rows.length) {
      toast.error('No tasks to export yet');
      return;
    }
    downloadCSV('nexusos-tasks', rows);
    toast.success(`Exported ${rows.length} tasks`);
  };

  const exportDailyLogs = () => {
    const keys = Object.keys(dailyLogs).sort();
    if (!keys.length) {
      toast.error('No daily logs to export yet');
      return;
    }
    const rows = keys.map((k) => {
      const log = dailyLogs[k];
      const row: Record<string, unknown> = {
        date: k,
        dayType: log.dayType,
        sleepHours: log.sleepHours,
        energy: log.energy,
        notes: log.notes,
        totalMinutes: dayTotalMinutes(log),
      };
      for (const s of subjects) row[s.name] = log.minutes?.[s.id] ?? 0;
      return row;
    });
    downloadCSV('nexusos-daily-logs', rows);
    toast.success(`Exported ${rows.length} daily logs`);
  };

  const exportHabits = () => {
    const rows: Record<string, unknown>[] = [];
    for (const h of habits) {
      const rec = habitRecords[h.id] ?? {};
      for (const d of Object.keys(rec).sort()) {
        rows.push({ habit: h.name, date: d, done: rec[d] ? 'yes' : 'no' });
      }
    }
    if (!rows.length) {
      toast.error('No habit records to export yet');
      return;
    }
    downloadCSV('nexusos-habits', rows);
    toast.success(`Exported ${rows.length} habit check-ins`);
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result));
        const res = importData(parsed);
        if (res.ok) toast.success('Data imported ✓');
        else toast.error(res.error ?? 'Import failed');
      } catch {
        toast.error('Invalid JSON file');
      }
    };
    reader.onerror = () => toast.error('Could not read that file');
    reader.readAsText(file);
  };

  const r = report;

  return (
    <div className="space-y-6">
      <ModuleHeader
        icon={FileBarChart2}
        title="Reports & Export"
        subtitle="Period summaries, markdown reports & full data portability"
        actions={
          <>
            <Segmented
              options={[
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
              value={period}
              onChange={(v) => setPeriod(v)}
            />
            <Button variant="ghost" size="sm" onClick={copyMd}>
              <Copy className="h-3.5 w-3.5" /> Copy as Markdown
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadMd}>
              <FileDown className="h-3.5 w-3.5" /> Report .md
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadBackup}>
              <DatabaseBackup className="h-3.5 w-3.5" /> JSON backup
            </Button>
          </>
        }
      />

      {r.hasData ? (
        <article className="glass rounded-2xl p-5 md:p-6">
          {/* Document header */}
          <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 pb-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight md:text-lg">
                NexusOS Productivity Report — {periodLabel}
              </h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <CalendarRange className="h-3 w-3" aria-hidden="true" />
                {fmtDayFull(dateKey(r.start))} → {fmtDayFull(todayKey())} · Generated {new Date().toLocaleString()}
              </p>
            </div>
          </header>

          {/* KPI table — scrolls sideways on very narrow screens instead of clipping */}
          <div className="slim-scroll -mx-1 overflow-x-auto px-1">
          <Table className="min-w-[16rem]">
            <TableBody>
              <ReportRow
                label="Study time"
                value={minutesToHM(r.totalMinutes)}
                right={
                  <>
                    <span className={r.totalMinutes >= r.targetMinutes ? 'text-foreground' : 'text-foreground font-medium'}>
                      {deltaLabel(r.totalMinutes - r.targetMinutes)}
                    </span>
                    <span className="text-muted-foreground/60"> / {minutesToHM(r.targetMinutes)}</span>
                  </>
                }
              />
              <ReportRow
                label="Coding time"
                value={minutesToHM(r.codingMinutes)}
                right={
                  <>
                    <span className={r.codingMinutes >= r.codingTargetMinutes ? 'text-foreground' : 'text-foreground font-medium'}>
                      {deltaLabel(r.codingMinutes - r.codingTargetMinutes)}
                    </span>
                    <span className="text-muted-foreground/60"> / {minutesToHM(r.codingTargetMinutes)}</span>
                  </>
                }
              />
              <ReportRow label="Sessions" value={String(r.sessionsIn.length)} right={<span className="text-muted-foreground/60">{r.days.length}-day window</span>} />
              <ReportRow label="Tasks completed" value={String(r.tasksCompleted)} right={<span className="text-muted-foreground/60">all-time overdue: {r.overdueCount}</span>} />
              <ReportRow label="Habit consistency" value={`${r.consistency}%`} right={<span className="text-muted-foreground/60">{r.habitRows.length} habits × {r.days.length} days</span>} />
              <ReportRow label="Current streak" value={`${r.streak.current} days`} right={<span className="text-muted-foreground/60">best {r.streak.best}</span>} />
              <ReportRow label="Avg sleep" value={`${r.avgSleep}h`} right={<span className="text-muted-foreground/60">in window</span>} />
              <ReportRow label="Avg energy" value={`${r.avgEnergy}/5`} right={<span className="text-muted-foreground/60">in window</span>} />
            </TableBody>
          </Table>
          </div>

          {/* Charts */}
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <ChartCard
              title="Top subjects"
              subtitle="Focused minutes in this period"
              option={subjectOption}
              height={260}
              csv={{ name: 'nexusos-report-top-subjects', rows: r.topSubjects.map((t) => ({ subject: t.name, minutes: t.minutes })) }}
            />
            <ChartCard
              title="Time allocation"
              subtitle="Minutes by subject category"
              option={donutOption}
              height={260}
              csv={{ name: 'nexusos-report-allocation', rows: r.categoryRows.map((c) => ({ category: c.label, minutes: c.minutes })) }}
            />
          </div>

          {/* Habits + highlights */}
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Habit consistency</h3>
              <div className="space-y-2.5">
                {r.habitRows.length === 0 && <p className="text-xs text-muted-foreground">No habits yet.</p>}
                {r.habitRows.map((h) => (
                  <div key={h.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">{h.name}</span>
                      <span className="shrink-0 font-mono text-muted-foreground">{h.done}/{h.target}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, h.pctDone)}%`, backgroundColor: h.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Highlights</h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {r.bestDay && r.bestDay.minutes > 0 && (
                  <li className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/80" aria-hidden="true" />
                    <span>Best study day: <b className="text-foreground">{fmtDayFull(r.bestDay.key)}</b> with {minutesToHM(r.bestDay.minutes)} focused.</span>
                  </li>
                )}
                {r.topHabit && r.topHabit.done > 0 && (
                  <li className="flex items-start gap-2">
                    <Medal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" aria-hidden="true" />
                    <span>Most consistent habit: <b className="text-foreground">{r.topHabit.name}</b> ({r.topHabit.done}/{r.topHabit.target} this period).</span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span>Current streak: <b className="text-foreground">{r.streak.current} day{r.streak.current === 1 ? '' : 's'}</b> (all-time best {r.streak.best}).</span>
                </li>
                {r.overdueCount > 0 && (
                  <li className="flex items-start gap-2 font-medium text-foreground">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span><b>{r.overdueCount}</b> overdue task{r.overdueCount === 1 ? '' : 's'} — clear {r.overdueCount === 1 ? 'it' : 'them'} today.</span>
                  </li>
                )}
                {r.sessionsIn.length === 0 && r.totalMinutes === 0 && (
                  <li className="flex items-start gap-2">
                    <CalendarCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>No study time logged in this window yet — the tracker fills this report in.</span>
                  </li>
                )}
              </ul>
            </section>
          </div>
        </article>
      ) : (
        <EmptyState
          icon={FileBarChart2}
          title={`No data in ${periodLabel.toLowerCase()}`}
          hint="Log study time, sessions, tasks or habits — the report assembles itself. Exports below always work."
        />
      )}

      {/* Data portability */}
      <section className="glass space-y-4 rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <HardDriveDownload className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold tracking-tight">Data portability</h2>
          <span className="text-[11px] text-muted-foreground">plain CSV, no lock-in</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <ExportButton icon={Timer} label="Sessions CSV" hint={`${sessions.length} rows`} onClick={exportSessions} />
          <ExportButton icon={ListChecks} label="Tasks CSV" hint={`${tasks.length} rows`} onClick={exportTasks} />
          <ExportButton icon={CalendarCheck} label="Daily logs CSV" hint={`${Object.keys(dailyLogs).length} days`} onClick={exportDailyLogs} />
          <ExportButton icon={Flame} label="Habits CSV" hint="long format · habit,date,done" onClick={exportHabits} />
        </div>
        <Separator className="bg-border/50" />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Import JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImport}
            aria-label="Import NexusOS data JSON"
          />
          <p className="text-[11px] text-muted-foreground">
            Restore a <span className="font-mono">nexusos-backup-*.json</span> file — it merges into your current data.
          </p>
        </div>
      </section>
    </div>
  );
}
