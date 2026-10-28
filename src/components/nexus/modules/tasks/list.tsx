'use client';

import { useMemo, useState } from 'react';
import { ClipboardList, Trash2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '../../ui-bits';
import { AREA_META, PRIORITY_META, STATUS_META, STATUS_ORDER } from '@/lib/nexus/constants';
import { useNexus } from '@/lib/nexus/store';
import { fmtDayNum, isOverdue } from '@/lib/nexus/utils';
import type { ID, Task, TaskPriority, TaskStatus } from '@/lib/nexus/types';
import { cn } from '@/lib/utils';
import { sortTasks } from './board';

interface ListProps {
  tasks: Task[];
  onEdit: (id: ID) => void;
}

const PRIORITIES = Object.entries(PRIORITY_META) as [TaskPriority, { label: string; color: string; rank: number }][];

export function ListView({ tasks, onEdit }: ListProps) {
  const bulkUpdateTasks = useNexus((s) => s.bulkUpdateTasks);
  const bulkDeleteTasks = useNexus((s) => s.bulkDeleteTasks);
  const [selected, setSelected] = useState<ID[]>([]);

  const sorted = useMemo(() => sortTasks(tasks), [tasks]);

  const toggle = (id: ID) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const clearSelection = () => setSelected([]);

  const bulkStatus = (st: TaskStatus) => {
    bulkUpdateTasks(selected, { status: st });
    toast.success(`${selected.length} task${selected.length > 1 ? 's' : ''} → ${STATUS_META[st].label}`);
    clearSelection();
  };

  const bulkPriority = (p: TaskPriority) => {
    bulkUpdateTasks(selected, { priority: p });
    toast.success(`Priority → ${PRIORITY_META[p].label}`);
    clearSelection();
  };

  const bulkDelete = () => {
    const n = selected.length;
    bulkDeleteTasks(selected);
    toast.success(`Deleted ${n} task${n > 1 ? 's' : ''}`);
    clearSelection();
  };

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No tasks match your filters"
        hint="Try clearing the search or filters — or create a new task."
      />
    );
  }

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="glass flex flex-wrap items-center gap-2 rounded-2xl p-3">
          <span className="text-xs font-semibold text-foreground">{selected.length} selected</span>
          <Select onValueChange={(v) => bulkStatus(v as TaskStatus)}>
            <SelectTrigger size="sm" className="w-[130px] text-xs" aria-label="Bulk set status">
              <SelectValue placeholder="Set status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={(v) => bulkPriority(v as TaskPriority)}>
            <SelectTrigger size="sm" className="w-[140px] text-xs" aria-label="Bulk set priority">
              <SelectValue placeholder="Set priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map(([p, meta]) => (
                <SelectItem key={p} value={p}>
                  {meta.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1.5">
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selected.length} task{selected.length > 1 ? 's' : ''}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Selected tasks will be permanently removed. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={bulkDelete}
                  className="bg-destructive text-background hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-xs text-muted-foreground"
            onClick={clearSelection}
          >
            Clear
          </Button>
        </div>
      )}

      <div className="glass divide-y divide-border/60 overflow-hidden rounded-2xl">
        {sorted.map((t) => {
          const overdue = isOverdue(t);
          const priority = PRIORITY_META[t.priority];
          const area = AREA_META[t.area];
          const status = STATUS_META[t.status];
          const subDone = t.subtasks.filter((s) => s.done).length;
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => onEdit(t.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onEdit(t.id);
                }
              }}
              className={cn(
                'flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                overdue && 'border-l-2 border-l-foreground',
              )}
            >
              <span onClick={(e) => e.stopPropagation()} className="flex items-center">
                <Checkbox
                  checked={selected.includes(t.id)}
                  onCheckedChange={() => toggle(t.id)}
                  aria-label={`Select ${t.title}`}
                />
              </span>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: priority.color }}
                title={`${priority.label} priority`}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'truncate text-sm font-medium',
                    t.status === 'done' && 'text-muted-foreground line-through',
                  )}
                >
                  {t.title}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span style={{ color: area.color }}>{area.label}</span>
                  {t.dueDate && (
                    <span className={cn('tabular-nums', overdue && 'font-medium text-foreground')}>
                      {fmtDayNum(t.dueDate)}
                    </span>
                  )}
                  {t.subtasks.length > 0 && (
                    <span className="tabular-nums">
                      ☑ {subDone}/{t.subtasks.length}
                    </span>
                  )}
                  {t.tags.slice(0, 2).map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              </div>
              <Badge
                variant="outline"
                className="hidden shrink-0 border-foreground/25 sm:inline-flex"
                style={{ color: status.color }}
              >
                {status.label}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
