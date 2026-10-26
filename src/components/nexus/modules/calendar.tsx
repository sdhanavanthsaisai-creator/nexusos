'use client';

import { useMemo, useState } from 'react';
import {
  BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Flame, Plus, Timer, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ModuleHeader } from '../ui-bits';
import { useNexus, useUI } from '@/lib/nexus/store';
import { EXAM_TYPE_META, PRIORITY_META } from '@/lib/nexus/constants';
import type { ExamEvent } from '@/lib/nexus/types';
import {
  addDays, dateKey, dayTotalMinutes, fmtDayFull, fmtMonthYear, minutesToLabel,
  parseKey, startOfWeek, todayKey, WEEKDAYS,
} from '@/lib/nexus/utils';

const EXAM_TYPES: ExamEvent['type'][] = ['exam', 'assignment', 'project', 'personal', 'dsa'];

export default function CalendarModule() {
  const tasks = useNexus((s) => s.tasks);
  const exams = useNexus((s) => s.exams);
  const sessions = useNexus((s) => s.sessions);
  const habits = useNexus((s) => s.habits);
  const habitRecords = useNexus((s) => s.habitRecords);
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const subjects = useNexus((s) => s.subjects);
  const completeTask = useNexus((s) => s.completeTask);
  const reopenTask = useNexus((s) => s.reopenTask);
  const deleteExam = useNexus((s) => s.deleteExam);
  const addExam = useNexus((s) => s.addExam);
  const setActiveModule = useUI((s) => s.setActiveModule);

  const today = todayKey();
  const [viewYearMonth, setViewYearMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState(today);
  const [examOpen, setExamOpen] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [examDate, setExamDate] = useState(today);
  const [examType, setExamType] = useState<ExamEvent['type']>('exam');
  const [examNotes, setExamNotes] = useState('');

  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);

  // ── Month matrix (6 rows × 7 cols, Monday start) ────────────────────────────
  const weeks = useMemo(() => {
    const first = new Date(viewYearMonth.y, viewYearMonth.m, 1);
    const start = startOfWeek(first);
    const rows: Date[][] = [];
    let cursor = start;
    for (let r = 0; r < 6; r++) {
      const row: Date[] = [];
      for (let c = 0; c < 7; c++) {
        row.push(cursor);
        cursor = addDays(cursor, 1);
      }
      rows.push(row);
    }
    return rows;
  }, [viewYearMonth]);

  // ── Per-day data maps for the visible month ─────────────────────────────────
  const monthData = useMemo(() => {
    const first = new Date(viewYearMonth.y, viewYearMonth.m, 1);
    const last = new Date(viewYearMonth.y, viewYearMonth.m + 1, 0);
    const lo = dateKey(startOfWeek(first));
    const hi = dateKey(addDays(startOfWeek(last), 6));

    const tasksByDate = new Map<string, typeof tasks>();
    for (const t of tasks) {
      if (!t.dueDate || t.dueDate < lo || t.dueDate > hi) continue;
      const list = tasksByDate.get(t.dueDate) ?? [];
      list.push(t);
      tasksByDate.set(t.dueDate, list);
    }
    const examsByDate = new Map<string, ExamEvent[]>();
    for (const e of exams) {
      if (e.date < lo || e.date > hi) continue;
      const list = examsByDate.get(e.date) ?? [];
      list.push(e);
      examsByDate.set(e.date, list);
    }
    const minutesByDate = new Map<string, number>();
    for (const [k, log] of Object.entries(dailyLogs)) {
      if (k < lo || k > hi) continue;
      const total = dayTotalMinutes(log);
      if (total > 0) minutesByDate.set(k, total);
    }
    const perfectHabitDays = new Set<string>();
    if (activeHabits.length > 0) {
      for (let d = parseKey(lo); dateKey(d) <= hi; d = addDays(d, 1)) {
        const key = dateKey(d);
        const allDone = activeHabits.every((h) => habitRecords[h.id]?.[key]);
        if (allDone) perfectHabitDays.add(key);
      }
    }
    return { tasksByDate, examsByDate, minutesByDate, perfectHabitDays };
  }, [viewYearMonth, tasks, exams, dailyLogs, habitRecords, activeHabits]);

  // ── Selected day details (read straight from the stores) ────────────────────
  const dayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate === selectedDay).sort((a, b) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0)),
    [tasks, selectedDay],
  );
  const dayExams = useMemo(() => exams.filter((e) => e.date === selectedDay), [exams, selectedDay]);
  const daySessions = useMemo(
    () => sessions.filter((s) => s.date === selectedDay).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [sessions, selectedDay],
  );
  const dayHabitsDone = useMemo(
    () => activeHabits.filter((h) => habitRecords[h.id]?.[selectedDay]),
    [activeHabits, habitRecords, selectedDay],
  );

  const navMonth = (delta: number) =>
    setViewYearMonth(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const goToday = () => {
    const d = new Date();
    setViewYearMonth({ y: d.getFullYear(), m: d.getMonth() });
    setSelectedDay(today);
  };

  const openExamDialog = () => {
    setExamDate(selectedDay);
    setExamTitle('');
    setExamNotes('');
    setExamType('exam');
    setExamOpen(true);
  };

  const saveExam = () => {
    if (!examTitle.trim() || !examDate) return;
    addExam({ title: examTitle.trim(), date: examDate, type: examType, notes: examNotes });
    toast.success(`"${examTitle.trim()}" added to ${fmtDayFull(examDate)}`);
    setExamOpen(false);
  };

  const itemsForDay = (key: string) => {
    const cellTasks = monthData.tasksByDate.get(key) ?? [];
    const cellExams = monthData.examsByDate.get(key) ?? [];
    const minutes = monthData.minutesByDate.get(key) ?? 0;
    const perfect = monthData.perfectHabitDays.has(key);
    const visibleTasks = cellTasks.slice(0, 3);
    const overflow = cellTasks.length - visibleTasks.length + Math.max(0, cellExams.length - 1);
    return { dayExams: cellExams, minutes, perfect, visibleTasks, overflow };
  };

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={CalendarDays}
        title="Unified Calendar"
        subtitle="Tasks · sessions · habits · exams in one timeline"
        actions={
          <>
            <span className="mr-1 hidden items-center gap-3 text-[11px] text-muted-foreground md:flex">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" />Tasks</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" />Exams</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" />Sessions</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Habit perfect</span>
            </span>
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openExamDialog}>
              <Plus className="h-3.5 w-3.5" /> Add event
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous month" onClick={() => navMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 min-w-24 px-3 text-xs" onClick={goToday}>
              {fmtMonthYear(new Date(viewYearMonth.y, viewYearMonth.m, 1))}
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next month" onClick={() => navMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ── Month grid ─────────────────────────────────────────────────── */}
        <section className="glass rounded-2xl p-3 sm:p-4 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight">{fmtMonthYear(new Date(viewYearMonth.y, viewYearMonth.m, 1))}</h3>
            <span className="text-[11px] text-muted-foreground">Click a day for details</span>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="hidden sm:inline">{w}</span>
                <span className="sm:hidden">{w[0]}</span>
              </div>
            ))}
            {weeks.flat().map((d) => {
              const key = dateKey(d);
              const inMonth = d.getMonth() === viewYearMonth.m;
              const isToday = key === today;
              const isSelected = key === selectedDay;
              const { dayExams: cellExams, minutes, perfect, visibleTasks, overflow } = itemsForDay(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(key)}
                  aria-label={`${fmtDayFull(key)} — open details`}
                  aria-current={isToday ? 'date' : undefined}
                  className={`flex min-h-20 flex-col gap-1 rounded-lg border border-border/50 p-1.5 text-left transition-colors hover:bg-muted/40 md:min-h-24 ${
                    inMonth ? '' : 'opacity-40'
                  } ${isToday ? 'ring-1 ring-primary bg-primary/5' : ''} ${isSelected && !isToday ? 'border-primary/60 bg-primary/[0.03]' : ''}`}
                >
                  <span className={`text-[11px] font-medium leading-none ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                    {d.getDate()}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    {visibleTasks.map((t) => {
                      const done = t.status === 'done';
                      return (
                        <span
                          key={t.id}
                          className={`flex items-center gap-1 truncate rounded px-1 py-px text-[10px] leading-tight ${done ? 'text-muted-foreground line-through' : ''}`}
                          style={{ background: `${PRIORITY_META[t.priority].color}22` }}
                        >
                          {done && <Check className="h-2.5 w-2.5 shrink-0 text-emerald-400" aria-hidden="true" />}
                          <span className="truncate">{t.title}</span>
                        </span>
                      );
                    })}
                    {cellExams.slice(0, 1).map((e) => {
                      const meta = EXAM_TYPE_META[e.type] ?? EXAM_TYPE_META.exam;
                      return (
                        <span
                          key={e.id}
                          className="flex items-center gap-1 truncate rounded px-1 py-px text-[10px] font-medium leading-tight"
                          style={{ background: `${meta.color}26`, color: meta.color }}
                        >
                          <BookOpen className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{e.title}</span>
                        </span>
                      );
                    })}
                    {minutes > 0 && (
                      <span className="flex items-center gap-1 truncate rounded border border-emerald-400/25 bg-emerald-400/15 px-1 py-px text-[10px] font-medium leading-tight text-emerald-400">
                        <Timer className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                        {minutesToLabel(minutes)}
                      </span>
                    )}
                    {perfect && (
                      <span className="flex items-center rounded px-1 py-px text-[10px] leading-tight text-amber-400">
                        <Flame className="h-2.5 w-2.5" aria-label="All habits done" />
                      </span>
                    )}
                    {overflow > 0 && (
                      <span className="truncate rounded px-1 text-[10px] font-medium leading-tight text-muted-foreground/80">
                        +{overflow} more
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Day details ────────────────────────────────────────────────── */}
        <section className="glass rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-tight">{fmtDayFull(selectedDay)}</h3>
            {selectedDay === today && (
              <Badge variant="outline" className="text-[10px] text-primary">Today</Badge>
            )}
          </div>

          <Separator className="my-3" />

          {/* Tasks */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tasks due</p>
            {dayTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground/70">Nothing due — enjoy the calm.</p>
            ) : (
              <ul className="space-y-1.5">
                {dayTasks.map((t) => {
                  const done = t.status === 'done';
                  return (
                    <li key={t.id} className="flex items-start gap-2 rounded-lg border border-border/50 px-2 py-1.5">
                      <Checkbox
                        className="mt-0.5"
                        checked={done}
                        onCheckedChange={(v) => (v ? completeTask(t.id) : reopenTask(t.id))}
                        aria-label={done ? `Reopen ${t.title}` : `Complete ${t.title}`}
                      />
                      <button type="button" onClick={() => setActiveModule('tasks')} className="min-w-0 flex-1 text-left">
                        <span className={`block truncate text-xs font-medium ${done ? 'text-muted-foreground line-through' : ''}`}>
                          {t.title}
                        </span>
                      </button>
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: PRIORITY_META[t.priority].color }} title={PRIORITY_META[t.priority].label} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Separator className="my-3" />

          {/* Exams */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Exams &amp; deadlines</p>
            {dayExams.length === 0 ? (
              <p className="text-xs text-muted-foreground/70">No events on this day.</p>
            ) : (
              <ul className="space-y-1.5">
                {dayExams.map((e) => {
                  const meta = EXAM_TYPE_META[e.type] ?? EXAM_TYPE_META.exam;
                  return (
                    <li key={e.id} className="flex items-center gap-2 rounded-lg border border-border/50 px-2 py-1.5">
                      <Badge variant="outline" className="shrink-0 border-transparent px-1.5 text-[10px]" style={{ background: `${meta.color}26`, color: meta.color }}>
                        {meta.label}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate text-xs font-medium">{e.title}</span>
                      <Button
                        variant="ghost" size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:bg-rose-400/10 hover:text-rose-400"
                        onClick={() => {
                          deleteExam(e.id);
                          toast.success('Event removed');
                        }}
                        aria-label={`Delete ${e.title}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Separator className="my-3" />

          {/* Sessions */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Study sessions</p>
            {daySessions.length === 0 ? (
              <p className="text-xs text-muted-foreground/70">No sessions logged.</p>
            ) : (
              <>
                <ul className="space-y-1.5">
                  {daySessions.map((s) => {
                    const subj = subjects.find((x) => x.id === s.subjectId);
                    return (
                      <li key={s.id} className="flex items-center gap-2 rounded-lg border border-border/50 px-2 py-1.5">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: subj?.color ?? '#94a3b8' }} aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium">{subj?.name ?? 'Deleted subject'}</span>
                        <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                          {s.startTime}–{s.endTime || '—'}
                        </span>
                        <Badge variant="outline" className="shrink-0 px-1.5 font-mono text-[10px] tabular-nums text-emerald-400">
                          {minutesToLabel(s.durationMin)}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
                <Button variant="ghost" size="sm" className="mt-2 h-7 gap-1.5 px-2 text-[11px] text-muted-foreground" onClick={() => setActiveModule('sessions')}>
                  <Timer className="h-3 w-3" /> Open Sessions
                </Button>
              </>
            )}
          </div>

          <Separator className="my-3" />

          {/* Habits */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Habits done</p>
            {dayHabitsDone.length === 0 ? (
              <p className="text-xs text-muted-foreground/70">No habits checked off this day.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {dayHabitsDone.map((h) => (
                  <span key={h.id} className="flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-[11px] font-medium">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: h.color }} aria-hidden="true" />
                    {h.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Add-event dialog ─────────────────────────────────────────────── */}
      <Dialog open={examOpen} onOpenChange={setExamOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add event</DialogTitle>
            <DialogDescription>Exams, assignments, project deadlines — anything with a date.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ev-title" className="text-xs">Title</Label>
              <Input
                id="ev-title" value={examTitle} onChange={(e) => setExamTitle(e.target.value)}
                placeholder="Linear Algebra midterm" className="text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ev-date" className="text-xs">Date</Label>
                <Input id="ev-date" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={examType} onValueChange={(v) => setExamType(v as ExamEvent['type'])}>
                  <SelectTrigger className="w-full text-sm" aria-label="Event type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: EXAM_TYPE_META[t].color }} />
                          {EXAM_TYPE_META[t].label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-notes" className="text-xs">Notes</Label>
              <Textarea
                id="ev-notes" value={examNotes} onChange={(e) => setExamNotes(e.target.value)}
                placeholder="Chapters 1–4, bring calculator…" className="min-h-16 resize-none text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setExamOpen(false)}>Cancel</Button>
            <Button onClick={saveExam} disabled={!examTitle.trim() || !examDate}>Add event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
