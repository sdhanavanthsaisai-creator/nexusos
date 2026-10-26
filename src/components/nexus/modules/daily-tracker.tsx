'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  CalendarCheck2, ChevronLeft, ChevronRight, Minus, Moon, Plus, Zap,
} from 'lucide-react';
// (no toasts here — every edit auto-saves and pulses "Saved ✓")
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EmptyState, ModuleHeader, RingProgress, Segmented, StarRating } from '../ui-bits';
import { useNexus } from '@/lib/nexus/store';
import { CATEGORY_META } from '@/lib/nexus/constants';
import type { DayType, Subject, SubjectCategory } from '@/lib/nexus/types';
import {
  addDays, addDaysKey, clamp, dayTotalMinutes, eachDayKeys, fmtDayFull, minutesToHM,
  minutesToLabel, parseKey, startOfWeek, todayKey, WEEKDAYS,
} from '@/lib/nexus/utils';

const MAX_SUBJECT_MINUTES = 600;

export default function DailyTrackerModule() {
  const subjects = useNexus((s) => s.subjects);
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const profile = useNexus((s) => s.profile);
  const upsertDailyLog = useNexus((s) => s.upsertDailyLog);
  const setDayMinutes = useNexus((s) => s.setDayMinutes);

  const [selectedDate, setSelectedDate] = useState(() => todayKey());
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [exactFor, setExactFor] = useState<string | null>(null);
  const [exactVal, setExactVal] = useState('');

  const today = todayKey();
  const isFuture = selectedDate > today;
  const log = dailyLogs[selectedDate];

  const flashSaved = useCallback(() => {
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1400);
  }, []);

  const patchLog = useCallback(
    (patch: Parameters<typeof upsertDailyLog>[1]) => {
      upsertDailyLog(selectedDate, patch);
      flashSaved();
    },
    [selectedDate, upsertDailyLog, flashSaved],
  );

  const bump = useCallback(
    (subjectId: string, delta: number) => {
      const cur = dailyLogs[selectedDate]?.minutes?.[subjectId] ?? 0;
      const next = clamp(cur + delta, 0, MAX_SUBJECT_MINUTES);
      setDayMinutes(selectedDate, subjectId, next);
      flashSaved();
    },
    [dailyLogs, selectedDate, setDayMinutes, flashSaved],
  );

  const setExact = useCallback(
    (subjectId: string) => {
      const n = Math.round(Number(exactVal));
      if (Number.isFinite(n) && n >= 0) {
        setDayMinutes(selectedDate, subjectId, clamp(n, 0, MAX_SUBJECT_MINUTES));
        flashSaved();
      }
      setExactFor(null);
      setExactVal('');
    },
    [exactVal, selectedDate, setDayMinutes, flashSaved],
  );

  // Subjects grouped by category (in CATEGORY_META order)
  const grouped = useMemo(() => {
    const byCat = new Map<SubjectCategory, Subject[]>();
    for (const s of subjects) {
      const list = byCat.get(s.category) ?? [];
      list.push(s);
      byCat.set(s.category, list);
    }
    return (Object.keys(CATEGORY_META) as SubjectCategory[])
      .map((cat) => ({ cat, meta: CATEGORY_META[cat], items: byCat.get(cat) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [subjects]);

  const total = dayTotalMinutes(log);
  const targetMin = Math.round(profile.dailyTargetHours * 60);
  const pct = targetMin > 0 ? Math.round((total / targetMin) * 100) : 0;

  const defaultDayType: DayType = useMemo(() => {
    const dow = parseKey(selectedDate).getDay();
    return dow === 0 || dow === 6 ? 'weekend' : 'college';
  }, [selectedDate]);

  // Week at a glance — Mon→Sun of the selected date's week
  const week = useMemo(() => {
    const sow = startOfWeek(parseKey(selectedDate));
    return eachDayKeys(sow, addDays(sow, 6));
  }, [selectedDate]);

  const weekBars = useMemo(() => {
    const minutes = week.map((k) => dayTotalMinutes(dailyLogs[k]));
    const max = Math.max(60, ...minutes);
    return week.map((k, i) => ({ key: k, minutes: minutes[i], h: Math.max(4, (minutes[i] / max) * 100) }));
  }, [week, dailyLogs]);

  const updatedLabel = log?.updatedAt
    ? new Date(log.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={CalendarCheck2}
        title="Daily Study Tracker"
        subtitle="One record per day — auto-saved"
        actions={
          <>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous day" onClick={() => setSelectedDate((d) => addDaysKey(d, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => setSelectedDate(today)}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next day" onClick={() => setSelectedDate((d) => addDaysKey(d, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              value={selectedDate}
              max="2100-12-31"
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="h-8 w-[9.5rem] rounded-lg px-2 text-xs"
              aria-label="Pick a date"
            />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* ── Day info ─────────────────────────────────────────────── */}
        <section className="glass rounded-2xl p-4 sm:p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Day info</h3>
              <p className="text-xs text-muted-foreground">{fmtDayFull(selectedDate)}</p>
            </div>
            <span
              className={`text-[11px] font-medium text-emerald-400 transition-opacity duration-300 ${saved ? 'animate-pulse-glow opacity-100' : 'opacity-0'}`}
              aria-live="polite"
            >
              Saved ✓
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Day type</p>
              <Segmented<DayType>
                className="w-full justify-start"
                options={[
                  { value: 'college', label: 'College Day' },
                  { value: 'weekend', label: 'Weekend / Leave' },
                ]}
                value={log?.dayType ?? defaultDayType}
                onChange={(v) => patchLog({ dayType: v })}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Moon className="h-3.5 w-3.5" aria-hidden="true" /> Sleep
                </p>
                <span className="font-mono text-xs font-semibold tabular-nums">
                  {(log?.sleepHours ?? 7.5).toFixed(1)}h
                </span>
              </div>
              <Slider
                min={0}
                max={12}
                step={0.5}
                value={[log?.sleepHours ?? 7.5]}
                onValueChange={([v]) => patchLog({ sleepHours: v })}
                aria-label="Sleep hours"
              />
            </div>

            <div>
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <Zap className="h-3.5 w-3.5" aria-hidden="true" /> Energy
              </p>
              <StarRating value={log?.energy ?? 0} onChange={(v) => patchLog({ energy: v })} />
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Notes</p>
              <Textarea
                value={log?.notes ?? ''}
                onChange={(e) => patchLog({ notes: e.target.value })}
                placeholder="How did the day go?"
                className="min-h-20 resize-none text-sm"
              />
            </div>

            {updatedLabel && !isFuture && (
              <p className="text-[11px] text-muted-foreground/70">Last updated {updatedLabel}</p>
            )}
          </div>
        </section>

        {/* ── Subject quick log ────────────────────────────────────── */}
        <section className="glass rounded-2xl p-4 sm:p-5 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Subject quick log</h3>
              <p className="text-xs text-muted-foreground">Tap to add minutes — click a badge to set exact time</p>
            </div>
          </div>

          {isFuture && (
            <div className="mb-4">
              <EmptyState
                title="You're ahead of yourself"
                hint="This day hasn't happened yet — you can look around, but logging is locked until then."
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {grouped.map((g) => (
              <div key={g.cat}>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: g.meta.color }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: g.meta.color }} aria-hidden="true" />
                  {g.meta.label}
                </p>
                <div className="space-y-1.5">
                  {g.items.map((s) => {
                    const mins = log?.minutes?.[s.id] ?? 0;
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/30 px-2 py-1.5 transition-colors hover:border-border"
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium">{s.name}</span>
                        <Popover
                          open={exactFor === s.id}
                          onOpenChange={(o) => {
                            setExactFor(o ? s.id : null);
                            if (o) setExactVal(String(mins));
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              disabled={isFuture}
                              className="rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums transition-colors enabled:bg-muted/70 enabled:hover:bg-muted disabled:opacity-40"
                              aria-label={`Set exact minutes for ${s.name}`}
                            >
                              {minutesToLabel(mins)}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-44 p-3" align="end">
                            <p className="mb-2 text-xs font-medium">Set exact minutes</p>
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                min={0}
                                max={MAX_SUBJECT_MINUTES}
                                value={exactVal}
                                onChange={(e) => setExactVal(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && setExact(s.id)}
                                className="h-8 font-mono text-xs"
                                aria-label={`Exact minutes for ${s.name}`}
                              />
                              <Button size="sm" className="h-8 px-2.5 text-xs" onClick={() => setExact(s.id)}>
                                Set
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6 text-emerald-400 hover:bg-emerald-400/15 hover:text-emerald-300"
                            disabled={isFuture}
                            onClick={() => bump(s.id, 15)}
                            aria-label={`Add 15 minutes to ${s.name}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6 text-cyan-400 hover:bg-cyan-400/15 hover:text-cyan-300"
                            disabled={isFuture}
                            onClick={() => bump(s.id, 30)}
                            aria-label={`Add 30 minutes to ${s.name}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6 text-rose-400 hover:bg-rose-400/15 hover:text-rose-300"
                            disabled={isFuture || mins === 0}
                            onClick={() => bump(s.id, -15)}
                            aria-label={`Remove 15 minutes from ${s.name}`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {grouped.length === 0 && (
              <p className="text-xs text-muted-foreground">No subjects yet — add some in Settings.</p>
            )}
          </div>

          {/* Bottom row: total + ring */}
          <div className="mt-5 flex items-center justify-between gap-4 border-t border-border/50 pt-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total focus time</p>
              <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-gradient">{minutesToHM(total)}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Target {minutesToHM(targetMin)} · 0–600 min per subject</p>
            </div>
            <RingProgress value={pct} size={92} stroke={9} color={total >= targetMin ? '#34d399' : 'var(--primary)'} label={`${pct}% of daily target`}>
              <span className="font-mono text-lg font-bold tabular-nums">{pct}%</span>
            </RingProgress>
          </div>
        </section>
      </div>

      {/* ── Week at a glance ───────────────────────────────────────── */}
      <section className="glass rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight">Week at a glance</h3>
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            {fmtDayFull(week[0]).split(',')[1]} → {fmtDayFull(week[6]).split(',')[1]}
          </Badge>
        </div>
        <div className="flex items-end justify-between gap-2 sm:gap-3">
          {weekBars.map((d, i) => {
            const isToday = d.key === today;
            const isSelected = d.key === selectedDate;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => setSelectedDate(d.key)}
                className="group flex min-w-0 flex-1 flex-col items-center gap-1.5"
                aria-label={`${fmtDayFull(d.key)} — ${minutesToLabel(d.minutes)}`}
              >
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground transition-colors group-hover:text-foreground">
                  {minutesToLabel(d.minutes)}
                </span>
                <div className="flex h-28 w-full items-end overflow-hidden rounded-lg bg-muted/40">
                  <div
                    className={`w-full rounded-lg transition-all duration-500 ${
                      isToday ? 'bg-primary glow-soft' : isSelected ? 'bg-primary/60' : 'bg-primary/25 group-hover:bg-primary/40'
                    }`}
                    style={{ height: `${d.h}%` }}
                  />
                </div>
                <span className={`text-[10px] font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{WEEKDAYS[i]}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
