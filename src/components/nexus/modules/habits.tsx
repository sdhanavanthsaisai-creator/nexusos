'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Check, Flame, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChartCard, EmptyState, ModuleHeader } from '../ui-bits';
import { baseTooltip, useChartTheme } from '../echarts-wrapper';
import { CHART_PALETTE } from '@/lib/nexus/constants';
import { useNexus } from '@/lib/nexus/store';
import { addDays, clamp, dateKey, fmtDayNum, startOfWeek, todayKey } from '@/lib/nexus/utils';
import type { EChartsOption } from 'echarts';
import type { Habit } from '@/lib/nexus/types';
import { cn } from '@/lib/utils';
import { HABIT_ICON_FALLBACK, HABIT_ICON_LABELS, HABIT_ICON_MAP } from './habits/habit-card';
import HabitCard from './habits/habit-card';

const ICON_KEYS = Object.keys(HABIT_ICON_MAP);

// ─── Add / edit habit dialog ──────────────────────────────────────────────────
function HabitDialog({
  open,
  onOpenChange,
  habit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  habit: Habit | null; // null → create mode
}) {
  const addHabit = useNexus((s) => s.addHabit);
  const updateHabit = useNexus((s) => s.updateHabit);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('sunrise');
  const [target, setTarget] = useState('5');
  const [color, setColor] = useState(CHART_PALETTE[0]);

  // sync form state when the dialog opens for a (different) habit — render-time adjustment
  const [syncKey, setSyncKey] = useState<string | null>(null);
  const nextKey = open ? `o-${habit?.id ?? 'new'}` : null;
  if (open && nextKey !== syncKey) {
    setSyncKey(nextKey);
    if (habit) {
      setName(habit.name);
      setIcon(HABIT_ICON_MAP[habit.icon] ? habit.icon : 'sunrise');
      setTarget(String(habit.targetPerWeek));
      setColor(habit.color);
    } else {
      setName('');
      setIcon('sunrise');
      setTarget('5');
      setColor(CHART_PALETTE[0]);
    }
  }

  const save = () => {
    const n = name.trim();
    if (!n) {
      toast.error('Habit name is required');
      return;
    }
    const t = clamp(Number.parseInt(target, 10) || 1, 1, 7);
    if (habit) {
      updateHabit(habit.id, { name: n, icon, color, targetPerWeek: t });
      toast.success('Habit updated');
    } else {
      addHabit({ name: n, icon, color, targetPerWeek: t });
      toast.success('Habit created');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="slim-scroll max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{habit ? 'Edit habit' : 'New habit'}</DialogTitle>
          <DialogDescription>
            Small consistent reps compound — pick an identity, a target and a colour.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="habit-name">Name *</Label>
            <Input
              id="habit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wake before 7"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger className="w-full text-xs" aria-label="Habit icon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_KEYS.map((k) => {
                    const Icon = HABIT_ICON_MAP[k];
                    return (
                      <SelectItem key={k} value={k}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          {HABIT_ICON_LABELS[k]}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="habit-target">Target / week (1–7)</Label>
              <Input
                id="habit-target"
                type="number"
                min={1}
                max={7}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-2">
              {CHART_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Colour ${c}`}
                  aria-pressed={color === c}
                  className={cn(
                    'h-7 w-7 rounded-full border border-black/10 transition-transform hover:scale-110',
                    color === c && 'ring-2 ring-foreground/70 ring-offset-2 ring-offset-background',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>{habit ? 'Save changes' : 'Create habit'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Module ───────────────────────────────────────────────────────────────────
export default function HabitsModule() {
  const habits = useNexus((s) => s.habits);
  const habitRecords = useNexus((s) => s.habitRecords);
  const confettiEnabled = useNexus((s) => s.settings.confettiEnabled);
  const toggleHabitDate = useNexus((s) => s.toggleHabitDate);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);

  const active = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const today = todayKey();
  const doneCount = useMemo(
    () => active.filter((h) => habitRecords[h.id]?.[today]).length,
    [active, habitRecords, today],
  );

  // celebrate when ALL active habits flip to done (guard: once per day)
  const prevDoneRef = useRef<number | null>(null);
  const celebratedDayRef = useRef<string | null>(null);
  useEffect(() => {
    const day = today;
    if (celebratedDayRef.current !== day) {
      celebratedDayRef.current = day;
      prevDoneRef.current = null;
    }
    const prev = prevDoneRef.current;
    if (
      prev !== null &&
      active.length > 0 &&
      prev < active.length &&
      doneCount === active.length
    ) {
      if (confettiEnabled) {
        void confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
        toast.success('All habits done! 🎉');
      }
    }
    prevDoneRef.current = doneCount;
  }, [doneCount, active.length, confettiEnabled, today]);

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (h: Habit) => {
    setEditing(h);
    setDialogOpen(true);
  };

  // ── Weekly consistency chart: last FULL week (Mon–Sun) ──
  const theme = useChartTheme();
  const chart = useMemo(() => {
    const start = addDays(startOfWeek(new Date()), -7);
    const days = Array.from({ length: 7 }, (_, i) => dateKey(addDays(start, i)));
    const rows = active.map((h) => {
      const target = Math.max(1, h.targetPerWeek);
      const done = days.filter((k) => habitRecords[h.id]?.[k]).length;
      return {
        habit: h,
        done,
        target,
        pct: Math.min(100, Math.round((done / target) * 100)),
      };
    });
    const option: EChartsOption = {
      tooltip: { ...baseTooltip(theme), trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 8, right: 44, top: 10, bottom: 4, containLabel: true },
      xAxis: {
        type: 'value',
        max: 100,
        axisLabel: { formatter: '{value}%', color: theme.subtext, fontSize: 11 },
        splitLine: { lineStyle: { color: theme.split } },
      },
      yAxis: {
        type: 'category',
        data: rows.map((r) => r.habit.name),
        inverse: true,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: theme.text, fontSize: 11, width: 120, overflow: 'truncate' },
      },
      series: [
        {
          name: 'Consistency',
          type: 'bar',
          barMaxWidth: 12,
          data: rows.map((r) => ({
            value: r.pct,
            itemStyle: { color: r.habit.color, borderRadius: 6 },
          })),
          label: { show: true, position: 'right', formatter: '{c}%', color: theme.subtext, fontSize: 10 },
        },
      ],
    };
    const csv = rows.map((r) => ({
      habit: r.habit.name,
      done: r.done,
      target: r.target,
      pct: r.pct,
    }));
    return { option, csv, startKey: days[0], endKey: days[days.length - 1] };
  }, [active, habitRecords, theme]);

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={Flame}
        title="Habit Tracker"
        subtitle="Streaks, heatmaps and weekly consistency"
        actions={
          <Button onClick={openAdd} className="gap-1.5">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add habit
          </Button>
        }
      />

      {active.length === 0 ? (
        <EmptyState
          icon={Flame}
          title="No habits yet"
          hint="Add your first habit — waking early, reading, water, anything you want to make automatic."
        >
          <Button onClick={openAdd} className="gap-1.5">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add habit
          </Button>
        </EmptyState>
      ) : (
        <>
          {/* Today strip */}
          <div className="glass rounded-2xl p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold tracking-tight">Today</h3>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {doneCount}/{active.length} completed
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {active.map((h) => {
                const done = !!habitRecords[h.id]?.[today];
                const Icon = HABIT_ICON_MAP[h.icon] ?? HABIT_ICON_FALLBACK;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => toggleHabitDate(h.id, today)}
                    aria-pressed={done}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:scale-[1.03]',
                      !done && 'border-border/70 text-muted-foreground hover:border-foreground/30',
                    )}
                    style={done ? { borderColor: h.color, backgroundColor: `${h.color}1a`, color: h.color } : undefined}
                  >
                    {done && <Check className="h-3 w-3" aria-hidden="true" />}
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {h.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Habit cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((h) => (
              <HabitCard key={h.id} habit={h} records={habitRecords[h.id]} onEdit={openEdit} />
            ))}
            <button
              type="button"
              onClick={openAdd}
              className="flex min-h-[120px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border/70 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-medium">Add habit</span>
            </button>
          </div>

          {/* Weekly consistency chart */}
          <ChartCard
            title="Weekly consistency"
            subtitle={`% of weekly target hit · ${fmtDayNum(chart.startKey)} – ${fmtDayNum(chart.endKey)}`}
            option={chart.option}
            height={Math.max(220, active.length * 36 + 40)}
            csv={{ name: 'habit-consistency', rows: chart.csv }}
          />
        </>
      )}

      <HabitDialog open={dialogOpen} onOpenChange={setDialogOpen} habit={editing} />
    </div>
  );
}
