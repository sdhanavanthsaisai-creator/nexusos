'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PRIORITY_META, STATUS_META } from '@/lib/nexus/constants';
import { useNexus } from '@/lib/nexus/store';
import {
  addDays,
  dateKey,
  fmtDayFull,
  fmtMonthYear,
  isOverdue,
  todayKey,
  WEEKDAYS,
} from '@/lib/nexus/utils';
import type { ID, Task } from '@/lib/nexus/types';
import { cn } from '@/lib/utils';
import { sortTasks } from './board';

interface CalendarProps {
  onEdit: (id: ID) => void;
  onAddOnDay: (day: string) => void;
}

export function CalendarView({ onEdit, onAddOnDay }: CalendarProps) {
  const tasks = useNexus((s) => s.tasks);
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => todayKey());

  const today = todayKey();

  // 42 cells (6 rows), Monday-start
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const start = addDays(first, -offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = addDays(start, i);
      return { key: dateKey(d), inMonth: d.getMonth() === cursor.getMonth(), dayNum: d.getDate() };
    });
  }, [cursor]);

  const byDue = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const arr = map.get(t.dueDate);
      if (arr) arr.push(t);
      else map.set(t.dueDate, [t]);
    }
    for (const [k, arr] of map) map.set(k, sortTasks(arr));
    return map;
  }, [tasks]);

  const dayTasks = useMemo(() => sortTasks(byDue.get(selectedDay) ?? []), [byDue, selectedDay]);

  const shiftMonth = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
            {fmtMonthYear(cursor)}
          </h3>
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[11px]"
              onClick={() => {
                setCursor(new Date());
                setSelectedDay(today);
              }}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {cells.map(({ key, inMonth, dayNum }) => {
            const list = byDue.get(key) ?? [];
            const isToday = key === today;
            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedDay(key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedDay(key);
                  }
                }}
                aria-label={`${fmtDayFull(key)} — ${list.length} tasks`}
                className={cn(
                  'flex min-h-[76px] cursor-pointer flex-col gap-1 rounded-lg border p-1.5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  inMonth ? 'bg-background/40' : 'bg-transparent opacity-40',
                  key === selectedDay && 'border-primary/40',
                  isToday && 'border-primary/60 ring-2 ring-primary',
                )}
              >
                <span
                  className={cn(
                    'text-[10px] font-medium tabular-nums',
                    isToday ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {dayNum}
                </span>
                {list.slice(0, 3).map((t) => {
                  const c = PRIORITY_META[t.priority].color;
                  const done = t.status === 'done';
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(t.id);
                      }}
                      title={t.title}
                      className={cn(
                        'truncate rounded bg-foreground/[0.08] px-1 text-left text-[10px] leading-4 hover:brightness-110',
                        done && 'line-through opacity-55',
                      )}
                      style={{
                        color: done ? 'var(--muted-foreground)' : c,
                      }}
                    >
                      {t.title}
                    </button>
                  );
                })}
                {list.length > 3 && (
                  <span className="px-1 text-[9px] font-medium text-muted-foreground">
                    +{list.length - 3} more
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected-day detail strip */}
      <div className="glass rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight">{fmtDayFull(selectedDay)}</h3>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => onAddOnDay(selectedDay)}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add task on this day
          </Button>
        </div>

        {dayTasks.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">Nothing due this day. A clean slate ✨</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {dayTasks.map((t) => {
              const c = PRIORITY_META[t.priority].color;
              const status = STATUS_META[t.status];
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onEdit(t.id)}
                    className="flex w-full items-center gap-2 rounded-lg border border-border/50 px-2.5 py-1.5 text-left transition-colors hover:bg-muted/40"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: c }}
                      title={PRIORITY_META[t.priority].label}
                    />
                    <span
                      className={cn(
                        'flex-1 truncate text-xs font-medium',
                        t.status === 'done' && 'text-muted-foreground line-through',
                      )}
                    >
                      {t.title}
                    </span>
                    {isOverdue(t) && (
                      <span className="text-[10px] font-medium tabular-nums text-foreground">overdue</span>
                    )}
                    <Badge
                      variant="outline"
                      className="h-4 shrink-0 border-foreground/25 px-1.5 text-[9px]"
                      style={{ color: status.color }}
                    >
                      {status.label}
                    </Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
