'use client';

/**
 * DashboardModule — Overview dashboard: 3D hero, KPI grid, focus list,
 * habits chips, 7-day chart, category donut, upcoming deadlines,
 * streak-milestone celebrations and a widget customizer.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import {
  ArrowDown, ArrowUp, BookOpenCheck, Brain, CalendarDays, Check, Clock, Code2,
  Coffee, Flame, LayoutDashboard, ListTodo, Lock, Play, Plus, SlidersHorizontal,
} from 'lucide-react';
import { useNexus, useUI } from '@/lib/nexus/store';
import type { SubjectCategory, Task } from '@/lib/nexus/types';
import {
  addDays, addDaysKey, computeStreak, dayTotalMinutes, eachDayKeys, fmtDayNum,
  minutesToHM, pct, startOfWeek, sum, todayKey,
} from '@/lib/nexus/utils';
import {
  CATEGORY_META, DASHBOARD_WIDGETS_DEFAULT, EXAM_TYPE_META, PRIORITY_META,
  STREAK_MILESTONES,
} from '@/lib/nexus/constants';
import {
  baseTooltip, ChartCard, EmptyState, KpiCard, ModuleHeader, RingProgress,
  useChartTheme, type EChartsOption,
} from '../ui-bits';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const Hero3D = dynamic(() => import('@/components/nexus/hero-3d'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-foreground/[0.07] via-transparent to-foreground/[0.05]" />
  ),
});

const CONFETTI_COLORS = ['#FFFFFF', '#C9C9C9', '#F1F1F1', '#C9C9C9', '#FFFFFF'];

function fireConfettiBurst() {
  confetti({
    particleCount: 90,
    spread: 100,
    origin: { y: 0.6 },
    colors: CONFETTI_COLORS,
    disableForReducedMotion: true,
  });
  setTimeout(() => {
    confetti({ particleCount: 55, angle: 60, spread: 70, origin: { x: 0, y: 0.75 }, colors: CONFETTI_COLORS, disableForReducedMotion: true });
    confetti({ particleCount: 55, angle: 120, spread: 70, origin: { x: 1, y: 0.75 }, colors: CONFETTI_COLORS, disableForReducedMotion: true });
  }, 180);
}

const WIDGET_META: Record<string, { label: string }> = {
  hero: { label: '3D Hero' },
  kpis: { label: 'KPI cards' },
  focus: { label: 'Focus today' },
  habits: { label: 'Habits today' },
  weekly: { label: 'Last 7 days chart' },
  donut: { label: '7-day allocation donut' },
  exams: { label: 'Upcoming deadlines' },
};

export default function DashboardModule() {
  // ── store ──
  const profile = useNexus((s) => s.profile);
  const settings = useNexus((s) => s.settings);
  const subjects = useNexus((s) => s.subjects);
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const tasks = useNexus((s) => s.tasks);
  const habits = useNexus((s) => s.habits);
  const habitRecords = useNexus((s) => s.habitRecords);
  const exams = useNexus((s) => s.exams);
  const dsaActive = useNexus((s) => s.dsaActive);
  const dsaTopics = useNexus((s) => s.dsaTopics);
  const celebrated = useNexus((s) => s.celebrated);
  const setSetting = useNexus((s) => s.setSetting);
  const completeTask = useNexus((s) => s.completeTask);
  const toggleHabitDate = useNexus((s) => s.toggleHabitDate);
  const celebrate = useNexus((s) => s.celebrate);
  const setActiveModule = useUI((s) => s.setActiveModule);

  // 3D hero is desktop-only & motion-respecting (mobile perf spec #9):
  // never load three.js on viewports ≤768px or when reduced motion is set.
  const [allow3d, setAllow3d] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setAllow3d(mq.matches && !motion.matches);
    update();
    mq.addEventListener('change', update);
    motion.addEventListener('change', update);
    return () => {
      mq.removeEventListener('change', update);
      motion.removeEventListener('change', update);
    };
  }, []);

  const themeRaw = useChartTheme();
  const theme = useMemo(
    () => themeRaw,
    [themeRaw.dark, themeRaw.text, themeRaw.subtext, themeRaw.split, themeRaw.bg, themeRaw.tooltipBg],
  );

  // ── date labels (client-only component tree, safe to read clock) ──
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const today = todayKey();

  // ── derived data ──
  const last7Keys = useMemo(() => eachDayKeys(addDays(new Date(), -6), new Date()), []);
  const weekStartKeys = useMemo(() => eachDayKeys(startOfWeek(new Date()), new Date()), []);

  const todayMin = dayTotalMinutes(dailyLogs[today]);
  const targetMin = profile.dailyTargetHours * 60;
  const todayPct = pct(todayMin, targetMin);

  const weekMin = useMemo(() => sum(last7Keys.map((k) => dayTotalMinutes(dailyLogs[k]))), [last7Keys, dailyLogs]);

  const tasksDone = useMemo(() => tasks.filter((t) => t.status === 'done').length, [tasks]);
  const tasksPending = tasks.length - tasksDone;

  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const habitsDone = useMemo(
    () => activeHabits.filter((h) => !!habitRecords[h.id]?.[today]).length,
    [activeHabits, habitRecords, today],
  );
  const habitScore = pct(habitsDone, activeHabits.length);

  const streak = useMemo(() => computeStreak(dailyLogs), [dailyLogs]);

  const codingMinWeek = useMemo(() => {
    const ids = new Set(subjects.filter((s) => s.category === 'coding').map((s) => s.id));
    return sum(
      weekStartKeys.flatMap((k) =>
        Object.entries(dailyLogs[k]?.minutes ?? {})
          .filter(([sid]) => ids.has(sid))
          .map(([, m]) => m),
      ),
    );
  }, [weekStartKeys, dailyLogs, subjects]);
  const codingHours = Math.round((codingMinWeek / 60) * 10) / 10;

  const dsaSolved = useMemo(() => dsaTopics.reduce((a, t) => a + t.problemsSolved, 0), [dsaTopics]);

  const focusTasks = useMemo(() => {
    const picked = new Map<string, Task>();
    for (const t of tasks) {
      if (t.status === 'done') continue;
      const dueOrOverdue = !!t.dueDate && t.dueDate <= today;
      const hotPriority = t.priority === 'critical' || t.priority === 'important';
      if (dueOrOverdue || hotPriority) picked.set(t.id, t);
    }
    return [...picked.values()]
      .sort(
        (a, b) =>
          PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank ||
          (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31'),
      )
      .slice(0, 6);
  }, [tasks, today]);

  const weekData = useMemo(
    () => last7Keys.map((k) => ({ key: k, day: fmtDayNum(k), minutes: dayTotalMinutes(dailyLogs[k]) })),
    [last7Keys, dailyLogs],
  );

  const donutData = useMemo(() => {
    const byCat = new Map<SubjectCategory, number>();
    for (const k of last7Keys) {
      const log = dailyLogs[k];
      if (!log) continue;
      for (const [sid, m] of Object.entries(log.minutes)) {
        const cat = subjects.find((s) => s.id === sid)?.category;
        if (!cat) continue;
        byCat.set(cat, (byCat.get(cat) ?? 0) + m);
      }
    }
    const data = [...byCat.entries()]
      .filter(([, m]) => m > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, m]) => ({ name: CATEGORY_META[cat].label, value: m }));
    return { data, total: sum([...byCat.values()]) };
  }, [last7Keys, dailyLogs, subjects]);

  type UpItem = { id: string; date: string; title: string; kind: string; color: string };
  const upcoming = useMemo<UpItem[]>(() => {
    const horizon = addDaysKey(today, 14);
    const items: UpItem[] = [];
    for (const e of exams) {
      if (e.date >= today && e.date <= horizon) {
        const meta = EXAM_TYPE_META[e.type];
        items.push({ id: `exam-${e.id}`, date: e.date, title: e.title, kind: meta?.label ?? e.type, color: meta?.color ?? 'var(--ink-1)' });
      }
    }
    for (const t of tasks) {
      if (t.status !== 'done' && t.dueDate && t.dueDate >= today && t.dueDate <= horizon) {
        items.push({ id: `task-${t.id}`, date: t.dueDate, title: t.title, kind: 'Task', color: PRIORITY_META[t.priority].color });
      }
    }
    return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
  }, [exams, tasks, today]);

  // ── celebrations ──
  useEffect(() => {
    const milestone = STREAK_MILESTONES.find((m) => m === streak.current);
    if (!milestone || celebrated.includes(milestone)) return;
    celebrate(milestone); // persists → effect won't re-fire
    if (settings.confettiEnabled) fireConfettiBurst();
    toast.success(`🔥 ${milestone}-day streak!`, { description: 'Consistency compounds — keep the chain alive.' });
  }, [streak.current, celebrated, celebrate, settings.confettiEnabled]);

  const habitsMountedRef = useRef(false);
  const habitsFiredRef = useRef<string | null>(null);
  const allHabitsDone = activeHabits.length > 0 && habitsDone === activeHabits.length;
  useEffect(() => {
    if (!habitsMountedRef.current) {
      habitsMountedRef.current = true;
      return; // skip firing on initial mount (e.g. already-complete seed data)
    }
    if (!allHabitsDone) return;
    const key = todayKey();
    if (habitsFiredRef.current === key) return;
    habitsFiredRef.current = key;
    if (settings.confettiEnabled) fireConfettiBurst();
    toast.success('All habits done! 🔥', { description: `${habitsDone}/${activeHabits.length} complete today.` });
  }, [allHabitsDone, settings.confettiEnabled, habitsDone, activeHabits.length]);

  // ── widget customization ──
  const enabledWidgets = useMemo(() => {
    const list = settings.dashboardWidgets?.length ? settings.dashboardWidgets : DASHBOARD_WIDGETS_DEFAULT;
    return list.filter((id) => id in WIDGET_META);
  }, [settings.dashboardWidgets]);

  const moveWidget = (index: number, dir: -1 | 1) => {
    const next = [...enabledWidgets];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setSetting({ dashboardWidgets: next });
  };
  const toggleWidget = (id: string, on: boolean) => {
    const next = on ? [...enabledWidgets, id] : enabledWidgets.filter((w) => w !== id);
    setSetting({ dashboardWidgets: next });
  };

  // ── quick actions ──
  const goLogStudy = () => setActiveModule('tracker');
  const goNewTask = () => {
    setActiveModule('tasks');
    window.dispatchEvent(new CustomEvent('nexus:new-task'));
  };
  const goStartTimer = () => {
    setActiveModule('sessions');
    window.dispatchEvent(new CustomEvent('nexus:timer-started'));
  };

  // ── chart options ──
  const weeklyOption = useMemo<EChartsOption>(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        ...baseTooltip(theme),
        valueFormatter: (v: unknown) => minutesToHM(Number(v)),
      },
      grid: { left: 6, right: 14, top: 30, bottom: 0, containLabel: true },
      xAxis: {
        type: 'category',
        data: weekData.map((d) => d.day),
        boundaryGap: false,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: theme.split } },
        axisLabel: { color: theme.subtext, fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: theme.split } },
        axisLabel: { color: theme.subtext, fontSize: 10, formatter: (v: number) => `${Math.round((v / 60) * 10) / 10}h` },
      },
      series: [
        {
          name: 'Study time',
          type: 'line',
          smooth: true,
          data: weekData.map((d) => d.minutes),
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2.5, color: theme.palette[0] },
          itemStyle: { color: theme.palette[0], borderColor: theme.bg, borderWidth: 2 },
          areaStyle: { color: theme.split },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { type: 'dashed', color: theme.subtext },
            label: { formatter: `Target ${profile.dailyTargetHours}h`, color: theme.subtext, fontSize: 10, position: 'insideEndTop' },
            data: [{ yAxis: targetMin }],
          },
        },
      ],
    }),
    [theme, weekData, targetMin, theme.bg, profile.dailyTargetHours],
  );

  const donutOption = useMemo<EChartsOption>(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        ...baseTooltip(theme),
        valueFormatter: (v: unknown) => minutesToHM(Number(v)),
      },
      legend: { bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: theme.subtext, fontSize: 10 } },
      title: {
        text: `${(donutData.total / 60).toFixed(1)}h`,
        subtext: '7-day total',
        left: 'center',
        top: '36%',
        textStyle: { color: theme.text, fontSize: 22, fontWeight: 600 },
        subtextStyle: { color: theme.subtext, fontSize: 10 },
      },
      series: [
        {
          type: 'pie',
          radius: ['55%', '80%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 6, borderColor: theme.bg, borderWidth: 2 },
          label: { show: false },
          data: donutData.data.map((d, i) => ({ ...d, itemStyle: { color: theme.palette[i % theme.palette.length] } })),
        },
      ],
    }),
    [theme, donutData, theme.bg, theme.text, theme.subtext],
  );

  // ── widget renderers ──
  const renderHero = () => (
    <section className="glass relative h-[300px] overflow-hidden rounded-2xl md:h-[360px]">
      {allow3d && <Hero3D />}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/85 via-background/25 to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5 md:p-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{dateLabel}</p>
          <h2 className="text-gradient mt-1.5 text-2xl font-black tracking-tight md:text-4xl">
            {greeting}, {profile.name}
          </h2>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="pointer-events-auto flex flex-wrap gap-2">
            <Button size="sm" className="glow-soft gap-1.5" onClick={goLogStudy}>
              <BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" /> Log study
            </Button>
            <Button size="sm" variant="outline" className="border-border/60 bg-background/50 backdrop-blur" onClick={goNewTask}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> New task
            </Button>
            <Button size="sm" variant="outline" className="border-border/60 bg-background/50 backdrop-blur" onClick={goStartTimer}>
              <Play className="h-3.5 w-3.5" aria-hidden="true" /> Start timer
            </Button>
          </div>
          <div className="pointer-events-auto rounded-2xl bg-background/40 p-1.5 backdrop-blur">
            <RingProgress value={todayPct} size={88} stroke={8} color="var(--ink-1)" label="Today's study target progress">
              <span className="font-mono text-sm font-semibold tabular-nums">{minutesToHM(todayMin)}</span>
              <span className="text-[9px] text-muted-foreground">of {profile.dailyTargetHours}h target</span>
            </RingProgress>
          </div>
        </div>
      </div>
    </section>
  );

  const renderKpis = () => (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard
        icon={Clock}
        label="Today's study"
        value={minutesToHM(todayMin)}
        sub={`${todayPct}% of ${profile.dailyTargetHours}h target`}
        tone="cyan"
        progress={todayPct}
      />
      <KpiCard
        icon={CalendarDays}
        label="Last 7 days"
        value={minutesToHM(weekMin)}
        sub={`Avg ${minutesToHM(Math.round(weekMin / 7))}/day`}
        tone="violet"
        progress={pct(weekMin, targetMin * 7)}
      />
      <KpiCard
        icon={ListTodo}
        label="Tasks"
        value={`${tasksDone}/${tasks.length}`}
        sub={`${tasksPending} pending`}
        tone="emerald"
        progress={pct(tasksDone, tasks.length)}
      />
      <KpiCard
        icon={Check}
        label="Habit score"
        value={`${habitScore}%`}
        sub={`${habitsDone}/${activeHabits.length} habits today`}
        tone="pink"
        progress={habitScore}
      />
      <KpiCard icon={Flame} label="Current streak" value={`${streak.current}d`} sub={`Best: ${streak.best}d`} tone="amber" />
      <KpiCard
        icon={Code2}
        label="Coding this week"
        value={`${codingHours}h`}
        sub={`Target ${profile.weeklyCodingTargetHours}h`}
        tone="rose"
        progress={pct(codingMinWeek, profile.weeklyCodingTargetHours * 60)}
      />
      {!dsaActive ? (
        <button
          type="button"
          onClick={() => setActiveModule('dsa')}
          aria-label="DSA plan is locked — open DSA module"
          className="block w-full cursor-pointer rounded-2xl text-left transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <KpiCard icon={Lock} label="DSA status" value="Locked" sub="Starts after Semester 1" tone="slate" />
        </button>
      ) : (
        <KpiCard icon={Brain} label="DSA status" value={`${dsaSolved}`} sub="Problems solved" tone="slate" />
      )}
    </div>
  );

  const renderFocus = () => (
    <div className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">Focus today</h3>
        <Badge variant="outline" className="text-[10px] text-muted-foreground">{focusTasks.length} urgent</Badge>
      </div>
      {focusTasks.length === 0 ? (
        <EmptyState icon={Coffee} title="Nothing urgent — enjoy the calm" hint="No overdue or high-priority tasks right now." />
      ) : (
        <div className="slim-scroll max-h-96 space-y-1.5 overflow-y-auto pr-1">
          {focusTasks.map((t) => {
            const overdue = !!t.dueDate && t.dueDate < today;
            return (
              <div key={t.id} className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-background/40 px-3 py-2">
                <Checkbox
                  className="mt-0.5"
                  onCheckedChange={(v) => {
                    if (!v) return;
                    completeTask(t.id);
                    toast.success('Task completed 🎉', { description: t.title });
                  }}
                  aria-label={`Mark "${t.title}" complete`}
                />
                <button
                  type="button"
                  onClick={() => setActiveModule('tasks')}
                  className="min-w-0 flex-1 truncate text-left text-sm transition-colors hover:text-primary"
                  title={t.title}
                >
                  {t.title}
                </button>
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: PRIORITY_META[t.priority].color }}
                  aria-hidden="true"
                  title={PRIORITY_META[t.priority].label}
                />
                {t.dueDate && (
                  <Badge
                    variant="outline"
                    className={cn('shrink-0 text-[10px]', overdue ? 'border-foreground/40 text-foreground' : 'text-muted-foreground')}
                  >
                    {overdue ? `Overdue · ${fmtDayNum(t.dueDate)}` : `Due ${fmtDayNum(t.dueDate)}`}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderHabits = () => (
    <div className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">Habits today</h3>
        <Badge variant="outline" className={cn('text-[10px]', allHabitsDone ? 'border-foreground/30 text-foreground' : 'text-muted-foreground')}>
          {habitsDone}/{activeHabits.length}
        </Badge>
      </div>
      {activeHabits.length === 0 ? (
        <EmptyState icon={Check} title="No habits yet" hint="Create habits in the Habits module to track them here." />
      ) : (
        <div className="flex flex-wrap gap-2">
          {activeHabits.map((h) => {
            const done = !!habitRecords[h.id]?.[today];
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => toggleHabitDate(h.id, today)}
                aria-pressed={done}
                aria-label={`${done ? 'Undo' : 'Complete'} habit ${h.name}`}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95',
                  !done && 'border-border/70 bg-muted/40 text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                  done && 'border-foreground/40 bg-foreground/[0.08] text-foreground',
                )}
              >
                {done && <Check className="h-3 w-3" aria-hidden="true" />}
                {h.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderWeekly = () => (
    <ChartCard
      title="Last 7 days"
      subtitle="Total focused minutes per day"
      option={weeklyOption}
      csv={{ name: 'last-7-days-study', rows: weekData.map(({ day, minutes }) => ({ day, minutes })) }}
    />
  );

  const renderDonut = () =>
    donutData.total === 0 ? (
      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-semibold tracking-tight">7-day allocation</h3>
        <EmptyState icon={CalendarDays} title="No study time logged" hint="Log a session to see your category split." />
      </div>
    ) : (
      <ChartCard title="7-day allocation" subtitle="Minutes by subject category" option={donutOption} height={300} />
    );

  const renderExams = () => (
    <div className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">Upcoming</h3>
        <Badge variant="outline" className="text-[10px] text-muted-foreground">Next 14 days</Badge>
      </div>
      {upcoming.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No deadlines in the next 14 days" hint="Exams, assignments and task due dates will appear here." />
      ) : (
        <div className="slim-scroll max-h-96 space-y-1.5 overflow-y-auto pr-1">
          {upcoming.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveModule('calendar')}
              className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-left transition-colors hover:border-primary/30 hover:bg-muted/40"
            >
              <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-1 font-mono text-[10px] leading-none text-primary">
                {fmtDayNum(item.date)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
              <span className="flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
                {item.kind}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderWidget = (id: string): ReactNode => {
    switch (id) {
      case 'hero': return renderHero();
      case 'kpis': return renderKpis();
      case 'focus': return renderFocus();
      case 'habits': return renderHabits();
      case 'weekly': return renderWeekly();
      case 'donut': return renderDonut();
      case 'exams': return renderExams();
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        icon={LayoutDashboard}
        title="Overview Dashboard"
        subtitle={`${profile.university} · Semester ${profile.semester}`}
        actions={
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" /> Customize widgets
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Toggle & reorder dashboard widgets</p>
              <div className="space-y-0.5">
                {enabledWidgets.map((id, i) => (
                  <div key={id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50">
                    <Checkbox
                      checked
                      onCheckedChange={(v) => {
                        if (!v) toggleWidget(id, false);
                      }}
                      aria-label={`Hide ${WIDGET_META[id]?.label ?? id}`}
                    />
                    <span className="flex-1 text-xs">{WIDGET_META[id]?.label ?? id}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={i === 0}
                      onClick={() => moveWidget(i, -1)}
                      aria-label={`Move ${WIDGET_META[id]?.label ?? id} up`}
                    >
                      <ArrowUp className="h-3 w-3" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={i === enabledWidgets.length - 1}
                      onClick={() => moveWidget(i, 1)}
                      aria-label={`Move ${WIDGET_META[id]?.label ?? id} down`}
                    >
                      <ArrowDown className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                {DASHBOARD_WIDGETS_DEFAULT.filter((id) => !enabledWidgets.includes(id)).map((id) => (
                  <div key={id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 opacity-60 hover:bg-muted/50">
                    <Checkbox
                      checked={false}
                      onCheckedChange={(v) => {
                        if (v) toggleWidget(id, true);
                      }}
                      aria-label={`Show ${WIDGET_META[id]?.label ?? id}`}
                    />
                    <span className="flex-1 text-xs">{WIDGET_META[id]?.label ?? id}</span>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        }
      />
      {enabledWidgets.length === 0 ? (
        <EmptyState
          icon={LayoutDashboard}
          title="All widgets are hidden"
          hint="Use the Customize widgets button to bring sections back."
        />
      ) : (
        <div className="space-y-6">
          {enabledWidgets.map((id) => (
            <div key={id}>{renderWidget(id)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
