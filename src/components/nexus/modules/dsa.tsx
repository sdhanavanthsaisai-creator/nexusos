'use client';

import { useMemo } from 'react';
import {
  Braces, CircleCheck, Flame, Layers, ListChecks, Lock, Minus, Plus, Power, Target,
} from 'lucide-react';
import { toast } from 'sonner';
import type { EChartsOption } from 'echarts';
import type { DsaTopic } from '@/lib/nexus/types';
import { useNexus } from '@/lib/nexus/store';
import { pct, sum } from '@/lib/nexus/utils';
import { baseTooltip, ChartCard, EmptyState, KpiCard, ModuleHeader, RingProgress, useChartTheme } from '../ui-bits';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

const DIFF_META: Record<DsaTopic['difficulty'], { label: string; color: string; cls: string }> = {
  easy: { label: 'Easy', color: '#34d399', cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400' },
  medium: { label: 'Medium', color: '#fbbf24', cls: 'border-amber-400/30 bg-amber-400/10 text-amber-400' },
  hard: { label: 'Hard', color: '#fb7185', cls: 'border-rose-400/30 bg-rose-400/10 text-rose-400' },
};

// ─── Locked state ─────────────────────────────────────────────────────────────
function LockedState() {
  const profile = useNexus((s) => s.profile);
  const dsaTopics = useNexus((s) => s.dsaTopics);
  const toggleDsa = useNexus((s) => s.toggleDsa);

  const totalProblems = sum(dsaTopics.map((t) => t.problemsTotal));
  const easy = sum(dsaTopics.filter((t) => t.difficulty === 'easy').map((t) => t.problemsTotal));
  const medium = sum(dsaTopics.filter((t) => t.difficulty === 'medium').map((t) => t.problemsTotal));
  const hard = sum(dsaTopics.filter((t) => t.difficulty === 'hard').map((t) => t.problemsTotal));

  const waiting = [
    { icon: ListChecks, text: `${totalProblems} curated problems across ${dsaTopics.length} topics — from arrays to dynamic programming.` },
    { icon: Layers, text: `Difficulty breakdown: ${easy} easy · ${medium} medium · ${hard} hard queues.` },
    { icon: Target, text: 'Per-topic mastery tracking from 0 to 100%.' },
    { icon: Flame, text: 'Daily problem streaks with milestone celebrations.' },
  ];

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="glass relative overflow-hidden rounded-2xl p-6 md:p-8">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center">
          <div className="shrink-0">
            <RingProgress value={0} size={104} stroke={6} color="var(--primary)" trackOpacity={0.3} label="DSA module locked">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary glow">
                <Lock className="h-5 w-5" aria-hidden="true" />
              </span>
            </RingProgress>
          </div>
          <div className="min-w-0 space-y-3">
            <Badge variant="outline" className="border-amber-400/30 bg-amber-400/10 text-amber-400">
              Semester {profile.semester}
            </Badge>
            <h2 className="text-xl font-semibold tracking-tight">DSA Module — Locked</h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              {`The Data Structures & Algorithms track unlocks after Semester 1. You're currently in Semester ${profile.semester} — finish strong, then level up.`}
            </p>
            <div className="pt-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">What&apos;s waiting for you</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {waiting.map((w) => (
                  <li key={w.text} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <w.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                    <span>{w.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum preview */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Curriculum preview</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {dsaTopics.map((t) => (
            <div key={t.id} className="glass rounded-xl p-3 opacity-80 transition-opacity hover:opacity-100">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-xs font-medium">{t.name}</span>
                <Lock className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden="true" />
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <Badge variant="outline" className={cn('px-1 py-0 text-[9px]', DIFF_META[t.difficulty].cls)}>
                  {DIFF_META[t.difficulty].label}
                </Badge>
                <span className="truncate text-[10px] text-muted-foreground">{t.problemsTotal} problems</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Unlock card */}
      <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Unlock DSA mode now</p>
          <p className="text-xs text-muted-foreground">You can also toggle this later in Settings → DSA.</p>
        </div>
        <Switch
          checked={false}
          onCheckedChange={() => {
            toggleDsa();
            toast.success('DSA mode unlocked — welcome to the grind 💪');
          }}
          aria-label="Unlock DSA mode"
        />
      </div>
    </div>
  );
}

// ─── Active state ─────────────────────────────────────────────────────────────
function ActiveState() {
  const dsaTopics = useNexus((s) => s.dsaTopics);
  const bumpDsaProblem = useNexus((s) => s.bumpDsaProblem);
  const updateDsaTopic = useNexus((s) => s.updateDsaTopic);
  const theme = useChartTheme();

  const totalSolved = sum(dsaTopics.map((t) => t.problemsSolved));
  const totalProblems = sum(dsaTopics.map((t) => t.problemsTotal));
  const overall = pct(totalSolved, totalProblems);
  const masteryAvg = dsaTopics.length
    ? Math.round(sum(dsaTopics.map((t) => t.mastery)) / dsaTopics.length)
    : 0;

  const diffRows = useMemo(
    () =>
      (['easy', 'medium', 'hard'] as const).map((d) => ({
        key: d,
        label: DIFF_META[d].label,
        color: DIFF_META[d].color,
        solved: sum(dsaTopics.filter((t) => t.difficulty === d).map((t) => t.problemsSolved)),
        total: sum(dsaTopics.filter((t) => t.difficulty === d).map((t) => t.problemsTotal)),
      })),
    [dsaTopics],
  );

  const donutOption: EChartsOption = useMemo(() => {
    const data = diffRows
      .filter((d) => d.total > 0)
      .map((d) => ({ name: d.label, value: d.solved, itemStyle: { color: d.color } }));
    return {
      tooltip: { ...baseTooltip(theme), trigger: 'item' },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemWidth: 9,
        itemHeight: 9,
        textStyle: { color: theme.subtext, fontSize: 11 },
        formatter: (name: string) => {
          const row = diffRows.find((d) => d.label === name);
          return row ? `${name} · ${row.solved}/${row.total}` : name;
        },
      },
      series: [
        {
          type: 'pie',
          radius: ['52%', '78%'],
          center: ['50%', '42%'],
          itemStyle: { borderColor: theme.bg, borderWidth: 2, borderRadius: 6 },
          label: { show: false },
          emphasis: { scaleSize: 4 },
          data,
        },
      ],
    };
  }, [diffRows, theme]);

  const complete = (t: DsaTopic) => {
    if (t.problemsSolved >= t.problemsTotal) return;
    updateDsaTopic(t.id, { problemsSolved: t.problemsTotal });
    toast.success(`"${t.name}" complete — ${t.problemsTotal}/${t.problemsTotal} 🎉`);
  };

  const bump = (t: DsaTopic, delta: number) => {
    bumpDsaProblem(t.id, delta);
    if (delta > 0 && t.problemsSolved + 1 === t.problemsTotal) {
      toast.success(`"${t.name}" complete — ${t.problemsTotal}/${t.problemsTotal} 🎉`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top row: ring + KPIs */}
      <div className="grid gap-3 lg:grid-cols-[auto_1fr]">
        <div className="glass flex items-center justify-center rounded-2xl p-5">
          <RingProgress value={overall} size={124} stroke={10} color="var(--primary)" label="Overall DSA progress">
            <div className="text-center">
              <p className="font-mono text-xl font-bold tabular-nums">{overall}%</p>
              <p className="text-[10px] text-muted-foreground">{totalSolved}/{totalProblems} solved</p>
            </div>
          </RingProgress>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard icon={CircleCheck} label="Solved" value={totalSolved} sub={`${overall}% of curriculum`} tone="emerald" progress={overall} />
          <KpiCard icon={ListChecks} label="Total problems" value={totalProblems} sub={`${dsaTopics.length} topics in the plan`} tone="cyan" />
          <KpiCard icon={Target} label="Avg mastery" value={`${masteryAvg}%`} sub="Across all topics" tone="violet" progress={masteryAvg} />
        </div>
      </div>

      {/* Difficulty donut + topic cards */}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="self-start">
          {totalProblems > 0 ? (
            <ChartCard
              title="Difficulty breakdown"
              subtitle="Solved problems by difficulty"
              option={donutOption}
              height={300}
              csv={{ name: 'nexusos-dsa-difficulty', rows: diffRows.map((d) => ({ difficulty: d.label, solved: d.solved, total: d.total })) }}
            />
          ) : (
            <EmptyState icon={Braces} title="No problems yet" hint="Once topics have problem totals, the difficulty donut lives here." />
          )}
        </div>

        {dsaTopics.length === 0 ? (
          <EmptyState icon={ListChecks} title="No DSA topics" hint="Import a backup or reset to sample data to load the 13-topic curriculum." />
        ) : (
          <div className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {dsaTopics.map((t) => {
              const diff = DIFF_META[t.difficulty];
              return (
                <div key={t.id} className="glass space-y-3 rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-medium">{t.name}</h3>
                    <Badge variant="outline" className={cn('shrink-0 text-[10px]', diff.cls)}>{diff.label}</Badge>
                  </div>
                  <div className="flex items-baseline gap-1 font-mono text-xs text-muted-foreground">
                    <span className="text-base font-semibold tabular-nums text-foreground">{t.problemsSolved}</span>
                    /{t.problemsTotal}
                    <span className="ml-auto text-[11px]">{t.mastery}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={t.mastery} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, t.mastery)}%`, backgroundColor: diff.color }} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline" size="icon" className="h-7 w-7"
                      disabled={t.problemsSolved <= 0}
                      onClick={() => bump(t, -1)}
                      aria-label={`Mark one unsolved in ${t.name}`}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline" size="icon" className="h-7 w-7"
                      disabled={t.problemsSolved >= t.problemsTotal}
                      onClick={() => bump(t, 1)}
                      aria-label={`Mark one solved in ${t.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="secondary" size="sm" className="ml-auto h-7 px-2.5 text-[11px]"
                      disabled={t.problemsSolved >= t.problemsTotal}
                      onClick={() => complete(t)}
                    >
                      Complete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Module ───────────────────────────────────────────────────────────────────
export default function DsaModule() {
  const dsaActive = useNexus((s) => s.dsaActive);
  const toggleDsa = useNexus((s) => s.toggleDsa);

  return (
    <div className="space-y-6">
      <ModuleHeader
        icon={Braces}
        title="DSA Future Plan"
        subtitle={dsaActive ? 'Grind mode engaged — track every problem' : 'Locked until Semester 1 wraps up'}
        actions={
          dsaActive ? (
            <Button
              variant="ghost" size="sm"
              onClick={() => {
                toggleDsa();
                toast('DSA mode deactivated — the plan waits patiently.');
              }}
            >
              <Power className="h-3.5 w-3.5" /> Deactivate
            </Button>
          ) : undefined
        }
      />
      {dsaActive ? <ActiveState /> : <LockedState />}
    </div>
  );
}
