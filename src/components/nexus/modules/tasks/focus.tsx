'use client';

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import confetti from 'canvas-confetti';
import { CalendarClock, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '../../ui-bits';
import { PRIORITY_META } from '@/lib/nexus/constants';
import { useNexus } from '@/lib/nexus/store';
import { addDaysKey, fmtDayNum, isDueToday, isOverdue } from '@/lib/nexus/utils';
import type { Task } from '@/lib/nexus/types';
import { cn } from '@/lib/utils';

interface Group {
  key: string;
  label: string;
  color: string;
  items: Task[];
}

function GroupSection({ group, children }: { group: Group; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3
        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
        style={{ color: group.color }}
      >
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: group.color }} />
        {group.label}
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
          {group.items.length}
        </span>
      </h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

export function FocusView() {
  const tasks = useNexus((s) => s.tasks);
  const updateTask = useNexus((s) => s.updateTask);
  const completeTask = useNexus((s) => s.completeTask);
  const confettiEnabled = useNexus((s) => s.settings.confettiEnabled);
  const celebratedRef = useRef(false);

  const open = useMemo(() => tasks.filter((t) => t.status !== 'done'), [tasks]);
  const overdue = useMemo(() => open.filter(isOverdue), [open]);
  const dueToday = useMemo(() => open.filter(isDueToday), [open]);
  const highPriority = useMemo(() => {
    const taken = new Set([...overdue, ...dueToday].map((t) => t.id));
    return open.filter(
      (t) => (t.priority === 'critical' || t.priority === 'important') && !taken.has(t.id),
    );
  }, [open, overdue, dueToday]);

  const urgentCount = overdue.length + dueToday.length;

  // re-arm the confetti guard whenever urgent work appears again
  useEffect(() => {
    if (urgentCount > 0) celebratedRef.current = false;
  }, [urgentCount]);

  const groups: Group[] = [
    { key: 'overdue', label: 'Overdue', color: PRIORITY_META.critical.color, items: overdue },
    { key: 'due-today', label: 'Due Today', color: PRIORITY_META.normal.color, items: dueToday },
    { key: 'high', label: 'High Priority', color: PRIORITY_META.important.color, items: highPriority },
  ];

  const complete = (t: Task) => {
    const isLastUrgent = urgentCount === 1 && (isOverdue(t) || isDueToday(t));
    completeTask(t.id);
    toast.success(`Completed “${t.title}”`);
    if (isLastUrgent && !celebratedRef.current) {
      celebratedRef.current = true;
      if (confettiEnabled) {
        void confetti({ particleCount: 180, spread: 80, origin: { y: 0.6 } });
        toast.success('All clear for today! 🎉');
      }
    }
  };

  const snooze = (t: Task) => {
    if (!t.dueDate) return;
    updateTask(t.id, { dueDate: addDaysKey(t.dueDate, 1) });
    toast.success(`“${t.title}” snoozed to tomorrow`);
  };

  if (groups.every((g) => g.items.length === 0)) {
    return (
      <EmptyState
        icon={PartyPopper}
        title="Nothing due today 🎉"
        hint="No overdue work, nothing due today, and no high-priority items waiting. Enjoy the breathing room — or plan ahead on the board."
      />
    );
  }

  return (
    <div className="space-y-6">
      {groups
        .filter((g) => g.items.length > 0)
        .map((group) => (
          <GroupSection key={group.key} group={group}>
            {group.items.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/30 px-3 py-2 transition-colors hover:bg-muted/40"
              >
                <Checkbox
                  onCheckedChange={() => complete(t)}
                  aria-label={`Complete ${t.title}`}
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span style={{ color: PRIORITY_META[t.priority].color }}>
                      {PRIORITY_META[t.priority].label}
                    </span>
                    {t.dueDate && (
                      <span className={cn(isOverdue(t) && 'font-medium text-rose-400')}>
                        {fmtDayNum(t.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
                {isOverdue(t) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => snooze(t)}
                  >
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> Snooze
                  </Button>
                )}
              </div>
            ))}
          </GroupSection>
        ))}

      <p className="text-center text-[11px] text-muted-foreground">
        Completing the last overdue/today task fires a little celebration ✨ — recurring tasks respawn automatically.
      </p>
    </div>
  );
}
