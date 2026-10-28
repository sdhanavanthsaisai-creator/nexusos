'use client';

// ─── Kanban board — touch-first drag & drop (mobile baseline) ────────────────
// dnd-kit PointerSensor with `distance: 8` so vertical page scrolling still
// works on touch. Every card also ships a guaranteed fallback: long-press (or
// the ⋯ button) opens a "Move to…" action sheet listing all columns — no DnD
// gesture required. Desktop still works the same (HTML5-free pointer drag).

import { useMemo, useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { toast } from 'sonner';
import { ArrowRightLeft, GripVertical } from 'lucide-react';
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

// ─── Task card (draggable) ────────────────────────────────────────────────────

function TaskCard({
  task,
  onEdit,
  onMoveRequest,
  isOverlay = false,
}: {
  task: Task;
  onEdit?: (id: ID) => void;
  onMoveRequest?: (task: Task) => void;
  isOverlay?: boolean;
}) {
  const isDone = task.status === 'done';
  const priority = PRIORITY_META[task.priority];
  const area = AREA_META[task.area];
  const overdue = isOverdue(task);
  const subDone = task.subtasks.filter((s) => s.done).length;
  const subTotal = task.subtasks.length;

  // Long-press → "Move to…" (guaranteed fallback on touch).
  // `firedRef` suppresses the synthetic click that follows the long-press so
  // the editor dialog doesn't also open.
  const lpRef = useRef<{ timer: number; x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const clearLongPress = () => {
    if (lpRef.current) {
      window.clearTimeout(lpRef.current.timer);
      lpRef.current = null;
    }
  };

  useEffect(() => clearLongPress, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onMoveRequest || e.pointerType === 'mouse') return;
    const { clientX, clientY } = e;
    lpRef.current = {
      timer: window.setTimeout(() => {
        lpRef.current = null;
        firedRef.current = true;
        navigator.vibrate?.(24);
        onMoveRequest(task);
      }, 520),
      x: clientX,
      y: clientY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // cancel the long-press once the finger moves enough to start a drag/scroll
    if (!lpRef.current) return;
    if (Math.hypot(e.clientX - lpRef.current.x, e.clientY - lpRef.current.y) > 10) clearLongPress();
  };

  const handleClick = () => {
    if (firedRef.current) {
      firedRef.current = false;
      return; // long-press already opened "Move to…"
    }
    onEdit?.(task.id);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearLongPress}
      onPointerCancel={clearLongPress}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit?.(task.id);
        }
      }}
      aria-label={`Task: ${task.title}`}
      className={cn(
        'glass touch-pan-y group/card cursor-grab rounded-xl p-3 outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring',
        !isOverlay && 'transition-all hover:-translate-y-0.5 hover:glow-soft',
        isDone && 'opacity-70',
        isOverlay && 'rotate-2 shadow-2xl ring-1 ring-primary/40',
      )}
    >
      <div className="flex items-start gap-1.5">
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: priority.color }}
          title={`${priority.label} priority`}
        />
        <TaskTitle title={task.title} isDone={isDone} />
        {onMoveRequest && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveRequest(task);
            }}
            aria-label={`Move "${task.title}" to another column`}
            className="-mt-1 -mr-1 ml-auto flex h-11 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-accent md:hidden"
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
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
            className={cn(
              'rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
              overdue ? 'bg-foreground/[0.16] text-foreground font-bold' : 'bg-muted text-muted-foreground',
            )}
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
              style={{ width: `${Math.round((subDone / subTotal) * 100)}%`, backgroundColor: STATUS_META.done.color }}
            />
          </div>
        </div>
      )}

      {task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Title clamped to 3 lines with a "more / less" expansion toggle (spec #6). */
function TaskTitle({ title, isDone }: { title: string; isDone: boolean }) {
  const needsClamp = title.length > 120 || /[\n]/.test(title.slice(0, 110) + title.slice(110));
  const [expanded, setExpanded] = useState(false);
  if (!needsClamp) {
    return (
      <p className={cn('text-sm leading-snug font-medium', isDone && 'text-muted-foreground line-through')}>
        {title}
      </p>
    );
  }
  return (
    <div className="min-w-0 flex-1">
      <p
        className={cn(
          'text-sm leading-snug font-medium',
          !expanded && 'line-clamp-3',
          isDone && 'text-muted-foreground line-through',
        )}
      >
        {title}
      </p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((v) => !v);
        }}
        className="mt-0.5 text-[10px] font-semibold text-muted-foreground underline decoration-dotted underline-offset-2"
        aria-expanded={expanded}
      >
        {expanded ? 'less' : 'more'}
      </button>
    </div>
  );
}

// ─── Column (droppable) ───────────────────────────────────────────────────────

