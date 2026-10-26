'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { StarRating } from '../../ui-bits';
import { useNexus } from '@/lib/nexus/store';
import { CATEGORY_META } from '@/lib/nexus/constants';
import type { StudySession } from '@/lib/nexus/types';
import { minutesToLabel, timeToMinutes, todayKey } from '@/lib/nexus/utils';

export interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set the dialog edits this session instead of creating one. */
  session?: StudySession | null;
}

export default function SessionDialog({ open, onOpenChange, session }: SessionDialogProps) {
  const subjects = useNexus((s) => s.subjects);
  const addSession = useNexus((s) => s.addSession);
  const updateSession = useNexus((s) => s.updateSession);
  const setDayMinutes = useNexus((s) => s.setDayMinutes);

  const [date, setDate] = useState(session?.date ?? todayKey());
  const [startTime, setStartTime] = useState(session?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(session?.endTime ?? '10:00');
  const [subjectId, setSubjectId] = useState(session?.subjectId ?? subjects[0]?.id ?? '');
  const [concentration, setConcentration] = useState(session?.concentration ?? 3);
  const [energy, setEnergy] = useState(session?.energy ?? 3);
  const [tagsInput, setTagsInput] = useState(session?.tags.join(', ') ?? '');
  const [notes, setNotes] = useState(session?.notes ?? '');

  const today = todayKey();
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const duration = endMin - startMin;
  const invalidTime = duration <= 0;
  const futureDate = date > today;
  const canSave = !invalidTime && !futureDate && !!date && !!subjectId;

  const grouped = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string }[]>();
    for (const s of subjects) {
      const key = CATEGORY_META[s.category].label;
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [subjects]);

  const save = () => {
    if (!canSave) return;
    const subject = subjects.find((s) => s.id === subjectId);
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);

    if (session) {
      // keep daily-log minutes in sync with the edited session
      const oldLog = useNexus.getState().dailyLogs[session.date];
      if (oldLog) {
        const oldForSubject = oldLog.minutes[session.subjectId] ?? 0;
        setDayMinutes(session.date, session.subjectId, Math.max(0, oldForSubject - session.durationMin));
      }
      updateSession(session.id, {
        date, startTime, endTime, subjectId,
        category: subject?.category ?? session.category,
        durationMin: duration, concentration, energy, tags, notes,
      });
      const newLog = useNexus.getState().dailyLogs[date];
      setDayMinutes(date, subjectId, (newLog?.minutes?.[subjectId] ?? 0) + duration);
    } else {
      addSession({
        subjectId, date, startTime, endTime, durationMin: duration,
        concentration, energy, tags, notes,
      });
      toast.success(`Session logged · ${minutesToLabel(duration)} on ${subject?.name ?? 'subject'}`);
    }

    if (session) toast.success('Session updated');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{session ? 'Edit session' : 'Log a session'}</DialogTitle>
          <DialogDescription>
            {session ? 'Adjust the details below — daily totals stay in sync.' : 'A precise record beats a vague one. Future dates are not allowed.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="sd-date" className="text-xs">Date</Label>
            <Input
              id="sd-date" type="date" value={date} max={today}
              onChange={(e) => setDate(e.target.value)}
              aria-invalid={futureDate}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sd-start" className="text-xs">Start</Label>
            <Input id="sd-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="font-mono text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sd-end" className="text-xs">End</Label>
            <Input id="sd-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="font-mono text-sm" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/30 px-3 py-2">
          <span className="text-xs text-muted-foreground">Duration (computed)</span>
          {invalidTime ? (
            <span className="text-xs font-medium text-rose-400">End must be after start</span>
          ) : (
            <span className="font-mono text-sm font-semibold tabular-nums text-emerald-400">{minutesToLabel(duration)}</span>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Subject</Label>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="w-full text-sm" aria-label="Session subject">
              <SelectValue placeholder="Pick a subject" />
            </SelectTrigger>
            <SelectContent>
              {grouped.map(([label, items]) => (
                <SelectGroup key={label}>
                  <SelectLabel>{label}</SelectLabel>
                  {items.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Concentration</Label>
            <StarRating value={concentration} onChange={setConcentration} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Energy</Label>
            <StarRating value={energy} onChange={setEnergy} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sd-tags" className="text-xs">Tags <span className="text-muted-foreground">(comma separated)</span></Label>
          <Input id="sd-tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="deep-work, past-papers" className="text-sm" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sd-notes" className="text-xs">Notes</Label>
          <Textarea id="sd-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you cover?" className="min-h-16 resize-none text-sm" />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={!canSave}>{session ? 'Save changes' : 'Log session'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
