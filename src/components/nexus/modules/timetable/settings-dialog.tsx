'use client';

import { useRef, useState } from 'react';
import { Download, Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
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
import { useNexus } from '@/lib/nexus/store';
import {
  buildTimetableExport, eventsOutsideGrid,
  timetableColorOptions, validateTimetableSettings,
} from '@/lib/nexus/timetable';
import type { TimetableCategory, TimetableDay } from '@/lib/nexus/types';
import { downloadJSON, timeToMinutes, todayKey } from '@/lib/nexus/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TimetableSettingsDialog({ open, onOpenChange }: Props) {
  const days = useNexus((s) => s.timetable.days);
  const categories = useNexus((s) => s.timetable.categories);
  const events = useNexus((s) => s.timetable.events);
  const settings = useNexus((s) => s.timetable.settings);
  const updateSettings = useNexus((s) => s.updateTimetableSettings);
  const addDay = useNexus((s) => s.addTimetableDay);
  const addCategory = useNexus((s) => s.addTimetableCategory);
  const importTimetable = useNexus((s) => s.importTimetable);
  const resetTimetable = useNexus((s) => s.resetTimetable);

  const [dayStart, setDayStart] = useState(settings.dayStart);
  const [dayEnd, setDayEnd] = useState(settings.dayEnd);
  const [slotMinutes, setSlotMinutes] = useState(settings.slotMinutes);

  const [newDay, setNewDay] = useState('');
  const [newShort, setNewShort] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newColor, setNewColor] = useState('var(--ink-2)');

  const fileRef = useRef<HTMLInputElement>(null);

  const draft = { dayStart, dayEnd, slotMinutes };
  const baseError = validateTimetableSettings(draft);
  const outside = baseError ? [] : eventsOutsideGrid(events, draft);
  const gridError =
    baseError ??
    (outside.length
      ? `${outside.length} class${outside.length === 1 ? '' : 'es'} fall outside these hours (${outside
          .slice(0, 3)
          .map((e) => e.title)
          .join(', ')}${outside.length > 3 ? '…' : ''}). Move them first.`
      : null);
  const dirty =
    dayStart !== settings.dayStart || dayEnd !== settings.dayEnd || slotMinutes !== settings.slotMinutes;

  const applyGrid = () => {
    if (gridError) {
      toast.error(gridError);
      return;
    }
    updateSettings(draft);
    toast.success('Grid updated');
  };

  const submitDay = () => {
    const label = newDay.trim();
    if (!label || days.length >= 14) return;
    addDay(label, newShort.trim() || label.slice(0, 3));
    setNewDay('');
    setNewShort('');
    toast.success(`${label} added`);
  };

  const submitCategory = () => {
    const name = newCategory.trim();
    if (!name || categories.length >= 30) return;
    addCategory(name, newColor);
    setNewCategory('');
    toast.success(`${name} category added`);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const json: unknown = JSON.parse(text);
      const result = importTimetable(json);
      if (!result.ok) {
        toast.error(result.error ?? 'Import failed');
        return;
      }
      toast.success('Timetable imported');
      onOpenChange(false);
    } catch {
      toast.error('That file is not valid JSON.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const colors = timetableColorOptions();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="slim-scroll max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule settings</DialogTitle>
          <DialogDescription>
            Reshape the grid, manage days and categories, or back up your timetable.
          </DialogDescription>
        </DialogHeader>

        {/* ── Grid & slots ─────────────────────────────────────────────── */}
        <section className="mt-1 space-y-3 rounded-xl border border-border/60 bg-background/30 p-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Grid &amp; slots</h3>
            <p className="text-xs text-muted-foreground">When the week starts and ends, and how tall each row is.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="tt-day-start">Day starts</Label>
              <Input
                id="tt-day-start"
                type="time"
                step={300}
                value={dayStart}
                onChange={(e) => setDayStart(e.target.value)}
                className="text-xs tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tt-day-end">Day ends</Label>
              <Input
                id="tt-day-end"
                type="time"
                step={300}
                value={dayEnd}
                onChange={(e) => setDayEnd(e.target.value)}
                className="text-xs tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tt-slot-length">Slot length (minutes)</Label>
              <Input id="tt-slot-length" type="number" min={5} max={180} step={1} value={slotMinutes || ''} onChange={(e) => setSlotMinutes(Number(e.target.value))} className="text-xs" />
            </div>
          </div>
          {gridError ? (
            <p className="text-[11px] font-medium text-foreground" role="alert">{gridError}</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              {dayStart}–{dayEnd} · {Math.round((Math.max(0, timeToMinutes(dayEnd) - timeToMinutes(dayStart)) / 60) * 10) / 10} visible hours
            </p>
          )}
          <Button size="sm" onClick={applyGrid} disabled={!!gridError || !dirty}>
            Apply grid
          </Button>
        </section>

        {/* ── Days ─────────────────────────────────────────────────────── */}
        <section className="mt-3 space-y-3 rounded-xl border border-border/60 bg-background/30 p-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Days</h3>
            <p className="text-xs text-muted-foreground">
              Rename a column or remove a day. Removing a day also deletes its classes.
            </p>
          </div>
          <div className="space-y-2">
            {days.map((day) => (
              <DayRow
                key={day.id}
                day={day}
                count={events.filter((e) => e.dayId === day.id).length}
                canDelete={days.length > 1}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newDay}
              onChange={(e) => setNewDay(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitDay(); }}
              placeholder="New day (e.g. Sunday)"
              maxLength={40}
              className="text-xs"
              aria-label="New day name"
            />
            <Input
              value={newShort}
              onChange={(e) => setNewShort(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitDay(); }}
              placeholder="Sun"
              maxLength={8}
              className="text-xs sm:w-24"
              aria-label="New day short name"
            />
            <Button size="sm" variant="outline" className="gap-1.5" onClick={submitDay} disabled={!newDay.trim() || days.length >= 14}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add day
            </Button>
          </div>
        </section>

        {/* ── Categories ───────────────────────────────────────────────── */}
        <section className="mt-3 space-y-3 rounded-xl border border-border/60 bg-background/30 p-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Categories</h3>
            <p className="text-xs text-muted-foreground">
              Colour-code class types. Deleting a category moves its classes to another one.
            </p>
          </div>
          <div className="space-y-2">
            {categories.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                count={events.filter((e) => e.categoryId === cat.id).length}
                canDelete={categories.length > 1}
                fallbackName={categories.find((c) => c.id !== cat.id)?.name ?? '—'}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitCategory(); }}
              placeholder="New category (e.g. Seminar)"
              maxLength={40}
              className="text-xs"
              aria-label="New category name"
            />
            <Input type="color" aria-label="Custom new category colour" value={/^#[0-9a-f]{6}$/i.test(newColor) ? newColor : '#808080'} onChange={(e) => setNewColor(e.target.value)} className="h-9 w-14 p-1" />
            <Select value={newColor} onValueChange={setNewColor}>
              <SelectTrigger className="w-full text-xs sm:w-36" aria-label="New category colour">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colors.map((c) => (
                  <SelectItem key={c.color} value={c.color}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={submitCategory} disabled={!newCategory.trim() || categories.length >= 30}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add
            </Button>
          </div>
        </section>

        {/* ── Data ─────────────────────────────────────────────────────── */}
        <section className="mt-3 space-y-3 rounded-xl border border-border/60 bg-background/30 p-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Backup &amp; reset</h3>
            <p className="text-xs text-muted-foreground">
              Export the grid, days, categories and classes as JSON (import validates every field).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                downloadJSON(`nexusos-timetable-${todayKey()}`, buildTimetableExport({
                  days, categories, events, settings,
                }));
                toast.success('Timetable exported');
              }}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" /> Export JSON
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" aria-hidden="true" /> Import JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0])}
              aria-label="Import timetable JSON file"
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground">
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset to default
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset the timetable?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your days, categories and classes will be replaced with the default seed week.
                    Export a backup first if you want to keep this timetable.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      resetTimetable();
                      toast.success('Timetable reset to default');
                      onOpenChange(false);
                    }}
                  >
                    Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Everything here is saved locally (localStorage) and survives reloads.
          </p>
        </section>
      </DialogContent>
    </Dialog>
  );
}

