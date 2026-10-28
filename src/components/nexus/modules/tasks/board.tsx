'use client';

import { useMemo, useRef, useState, type DragEvent } from 'react';
import { toast } from 'sonner';
import { AREA_META, PRIORITY_META, STATUS_META, STATUS_ORDER } from '@/lib/nexus/constants';
import { useNexus } from '@/lib/nexus/store';
import { fmtDayNum, isOverdue } from '@/lib/nexus/utils';
import type { ID, Task, TaskStatus } from '@/lib/nexus/types';
import { cn } from '@/lib/utils';

/** Priority rank first, then due date ascending (nulls last), then title. */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank ||
      (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31') ||
      a.title.localeCompare(b.title),
  );
}

interface BoardProps {
  tasks: Task[];
  onEdit: (id: ID) => void;
}

function TaskCard({ task, onEdit }: { task: Task; onEdit: (id: ID) => void }) {
  const skipClickRef = useRef(false);
  const isDone = task.status === 'done';
  const priority = PRIORITY_META[task.priority];
  const area = AREA_META[task.area];
  const overdue = isOverdue(task);
  const subDone = task.subtasks.filter((s) => s.done).length;
  const subTotal = task.subtasks.length;

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    skipClickRef.current = true;
  };

  const handleDragEnd = () => {
    // click may still fire after a tiny drag on some browsers — suppress it once
    setTimeout(() => {
      skipClickRef.current = false;
    }, 120);
  };

  const handleClick = () => {
    if (skipClickRef.current) return;
    onEdit(task.id);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit(task.id);
        }
      }}
      aria-label={`Task: ${task.title}`}
      className={cn(
        'glass cursor-grab rounded-xl p-3 transition-all hover:-translate-y-0.5 hover:glow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing',
        isDone && 'opacity-75',
      )}
    >
      <div className="flex items-start gap-1.5">
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: priority.color }}
          title={`${priority.label} priority`}
        />
        <p
          className={cn(
            'line-clamp-2 text-sm font-medium leading-snug',
            isDone && 'text-muted-foreground line-through',
          )}
        >
          {task.title}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className="rounded bg-foreground/[0.08] px-1.5 py-0.5 text-[10px] font-medium"
          style={{ color: area.color }}
        >
          {area.label}
        </span>
        {task.dueDate && (
          <span
            className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums', overdue ? 'bg-foreground/[0.08] text-foreground font-medium' : 'bg-muted text-muted-foreground')}
          >
            {fmtDayNum(task.dueDate)}
          </span>
        )}
      </div>

      {subTotal > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Subtasks</span>
            <span className="tabular-nums">
              {subDone}/{subTotal}
            </span>
          </div>
          <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.round((subDone / subTotal) * 100)}%`,
                backgroundColor: STATUS_META.done.color,
              }}
            />
          </div>
        </div>
      )}

      {task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function BoardView({ tasks, onEdit }: BoardProps) {
  const updateTask = useNexus((s) => s.updateTask);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  const byStatus = useMemo(() => {
    const sorted = sortTasks(tasks);
    const map = new Map<TaskStatus, Task[]>();
    for (const st of STATUS_ORDER) map.set(st, []);
    for (const t of sorted) map.get(t.status)?.push(t);
    return map;
  }, [tasks]);

  const handleDragOver = (e: DragEvent<HTMLElement>, st: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOver !== st) setDragOver(st);
  };

  const handleDragLeave = (e: DragEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(null);
  };

  const handleDrop = (e: DragEvent<HTMLElement>, st: TaskStatus) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === st) return;
    updateTask(id, { status: st });
    toast.success(`Moved to ${STATUS_META[st].label}`);
  };

  return (
    <div className="slim-scroll flex gap-3 overflow-x-auto pb-2">
      {STATUS_ORDER.map((st) => {
        const meta = STATUS_META[st];
        const list = byStatus.get(st) ?? [];
        return (
          <section
            key={st}
            onDragOver={(e) => handleDragOver(e, st)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, st)}
            className={cn(
              'flex min-w-[260px] flex-1 flex-col rounded-2xl border p-2 transition-colors',
              dragOver === st ? 'border-primary/50 bg-primary/5' : 'border-border/60 bg-muted/30',
            )}
            aria-label={`${meta.label} column`}
          >
            <header className="flex items-center gap-2 px-1 pb-2 pt-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
              <h3 className="text-xs font-semibold uppercase tracking-wider">{meta.label}</h3>
              <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                {list.length}
              </span>
            </header>

            <div className="flex min-h-[80px] flex-col gap-2">
              {list.map((t) => (
                <TaskCard key={t.id} task={t} onEdit={onEdit} />
              ))}
              {list.length === 0 && (
                <div className="flex h-24 flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 text-[11px] text-muted-foreground">
                  Drop tasks here
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
