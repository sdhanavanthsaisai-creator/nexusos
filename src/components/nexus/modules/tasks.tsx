'use client';

import { useEffect, useMemo, useState } from 'react';
import { ListChecks, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ModuleHeader, Segmented } from '../ui-bits';
import { useNexus } from '@/lib/nexus/store';
import { AREA_META, PRIORITY_META } from '@/lib/nexus/constants';
import { isOverdue } from '@/lib/nexus/utils';
import type { ID, TaskArea, TaskPriority } from '@/lib/nexus/types';
import TaskDialog from './tasks/task-dialog';
import { BoardView } from './tasks/board';
import { ListView } from './tasks/list';
import { CalendarView } from './tasks/calendar-view';
import { FocusView } from './tasks/focus';

type ViewKey = 'board' | 'list' | 'calendar' | 'focus';

const VIEWS: { value: ViewKey; label: string }[] = [
  { value: 'board', label: 'Board' },
  { value: 'list', label: 'List' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'focus', label: 'Focus Today' },
];

/** Phones default to List (density beats ceremony) — desktop opens on Board. */
const initialView = (): ViewKey =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 'list' : 'board';

const AREAS = Object.entries(AREA_META) as [TaskArea, { label: string; color: string }][];
const PRIORITIES = Object.entries(PRIORITY_META) as [TaskPriority, { label: string; color: string; rank: number }][];

export default function TasksModule() {
  const tasks = useNexus((s) => s.tasks);

  const [view, setView] = useState<ViewKey>(initialView);
  const [areaFilter, setAreaFilter] = useState<'all' | TaskArea>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<ID | null>(null);
  const [prefillDue, setPrefillDue] = useState<string | null>(null);

  const editingTask = useMemo(
    () => tasks.find((t) => t.id === editingId) ?? null,
    [tasks, editingId],
  );

  // ⌘K palette / "N" key dispatch this global event
  useEffect(() => {
    const onNewTask = () => {
      setEditingId(null);
      setPrefillDue(null);
      setDialogOpen(true);
    };
    window.addEventListener('nexus:new-task', onNewTask);
    return () => window.removeEventListener('nexus:new-task', onNewTask);
  }, []);

  const openCreate = (dueDate?: string | null) => {
    setEditingId(null);
    setPrefillDue(dueDate ?? null);
    setDialogOpen(true);
  };

  const openEdit = (id: ID) => {
    setEditingId(id);
    setPrefillDue(null);
    setDialogOpen(true);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter(
      (t) =>
        (areaFilter === 'all' || t.area === areaFilter) &&
        (priorityFilter === 'all' || t.priority === priorityFilter) &&
        (!q ||
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))),
    );
  }, [tasks, areaFilter, priorityFilter, search]);

  const openCount = useMemo(() => tasks.filter((t) => t.status !== 'done').length, [tasks]);
  const overdueCount = useMemo(() => tasks.filter(isOverdue).length, [tasks]);

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={ListChecks}
        title="Advanced Task Manager"
        subtitle={`${openCount} open · ${overdueCount} overdue · Kanban, list, calendar & focus`}
        actions={
          <Button onClick={() => openCreate()} className="gap-1.5">
            <Plus className="h-4 w-4" aria-hidden="true" /> New Task
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Segmented options={VIEWS} value={view} onChange={setView} />
        <Select value={areaFilter} onValueChange={(v) => setAreaFilter(v as 'all' | TaskArea)}>
          <SelectTrigger className="h-9 w-[130px] text-xs" aria-label="Filter by area">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All areas</SelectItem>
            {AREAS.map(([a, meta]) => (
              <SelectItem key={a} value={a}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                  {meta.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={priorityFilter}
          onValueChange={(v) => setPriorityFilter(v as 'all' | TaskPriority)}
        >
          <SelectTrigger className="h-9 w-[140px] text-xs" aria-label="Filter by priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map(([p, meta]) => (
              <SelectItem key={p} value={p}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                  {meta.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative min-w-[180px] flex-1 sm:max-w-64">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks & tags…"
            className="h-9 pl-8 text-xs"
            aria-label="Search tasks"
          />
        </div>
      </div>

      {/* Views */}
      {view === 'board' && <BoardView tasks={filtered} onEdit={openEdit} />}
      {view === 'list' && <ListView tasks={filtered} onEdit={openEdit} />}
      {view === 'calendar' && <CalendarView onEdit={openEdit} onAddOnDay={openCreate} />}
      {view === 'focus' && <FocusView />}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditingId(null);
        }}
        task={editingTask}
        defaultDueDate={prefillDue}
      />
    </div>
  );
}
