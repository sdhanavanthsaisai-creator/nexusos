'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { AREA_META, PRIORITY_META, STATUS_META, STATUS_ORDER } from '@/lib/nexus/constants';
import { useNexus } from '@/lib/nexus/store';
import { uid } from '@/lib/nexus/utils';
import type { Recurrence, Subtask, Task, TaskArea, TaskPriority, TaskStatus } from '@/lib/nexus/types';
import { cn } from '@/lib/utils';

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'No repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const AREAS = Object.entries(AREA_META) as [TaskArea, { label: string; color: string }][];
const PRIORITIES = Object.entries(PRIORITY_META) as [TaskPriority, { label: string; color: string; rank: number }][];

const numOrNull = (s: string): number | null => {
  const v = Number.parseFloat(s);
  return Number.isFinite(v) && v > 0 ? v : null;
};

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null; // null → create mode
  defaultDueDate?: string | null;
}

export default function TaskDialog(props: TaskDialogProps) {
  // remount the form whenever the dialog opens for a different task → fresh state, no sync effects
  const formKey = props.open ? `o-${props.task?.id ?? 'new'}-${props.defaultDueDate ?? ''}` : 'closed';
  return <TaskDialogInner key={formKey} {...props} />;
}

function TaskDialogInner({ open, onOpenChange, task, defaultDueDate = null }: TaskDialogProps) {
  const addTask = useNexus((s) => s.addTask);
  const updateTask = useNexus((s) => s.updateTask);
  const deleteTask = useNexus((s) => s.deleteTask);

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'inbox');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'normal');
  const [area, setArea] = useState<TaskArea>(task?.area ?? 'college');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? defaultDueDate ?? '');
  const [startDate, setStartDate] = useState(task?.startDate ?? '');
  const [estimatedHours, setEstimatedHours] = useState(task?.estimatedHours != null ? String(task.estimatedHours) : '');
  const [actualHours, setActualHours] = useState(task?.actualHours != null ? String(task.actualHours) : '');
  const [recurrence, setRecurrence] = useState<Recurrence>(task?.recurrence ?? 'none');
  const [tags, setTags] = useState(task?.tags.join(', ') ?? '');
  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks.map((st) => ({ ...st })) ?? []);
  const [newSub, setNewSub] = useState('');

  const addSub = () => {
    const v = newSub.trim();
    if (!v) return;
    setSubtasks((prev) => [...prev, { id: uid(), title: v, done: false }]);
    setNewSub('');
  };

  const save = () => {
    const t = title.trim();
    if (!t) {
      toast.error('Title is required');
      return;
    }
    const payload = {
      title: t,
      description: description.trim(),
      status,
      priority,
      area,
      dueDate: dueDate || null,
      startDate: startDate || null,
      estimatedHours: numOrNull(estimatedHours),
      actualHours: numOrNull(actualHours),
      recurrence,
      tags: tags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      subtasks,
    };
    if (task) {
      updateTask(task.id, payload);
      toast.success('Task updated');
    } else {
      addTask(payload);
      toast.success('Task created');
    }
    onOpenChange(false);
  };

  const removeTask = () => {
    if (!task) return;
    deleteTask(task.id);
    toast.success('Task deleted');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="slim-scroll max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit task' : 'New task'}</DialogTitle>
          <DialogDescription>
            {task ? 'Update details, subtasks or scheduling.' : 'Capture it now — organise it on the board later.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Finish maths tutorial sheet 5"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes, links, acceptance criteria…"
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger className="w-full text-xs" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_META[s].color }} />
                        {STATUS_META[s].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger className="w-full text-xs" aria-label="Priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
            </div>
            <div className="space-y-1.5">
              <Label>Area</Label>
              <Select value={area} onValueChange={(v) => setArea(v as TaskArea)}>
                <SelectTrigger className="w-full text-xs" aria-label="Area">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-start">Start date</Label>
              <Input
                id="task-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-est">Est. hours</Label>
              <Input
                id="task-est"
                type="number"
                step="0.5"
                min="0"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="—"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-actual">Actual hours</Label>
              <Input
                id="task-actual"
                type="number"
                step="0.5"
                min="0"
                value={actualHours}
                onChange={(e) => setActualHours(e.target.value)}
                placeholder="—"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Repeat</Label>
              <Select value={recurrence} onValueChange={(v) => setRecurrence(v as Recurrence)}>
                <SelectTrigger className="w-full text-xs" aria-label="Recurrence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-tags">Tags</Label>
            <Input
              id="task-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="exam, revision, group-project"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Subtasks{' '}
              {subtasks.length > 0 && (
                <span className="text-muted-foreground">
                  ({subtasks.filter((s) => s.done).length}/{subtasks.length} done)
                </span>
              )}
            </Label>
            <div className="space-y-1.5">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-2.5 py-1.5"
                >
                  <Checkbox
                    checked={st.done}
                    onCheckedChange={() =>
                      setSubtasks((prev) => prev.map((x) => (x.id === st.id ? { ...x, done: !x.done } : x)))
                    }
                    aria-label={`Toggle subtask ${st.title}`}
                  />
                  <span className={cn('flex-1 text-xs', st.done && 'text-muted-foreground line-through')}>
                    {st.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSubtasks((prev) => prev.filter((x) => x.id !== st.id))}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    aria-label={`Delete subtask ${st.title}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newSub}
                  onChange={(e) => setNewSub(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSub();
                    }
                  }}
                  placeholder="Add subtask…"
                  className="h-8 flex-1 text-xs"
                />
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1 px-2.5" onClick={addSub}>
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          {task ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                  <AlertDialogDescription>
                    “{task.title}” will be permanently removed. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={removeTask}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save}>{task ? 'Save changes' : 'Create task'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
