'use client';

import { useMemo } from 'react';
import {
  Ban,
  Bike,
  BookMarked,
  BookOpen,
  Check,
  Dumbbell,
  Flame,
  GlassWater,
  MoonStar,
  Music,
  Settings2,
  Sunrise,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { RingProgress } from '../../ui-bits';
import { useNexus } from '@/lib/nexus/store';
import { addDays, addDaysKey, dateKey, fmtDayNum, parseKey, startOfWeek, todayKey, WEEKDAYS } from '@/lib/nexus/utils';
import type { Habit, HabitRecords } from '@/lib/nexus/types';
import { cn } from '@/lib/utils';

// ─── Icon mapping ─────────────────────────────────────────────────────────────
export const HABIT_ICON_MAP: Record<string, LucideIcon> = {
  sunrise: Sunrise,
  'book-open': BookOpen,
  dumbbell: Dumbbell,
  'glass-water': GlassWater,
  'book-marked': BookMarked,
  'moon-star': MoonStar,
  ban: Ban,
  bike: Bike,
  music: Music,
};

export const HABIT_ICON_LABELS: Record<string, string> = {
  sunrise: 'Sunrise',
  'book-open': 'Book Open',
  dumbbell: 'Dumbbell',
  'glass-water': 'Glass of Water',
  'book-marked': 'Book Marked',
  'moon-star': 'Moon Star',
  ban: 'Ban',
  bike: 'Bike',
  music: 'Music',
};

export const HABIT_ICON_FALLBACK: LucideIcon = Flame;

/** Consecutive done-days ending today (or yesterday, so the streak survives the morning). */
export function habitStreak(records: Record<string, boolean> | undefined): number {
  if (!records) return 0;
  let cursor = todayKey();
  if (!records[cursor]) cursor = addDaysKey(cursor, -1);
  let streak = 0;
  while (records[cursor]) {
    streak += 1;
    cursor = addDaysKey(cursor, -1);
  }
  return streak;
}

interface HabitCardProps {
  habit: Habit;
  records: HabitRecords[string] | undefined;
  onEdit: (habit: Habit) => void;
}

export default function HabitCard({ habit, records, onEdit }: HabitCardProps) {
  const toggleHabitDate = useNexus((s) => s.toggleHabitDate);
  const deleteHabit = useNexus((s) => s.deleteHabit);

  const Icon = HABIT_ICON_MAP[habit.icon] ?? HABIT_ICON_FALLBACK;
  const target = Math.max(1, habit.targetPerWeek);

  const streak = useMemo(() => habitStreak(records), [records]);

  // this week (Mon-start)
  const week = useMemo(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => dateKey(addDays(start, i)));
  }, []);
  const doneThisWeek = useMemo(() => week.filter((k) => records?.[k]).length, [week, records]);
  const ringValue = Math.min(100, Math.round((doneThisWeek / target) * 100));

  // last 7 days (rolling, ends today)
  const last7 = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysKey(todayKey(), i - 6)),
    [],
  );
  const done7 = useMemo(() => last7.filter((k) => records?.[k]).length, [last7, records]);
  const weeklyPct = Math.min(100, Math.round((done7 / target) * 100));

  // 12-week heatmap (oldest → newest), Mon-start weeks
  const weeks = useMemo(() => {
    const sow = startOfWeek(new Date());
    return Array.from({ length: 12 }, (_, w) => {
      const start = addDays(sow, (w - 11) * 7);
      return Array.from({ length: 7 }, (_, d) => dateKey(addDays(start, d)));
    });
  }, []);

  const removeHabit = () => {
    deleteHabit(habit.id);
    toast.success(`Habit “${habit.name}” deleted`);
  };

  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:glow-soft">
      {/* header: icon / name / streak */}
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${habit.color}1a`, color: habit.color }}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{habit.name}</p>
          <p className="text-[10px] text-muted-foreground">{target}× / week target</p>
        </div>
        <span
          className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
          title="Current streak"
        >
          <Flame className="h-3 w-3" style={{ color: habit.color }} aria-hidden="true" />
          {streak}d
        </span>
      </div>

      {/* this-week ring + last-7-days toggles */}
      <div className="flex items-center gap-3">
        <RingProgress
          value={ringValue}
          size={64}
          stroke={7}
          color={habit.color}
          label={`This week ${doneThisWeek} of ${target}`}
        >
          <span className="text-[11px] font-semibold tabular-nums">
            {doneThisWeek}/{target}
          </span>
        </RingProgress>
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {last7.map((k) => {
            const done = !!records?.[k];
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggleHabitDate(habit.id, k)}
                title={`${fmtDayNum(k)}${done ? ' — done' : ''}`}
                aria-label={`Toggle ${fmtDayNum(k)} for ${habit.name}`}
                aria-pressed={done}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md border transition-all hover:scale-105',
                  done ? 'border-transparent' : 'border-border/70 text-muted-foreground/70 hover:border-foreground/30',
                )}
                style={done ? { backgroundColor: habit.color } : undefined}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                ) : (
                  <span className="text-[9px] font-medium">{WEEKDAYS[(parseKey(k).getDay() + 6) % 7][0]}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 12-week heatmap */}
      <div className="grid grid-cols-[repeat(12,1fr)] gap-1" role="img" aria-label={`12-week heatmap for ${habit.name}`}>
        {weeks.map((weekDays, wi) => (
          <div key={wi} className="flex flex-col items-center gap-1">
            {weekDays.map((k) => {
              const done = !!records?.[k];
              return (
                <div
                  key={k}
                  title={`${fmtDayNum(k)} — ${done ? 'Done' : 'Missed'}`}
                  className={cn('h-2.5 w-2.5 rounded-[2px]', !done && 'bg-muted-foreground/20')}
                  style={done ? { backgroundColor: habit.color } : undefined}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* footer: weekly % + edit + delete */}
      <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-2.5">
        <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
          {weeklyPct}% last 7 days
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(habit)}
            aria-label={`Edit ${habit.name}`}
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                aria-label={`Delete ${habit.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete “{habit.name}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  The habit and its entire history will be permanently removed. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={removeHabit}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
