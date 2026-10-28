'use client';

import { useState } from 'react';
import { Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TIMETABLE_STATUS_META } from '@/lib/nexus/constants';
import { useNexus } from '@/lib/nexus/store';
import {
  TIMETABLE_STATUSES, fmtTimeRange, hasErrors, minutesLabel,
  validateTimetableEvent, type TimetableErrors,
} from '@/lib/nexus/timetable';
import type { TimetableEvent, TimetableStatus } from '@/lib/nexus/types';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: TimetableEvent | null;
  defaults: { dayId: string; start: string; end: string };
}

export default function TimetableEventDialog(props: Props) {
  // Remount per event so the form always starts from the persisted values.
  const key = `${props.event?.id ?? 'new'}-${props.defaults.dayId}-${props.defaults.start}`;
  return <TimetableEventDialogInner key={key} {...props} />;
}

function TimetableEventDialogInner({ open, onOpenChange, event, defaults }: Props) {
  const days = useNexus((s) => s.timetable.days);
  const categories = useNexus((s) => s.timetable.categories);
  const events = useNexus((s) => s.timetable.events);
  const settings = useNexus((s) => s.timetable.settings);
  const addEvent = useNexus((s) => s.addTimetableEvent);
  const updateEvent = useNexus((s) => s.updateTimetableEvent);
  const deleteEvent = useNexus((s) => s.deleteTimetableEvent);

  const [title, setTitle] = useState(event?.title ?? '');
  const [dayId, setDayId] = useState(event?.dayId ?? defaults.dayId ?? days[0]?.id ?? '');
  const [start, setStart] = useState(event?.start ?? defaults.start);
  const [end, setEnd] = useState(event?.end ?? defaults.end);
  const [categoryId, setCategoryId] = useState(event?.categoryId ?? categories[0]?.id ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [status, setStatus] = useState<TimetableStatus>(event?.status ?? 'scheduled');
  const [submitted, setSubmitted] = useState(false);

  const errors: TimetableErrors = validateTimetableEvent(
    { title, dayId, start, end, categoryId, status },
    { days, categories, events, settings, selfId: event?.id },
  );

  const showError = (field: keyof TimetableErrors) => (submitted || field !== 'title') && errors[field];

  const save = () => {
    setSubmitted(true);
    if (hasErrors(errors)) {
      toast.error(Object.values(errors)[0] ?? 'Fix the highlighted fields');
      return;
    }
    const payload = {
      title: title.trim(),
      dayId,
      start,
      end,
      categoryId,
      location: location.trim(),
      description: description.trim(),
      status,
    };
    if (event) {
      updateEvent(event.id, payload);
      toast.success('Class updated');
    } else {
      addEvent(payload);
      toast.success('Class added to the timetable');
    }
    onOpenChange(false);
  };

  const remove = () => {
    if (!event) return;
    deleteEvent(event.id);
    toast.success('Class removed');
    onOpenChange(false);
  };

  const duration = minutesLabel(start, end);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="slim-scroll max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit class' : 'New class'}</DialogTitle>
          <DialogDescription>
            Recurs every week — status applies to the recurring slot. Changes persist on this device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="tt-title">Title *</Label>
            <Input
              id="tt-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Maths — Calculus I"
              maxLength={80}
              aria-invalid={!!errors.title}
              className={cn(showError('title') && 'border-foreground/60')}
              autoFocus
            />
            {showError('title') && <p className="text-[11px] font-medium text-foreground">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Day</Label>
              <Select value={dayId} onValueChange={setDayId}>
                <SelectTrigger className="w-full text-xs" aria-label="Day">
                  <SelectValue placeholder="Pick a day" />
                </SelectTrigger>
                <SelectContent>
                  {days.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showError('dayId') && <p className="text-[11px] font-medium text-foreground">{errors.dayId}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TimetableStatus)}>
                <SelectTrigger className="w-full text-xs" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMETABLE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {TIMETABLE_STATUS_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tt-start">Start *</Label>
              <Input
                id="tt-start"
                type="time"
                step={300}
                value={start}
                onChange={(e) => setStart(e.target.value)}
                aria-invalid={!!errors.start}
                className={cn('text-xs tabular-nums', showError('start') && 'border-foreground/60')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tt-end">End *</Label>
              <Input
                id="tt-end"
                type="time"
                step={300}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                aria-invalid={!!errors.end}
                className={cn('text-xs tabular-nums', showError('end') && 'border-foreground/60')}
              />
            </div>
          </div>
          <div className="-mt-1.5 flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
            <span>
              {fmtTimeRange(start, end)} · {duration}
              {settings.dayStart && settings.dayEnd ? ` (grid ${settings.dayStart}–${settings.dayEnd})` : ''}
            </span>
          </div>
          {(showError('start') || showError('end')) && (
            <p className="text-[11px] font-medium text-foreground" role="alert">
              {errors.start ?? errors.end}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full text-xs" aria-label="Category">
                  <SelectValue placeholder="Pick a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showError('categoryId') && <p className="text-[11px] font-medium text-foreground">{errors.categoryId}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tt-location">Location</Label>
              <Input
                id="tt-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Room, lab, online…"
                maxLength={80}
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tt-desc">Description</Label>
            <Textarea
              id="tt-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What to bring, topics covered, links…"
              maxLength={500}
              rows={3}
              className="resize-none text-xs"
            />
          </div>

          <p className="text-[11px] text-muted-foreground">{TIMETABLE_STATUS_META[status].hint}</p>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          {event ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this class?</AlertDialogTitle>
                  <AlertDialogDescription>
                    “{event.title}” will be removed from {days.find((d) => d.id === event.dayId)?.label ?? 'the timetable'}.
                    This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save}>
              {event ? 'Save changes' : 'Add class'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