// ─── Rows ─────────────────────────────────────────────────────────────────────
function DayRow({ day, count, canDelete }: { day: TimetableDay; count: number; canDelete: boolean }) {
  const updateDay = useNexus((s) => s.updateTimetableDay);
  const deleteDay = useNexus((s) => s.deleteTimetableDay);
  const [label, setLabel] = useState(day.label);
  const [short, setShort] = useState(day.short);

  const commit = () => {
    const nextLabel = label.trim() || day.label;
    const nextShort = (short.trim() || nextLabel.slice(0, 3)).slice(0, 8);
    setLabel(nextLabel);
    setShort(nextShort);
    if (nextLabel !== day.label || nextShort !== day.short) {
      updateDay(day.id, { label: nextLabel, short: nextShort });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        maxLength={40}
        className="min-w-[8rem] flex-1 text-xs"
        aria-label={`Rename ${day.label}`}
      />
      <Input
        value={short}
        onChange={(e) => setShort(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        maxLength={8}
        className="w-20 text-xs"
        aria-label={`Short name for ${day.label}`}
      />
      <span className="w-16 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
        {count} slot{count === 1 ? '' : 's'}
      </span>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            disabled={!canDelete}
            aria-label={`Remove ${day.label}`}
            title={canDelete ? `Remove ${day.label}` : 'Keep at least one day'}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {day.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {count > 0
                ? `${count} class${count === 1 ? '' : 'es'} on this day will be deleted too. This cannot be undone.`
                : 'This day has no classes. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteDay(day.id);
                toast.success(`${day.label} removed`);
              }}
            >
              Remove day
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CategoryRow({
  category, count, canDelete, fallbackName,
}: {
  category: TimetableCategory;
  count: number;
  canDelete: boolean;
  fallbackName: string;
}) {
  const updateCategory = useNexus((s) => s.updateTimetableCategory);
  const deleteCategory = useNexus((s) => s.deleteTimetableCategory);
  const [name, setName] = useState(category.name);
  const colors = timetableColorOptions();

  const commit = () => {
    const next = name.trim() || category.name;
    setName(next);
    if (next !== category.name) updateCategory(category.id, { name: next });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className="h-3 w-3 shrink-0 rounded-full ring-1 ring-border/60"
        style={{ backgroundColor: category.color }}
        aria-hidden="true"
      />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        maxLength={40}
        className="min-w-[7rem] flex-1 text-xs"
        aria-label={`Rename ${category.name} category`}
      />
      <Input type="color" aria-label={`Custom colour for ${category.name}`} value={/^#[0-9a-f]{6}$/i.test(category.color) ? category.color : '#808080'} onChange={(e) => updateCategory(category.id, { color: e.target.value })} className="h-9 w-14 p-1" />
      <Select value={category.color} onValueChange={(v) => updateCategory(category.id, { color: v })}>
        <SelectTrigger className="w-28 text-xs" aria-label={`Colour for ${category.name}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {colors.map((c) => (
            <SelectItem key={c.color} value={c.color}>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                {c.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="w-16 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
        {count} class{count === 1 ? '' : 'es'}
      </span>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            disabled={!canDelete}
            aria-label={`Remove ${category.name} category`}
            title={canDelete ? `Remove ${category.name}` : 'Keep at least one category'}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {category.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {count > 0
                ? `${count} class${count === 1 ? '' : 'es'} will move to “${fallbackName}”. This cannot be undone.`
                : 'No classes use this category. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteCategory(category.id);
                toast.success(`${category.name} removed`);
              }}
            >
              Remove category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