function Column({
  status,
  tasks,
  onEdit,
  onMoveRequest,
}: {
  status: TaskStatus;
  tasks: Task[];
  onEdit: (id: ID) => void;
  onMoveRequest: (task: Task) => void;
}) {
  const meta = STATUS_META[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'flex min-w-[260px] flex-1 flex-col rounded-2xl border p-2 transition-colors md:min-w-0',
        isOver ? 'border-primary/60 bg-primary/10' : 'border-border/60 bg-muted/25',
      )}
      aria-label={`${meta.label} column — ${tasks.length} tasks`}
    >
      <header className="flex items-center gap-2 px-1 pb-2 pt-1">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
        <h3 className="text-xs font-semibold tracking-wider uppercase">{meta.label}</h3>
        <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
          {tasks.length}
        </span>
      </header>

      <div className="flex min-h-[80px] flex-col gap-2">
        {tasks.map((t) => (
          <DraggableCard key={t.id} task={t} onEdit={onEdit} onMoveRequest={onMoveRequest} />
        ))}
        {tasks.length === 0 && (
          <div
            className={cn(
              'flex flex-1 items-center justify-center rounded-xl border border-dashed px-2 py-4 text-center text-[11px] text-muted-foreground',
              isOver ? 'border-primary/60 text-foreground' : 'border-border/60',
            )}
          >
            {isOver ? 'Drop task here' : 'No tasks here'}
          </div>
        )}
      </div>
    </section>
  );
}

function DraggableCard({
  task,
  onEdit,
  onMoveRequest,
}: {
  task: Task;
  onEdit: (id: ID) => void;
  onMoveRequest: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { status: task.status },
  });

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      <div className={cn(isDragging && 'opacity-40')}>
        <TaskCard task={task} onEdit={onEdit} onMoveRequest={onMoveRequest} />
      </div>
    </div>
  );
}

// ─── "Move to…" action sheet (fallback + long-press) ─────────────────────────

function MoveToSheet({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const updateTask = useNexus((s) => s.updateTask);
  if (!task) return null;

  const move = (st: TaskStatus) => {
    if (task.status !== st) {
      updateTask(task.id, { status: st });
      toast.success(`Moved to ${STATUS_META[st].label}`);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[2px]"
        aria-hidden="true"
      />
      <motion.div
        role="dialog"
        aria-label={`Move "${task.title}" — choose a column`}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        className="glass-strong fixed inset-x-0 bottom-0 z-[60] rounded-t-3xl pb-[max(env(safe-area-inset-bottom,0px),0.75rem)] pt-3 animate-sheet-up sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[380px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:px-4 sm:pb-4"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-foreground/25 sm:hidden" aria-hidden="true" />
        <p className="truncate px-4 pb-1 text-sm font-bold text-gradient">Move “{task.title}”</p>
        <p className="px-4 pb-2 text-[11px] text-muted-foreground">Long-press any card to reopen this.</p>
        <div className="grid grid-cols-1 gap-2 px-3">
          {STATUS_ORDER.map((st) => {
            const meta = STATUS_META[st];
            const current = task.status === st;
            return (
              <motion.button
                key={st}
                type="button"
                onClick={() => move(st)}
                disabled={current}
                whileTap={{ scale: current ? 1 : 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                className={cn(
                  'flex min-h-[48px] w-full touch-manipulation items-center gap-3 rounded-2xl px-4 py-2.5 text-left transition-colors',
                  current ? 'cursor-default bg-muted/60 opacity-70' : 'glass active:bg-accent',
                )}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.08]"
                  style={{ color: meta.color }}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{meta.label}</span>
                {current ? (
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">here</span>
                ) : (
                  <ArrowRightLeft className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Board view ──────────────────────────────────────────────────────────────

export function BoardView({ tasks, onEdit }: { tasks: Task[]; onEdit: (id: ID) => void }) {
  const updateTask = useNexus((s) => s.updateTask);
  const [moveFor, setMoveFor] = useState<Task | null>(null);
  const [activeId, setActiveId] = useState<ID | null>(null);

  // 8px activation keeps vertical page scrolling usable on touch screens.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const byStatus = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    for (const st of STATUS_ORDER) map.set(st, sortTasks(tasks.filter((t) => t.status === st)));
    return map;
  }, [tasks]);

  const activeTask = useMemo(() => tasks.find((t) => t.id === activeId) ?? null, [tasks, activeId]);
  const liveTasks = useMemo(() => tasks.filter((t) => t.id !== activeId), [tasks, activeId]);

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = ({ active: a, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    const status = String(over.id) as TaskStatus;
    if (!STATUS_ORDER.includes(status)) return;
    const id = String(a.id);
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === status) return;
    updateTask(id, { status });
    toast.success(`Moved to ${STATUS_META[status].label}`);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex flex-col gap-3 pb-2 slim-scroll md:flex-row md:gap-3 md:overflow-x-auto">
        {STATUS_ORDER.map((st) => (
          <Column
            key={st}
            status={st}
            tasks={byStatus.get(st) ?? []}
            onEdit={onEdit}
            onMoveRequest={setMoveFor}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.22,1,0.36,1)' }}>
        {activeTask && <TaskCard task={activeTask} isOverlay />}
      </DragOverlay>

      <MoveToSheet task={moveFor} onClose={() => setMoveFor(null)} />
    </DndContext>
  );
}

export { TaskCard as TaskBoardCard };
