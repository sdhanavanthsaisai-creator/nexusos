'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock, ListChecks, Pause, Pencil, Play, Plus, Square, Star, Timer, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { EmptyState, KpiCard, ModuleHeader, RingProgress, Segmented, StarRating } from '../ui-bits';
import SessionDialog from './sessions/session-dialog';
import { useNexus, useUI, useTimerTick } from '@/lib/nexus/store';
import { CATEGORY_META } from '@/lib/nexus/constants';
import type { StudySession, SubjectCategory } from '@/lib/nexus/types';
import {
  addDays, addDaysKey, avg, dayTotalMinutes, eachDayKeys, fmtDayFull, minutesToHM,
  minutesToLabel, secondsToClock, startOfWeek, sum, todayKey,
} from '@/lib/nexus/utils';

const RING_MINUTES = 50; // timer ring reference

type PeriodKey = '7' | '30' | 'all';

export default function SessionsModule() {
  const subjects = useNexus((s) => s.subjects);
  const sessions = useNexus((s) => s.sessions);
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const profile = useNexus((s) => s.profile);
  const deleteSession = useNexus((s) => s.deleteSession);
  const timer = useUI((s) => s.timer);
  const now = useTimerTick(timer.running);

  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StudySession | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState<PeriodKey>('7');

  const effectiveSubject = subjectId ?? timer.subjectId ?? subjects[0]?.id ?? null;
  const inProgress = timer.running || timer.accumulatedMs > 0;
  const elapsedSeconds =
    ((timer.running && timer.startedAt ? now - timer.startedAt : 0) + timer.accumulatedMs) / 1000;

  // global hotkey / status-bar events
  const subjectRef = useRef<string | null>(null);
  useEffect(() => {
    subjectRef.current = effectiveSubject;
  }, [effectiveSubject]);
  useEffect(() => {
    const onToggle = () => {
      const ui = useUI.getState();
      if (ui.timer.running || ui.timer.accumulatedMs > 0) {
        const sid = ui.timer.subjectId;
        const mins = ui.stopTimer();
        if (sid) {
          const name = useNexus.getState().subjects.find((s) => s.id === sid)?.name;
          toast.success(`Logged ${mins} min${name ? ` to ${name}` : ''}`);
        }
      } else {
        const sid = subjectRef.current ?? useNexus.getState().subjects[0]?.id;
        if (sid) ui.startTimer(sid);
      }
    };
    const onStarted = () => {
      const sid = useUI.getState().timer.subjectId;
      if (sid) setSubjectId(sid);
    };
    window.addEventListener('nexus:toggle-timer', onToggle);
    window.addEventListener('nexus:timer-started', onStarted);
    return () => {
      window.removeEventListener('nexus:toggle-timer', onToggle);
      window.removeEventListener('nexus:timer-started', onStarted);
    };
  }, []);

  const activeSubject = subjects.find((s) => s.id === (timer.subjectId ?? effectiveSubject));

  const handleStop = () => {
    const ui = useUI.getState();
    const sid = ui.timer.subjectId;
    const mins = ui.stopTimer();
    if (sid) {
      const name = subjects.find((s) => s.id === sid)?.name ?? 'subject';
      toast.success(`Logged ${mins} min to ${name}`);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (session: StudySession) => {
    setEditing(session);
    setDialogOpen(true);
  };

  // ── Week KPIs ───────────────────────────────────────────────────────────────
  const weekKeys = useMemo(() => {
    const sow = startOfWeek(new Date());
    return eachDayKeys(sow, addDays(sow, 6));
  }, []);
  const weekSet = useMemo(() => new Set(weekKeys), [weekKeys]);
  const weekTotal = useMemo(
    () => sum(weekKeys.map((k) => dayTotalMinutes(dailyLogs[k]))),
    [weekKeys, dailyLogs],
  );
  const weekSessions = useMemo(
    () => sessions.filter((s) => weekSet.has(s.date)),
    [sessions, weekSet],
  );
  const avgDuration = useMemo(() => avg(weekSessions.map((s) => s.durationMin)), [weekSessions]);
  const avgConcentration = useMemo(() => avg(weekSessions.map((s) => s.concentration)), [weekSessions]);
  const weeklyTarget = Math.max(1, profile.dailyTargetHours * 7 * 60);

  // ── Filters ─────────────────────────────────────────────────────────────────
  const today = todayKey();
  const filtered = useMemo(() => {
    const cutoff = period === '7' ? addDaysKey(today, -6) : period === '30' ? addDaysKey(today, -29) : null;
    const q = query.trim().toLowerCase();
    return sessions
      .filter((s) => (cutoff ? s.date >= cutoff : true))
      .filter((s) => (filterSubject === 'all' ? true : s.subjectId === filterSubject))
      .filter((s) => (filterCategory === 'all' ? true : s.category === filterCategory))
      .filter((s) =>
        q ? s.notes.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q)) : true)
      .sort((a, b) =>
        a.date === b.date ? b.startTime.localeCompare(a.startTime) : b.date.localeCompare(a.date));
  }, [sessions, period, filterSubject, filterCategory, query, today]);

  const subjectName = (id: string) => subjects.find((s) => s.id === id);

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={Timer}
        title="Study Sessions"
        subtitle="Focus timer and session log — every minute accounted for"
        actions={
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Log session
          </Button>
        }
      />

      {/* ── Focus timer ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-foreground/20 p-px">
        <section className="glass flex flex-col items-center gap-6 rounded-[15px] p-5 sm:p-6 md:flex-row md:items-stretch md:justify-between">
          <div className="flex w-full flex-col gap-4 md:max-w-64">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Focus timer</h3>
              <p className="text-xs text-muted-foreground">
                {timer.running
                  ? 'Recording — stay with it.'
                  : timer.accumulatedMs > 0
                    ? 'Paused — resume when ready.'
                    : 'Pick a subject and press start.'}
              </p>
            </div>
            <Select
              value={effectiveSubject ?? undefined}
              onValueChange={setSubjectId}
              disabled={inProgress || subjects.length === 0}
            >
              <SelectTrigger className="w-full text-sm" aria-label="Timer subject">
                <SelectValue placeholder="Choose a subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Subjects</SelectLabel>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {CATEGORY_META[s.category].label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              {(!timer.running && timer.accumulatedMs === 0) && (
                <Button
                  className="flex-1 gap-1.5"
                  disabled={!effectiveSubject}
                  onClick={() => effectiveSubject && useUI.getState().startTimer(effectiveSubject)}
                >
                  <Play className="h-4 w-4" /> Start
                </Button>
              )}
              {timer.running && (
                <>
                  <Button variant="outline" className="flex-1 gap-1.5" onClick={() => useUI.getState().pauseTimer()}>
                    <Pause className="h-4 w-4" /> Pause
                  </Button>
                  <Button variant="destructive" className="gap-1.5" onClick={handleStop}>
                    <Square className="h-4 w-4" /> Stop
                  </Button>
                </>
              )}
              {!timer.running && timer.accumulatedMs > 0 && (
                <>
                  <Button className="flex-1 gap-1.5" onClick={() => useUI.getState().resumeTimer()}>
                    <Play className="h-4 w-4" /> Resume
                  </Button>
                  <Button variant="destructive" className="gap-1.5" onClick={handleStop}>
                    <Square className="h-4 w-4" /> Stop
                  </Button>
                </>
              )}
            </div>
            {activeSubject && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: activeSubject.color }} aria-hidden="true" />
                {activeSubject.name}
                <Badge variant="outline" className="text-[10px]">{CATEGORY_META[activeSubject.category].label}</Badge>
              </p>
            )}
          </div>

          <div className="flex flex-1 items-center justify-center py-2">
            <RingProgress
              value={(elapsedSeconds / (RING_MINUTES * 60)) * 100}
              size={248}
              stroke={11}
              color={timer.running ? 'var(--ink-1)' : timer.accumulatedMs > 0 ? 'var(--ink-5)' : 'var(--primary)'}
              label={`${Math.floor(elapsedSeconds / 60)} of ${RING_MINUTES} minutes`}
            >
              <span className="font-mono text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl">
                {secondsToClock(elapsedSeconds)}
              </span>
              <span className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {timer.running ? 'focusing' : timer.accumulatedMs > 0 ? 'paused' : 'ready'}
              </span>
            </RingProgress>
          </div>
        </section>
      </div>

      {/* ── Week KPIs ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Clock} label="This week" tone="cyan"
          value={minutesToHM(weekTotal)}
          sub={`of ${minutesToHM(weeklyTarget)} target`}
          progress={(weekTotal / weeklyTarget) * 100}
        />
        <KpiCard
          icon={ListChecks} label="Sessions" tone="violet"
          value={String(weekSessions.length)}
          sub="logged this week"
        />
        <KpiCard
          icon={Timer} label="Avg duration" tone="emerald"
          value={weekSessions.length ? minutesToLabel(Math.round(avgDuration)) : '—'}
          sub="per session this week"
        />
        <KpiCard
          icon={Star} label="Avg concentration" tone="amber"
          value={
            <>
              {weekSessions.length ? avgConcentration.toFixed(1) : '—'}
              <span className="ml-0.5 text-foreground">★</span>
            </>
          }
          sub="focus quality this week"
        />
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="h-8 w-[10.5rem] text-xs" aria-label="Filter by subject">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-8 w-[9.5rem] text-xs" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(Object.keys(CATEGORY_META) as SubjectCategory[]).map((c) => (
              <SelectItem key={c} value={c}>{CATEGORY_META[c].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes or tags…"
          className="h-8 min-w-36 flex-1 rounded-lg text-xs sm:max-w-64"
          aria-label="Search sessions"
        />
        <Segmented<PeriodKey>
          size="sm"
          className="ml-auto"
          options={[
            { value: '7', label: '7D' },
            { value: '30', label: '30D' },
            { value: 'all', label: 'All' },
          ]}
          value={period}
          onChange={setPeriod}
        />
      </div>

      {/* ── Session log table ───────────────────────────────────────────────── */}
      <section className="glass rounded-2xl p-2 sm:p-3">
        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Timer}
              title="No sessions found"
              hint="Nothing matches these filters yet — run the focus timer or log a session manually."
            >
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" /> Log your first session
              </Button>
            </EmptyState>
          </div>
        ) : (
          <>
            <p className="px-2 pb-2 pt-1 text-[11px] text-muted-foreground">
              {filtered.length} session{filtered.length === 1 ? '' : 's'}
            </p>
            <div className="slim-scroll max-h-96 overflow-auto rounded-xl">
              <Table className="min-w-[680px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Subject</TableHead>
                    <TableHead className="text-xs">Time</TableHead>
                    <TableHead className="text-xs">Duration</TableHead>
                    <TableHead className="text-xs">Focus</TableHead>
                    <TableHead className="text-xs">Tags</TableHead>
                    <TableHead className="w-20 text-right text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => {
                    const subj = subjectName(s.subjectId);
                    const extraTags = s.tags.length - 2;
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs text-muted-foreground">{fmtDayFull(s.date)}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2 text-xs font-medium">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ background: subj?.color ?? 'var(--ink-4)' }}
                              aria-hidden="true"
                            />
                            {subj?.name ?? 'Deleted subject'}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                          {s.startTime}–{s.endTime || '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold tabular-nums">
                          {minutesToLabel(s.durationMin)}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex origin-left scale-[0.72]">
                            <StarRating value={s.concentration} />
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="flex flex-wrap items-center gap-1">
                            {s.tags.slice(0, 2).map((t) => (
                              <Badge key={t} variant="outline" className="px-1.5 text-[10px] text-muted-foreground">{t}</Badge>
                            ))}
                            {extraTags > 0 && (
                              <Badge variant="outline" className="px-1.5 text-[10px] text-muted-foreground/70">+{extraTags}</Badge>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center gap-0.5">
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => openEdit(s)}
                              aria-label={`Edit session on ${s.date}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
                                  aria-label={`Delete session on ${s.date}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {fmtDayFull(s.date)} · {subj?.name ?? 'Unknown subject'} · {minutesToLabel(s.durationMin)}.
                                    This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-foreground text-background hover:bg-foreground/90"
                                    onClick={() => {
                                      deleteSession(s.id);
                                      toast.success('Session deleted');
                                    }}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      <SessionDialog
        key={editing?.id ?? 'new'}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        session={editing}
      />
    </div>
  );
}
