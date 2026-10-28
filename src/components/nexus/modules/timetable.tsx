'use client';

import { useMemo, useState, type MouseEvent } from 'react';
import {
  ArrowRightLeft, CalendarRange, Check, Clock, MapPin, Plus, Settings2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KpiCard, ModuleHeader } from '@/components/nexus/ui-bits';
import { useNexus } from '@/lib/nexus/store';
import { TIMETABLE_STATUS_META } from '@/lib/nexus/constants';
import {
  eventDuration, fmtTimeRange, gridRows, minutesLabel, snapToSlot, timeline,
} from '@/lib/nexus/timetable';
import type { TimetableEvent } from '@/lib/nexus/types';
import { minutesToTime, timeToMinutes } from '@/lib/nexus/utils';
import { cn } from '@/lib/utils';
import TimetableEventDialog from './timetable/event-dialog';
import TimetableSettingsDialog from './timetable/settings-dialog';

/** Vertical scale of the week grid: 0.85px per minute (51px per hour). */
const PX_PER_MINUTE = 0.85;
const DAY_BY_WEEKDAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

type DialogState =
  | { mode: 'new'; event: null; defaults: { dayId: string; start: string; end: string } }
  | { mode: 'edit'; event: TimetableEvent; defaults: { dayId: string; start: string; end: string } }
  | null;

export default function TimetableModule() {
  const timetable = useNexus((s) => s.timetable);
  const { days, categories, events, settings } = timetable;

  const [dialog, setDialog] = useState<DialogState>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { startMin, endMin, totalMin } = timeline(settings);
  const rowMins = useMemo(() => gridRows(settings), [settings]);
  const labelMins = useMemo(() => {
    const marks = new Set<number>(rowMins.filter((m) => m % 60 === 0));
    marks.add(startMin);
    return [...marks].sort((a, b) => a - b);
  }, [rowMins, startMin]);

  const todayId = DAY_BY_WEEKDAY[new Date().getDay()];
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  const byDay = useMemo(() => {
    const map: Record<string, TimetableEvent[]> = {};
    for (const d of days) map[d.id] = [];
    for (const ev of events) (map[ev.dayId] ??= []).push(ev);
    for (const key of Object.keys(map)) map[key].sort((a, b) => a.start.localeCompare(b.start));
    return map;
  }, [days, events]);

  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const totalSlots = events.length;
  const activeEvents = events.filter((e) => e.status !== 'cancelled');
  const weeklyMinutes = activeEvents.reduce((sum, e) => sum + eventDuration(e), 0);
  const todayEvents = byDay[todayId] ?? [];
  const nextToday = todayEvents.find((e) => timeToMinutes(e.end) >= nowMinutes && e.status !== 'cancelled');

  const openNew = (dayId: string, start?: string) => {
    const dayEvents = byDay[dayId] ?? [];
    const fallback = dayEvents.length
      ? Math.max(startMin, ...dayEvents.map((e) => timeToMinutes(e.end)))
      : startMin;
    const snapped = snapToSlot(start !== undefined ? timeToMinutes(start) : fallback, settings);
    const startTime = minutesToTime(Math.min(snapped, endMin - settings.slotMinutes));
    const endTime = minutesToTime(timeToMinutes(startTime) + settings.slotMinutes);
    const day = days.find((d) => d.id === dayId) ?? days[0];
    setDialog({
      mode: 'new',
      event: null,
      defaults: {
        dayId: day?.id ?? '',
        start: startTime,
        end: endTime,
      },
    });
  };

  const onColumnClick = (e: MouseEvent<HTMLDivElement>, dayId: string) => {
    if (!days.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const minute = startMin + (e.clientY - rect.top) / PX_PER_MINUTE;
    const start = minutesToTime(snapToSlot(minute, settings));
    openNew(dayId, start);
  };

  if (days.length === 0) {
    return (
      <div className="space-y-5">
        <ModuleHeader
          icon={CalendarRange}
          title="Timetable"
          subtitle="Weekly class schedule — every slot is yours to edit."
        />
        <div className="glass rounded-2xl p-6 text-center">
          <CalendarRange className="mx-auto h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium">No days configured yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Import a timetable file or reset to the default week to start from a grid.
          </p>
          <Button className="mt-4 gap-1.5" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="h-4 w-4" aria-hidden="true" /> Open schedule settings
          </Button>
        </div>
        {settingsOpen && (
          <TimetableSettingsDialog open onOpenChange={setSettingsOpen} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={CalendarRange}
        title="Timetable"
        subtitle="Weekly class schedule — click any slot to add a class, click a class to edit it."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSettingsOpen(true)}>
              <Settings2 className="h-4 w-4" aria-hidden="true" /> Schedule settings
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => openNew(todayId && byDay[todayId] ? todayId : days[0].id)}>
              <Plus className="h-4 w-4" aria-hidden="true" /> New class
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          icon={CalendarRange}
          label="Classes per week"
          value={activeEvents.length}
          sub={totalSlots !== activeEvents.length ? `${totalSlots - activeEvents.length} cancelled` : 'All slots active'}
        />
        <KpiCard
          icon={Clock}
          label="Contact hours"
          value={`${Math.round((weeklyMinutes / 60) * 10) / 10}h`}
          sub={`Grid ${settings.dayStart}–${settings.dayEnd} · ${settings.slotMinutes} min slots`}
          tone="violet"
        />
        <KpiCard
          icon={MapPin}
          label="Today"
          value={todayEvents.length}
          sub={
            nextToday
              ? `Next: ${nextToday.title} · ${nextToday.start}`
              : todayEvents.length
                ? 'All classes done for today'
                : 'No classes today'
          }
          tone="slate"
        />
      </div>

      <div className="glass rounded-2xl p-3 md:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Weekly schedule</h2>
            <p className="text-xs text-muted-foreground">
              {days.length} days · {events.length} slots · click a column to add
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5" aria-label="Categories">
            {categories.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} aria-hidden="true" />
                {c.name}
              </span>
            ))}
          </div>
        </div>

        <div className="slim-scroll overflow-x-auto pb-1">
          <div className="min-w-[52rem]">
            {/* Header row */}
            <div className="flex border-b border-border/60 pb-2">
              <div className="w-14 shrink-0" aria-hidden="true" />
              {days.map((d) => {
                const dayEvents = byDay[d.id] ?? [];
                const isToday = d.id === todayId;
                return (
                  <div key={d.id} className="min-w-[7.5rem] flex-1 px-1 text-center">
                    <p
                      className={cn(
                        'text-[10px] font-semibold uppercase tracking-[0.14em]',
                        isToday ? 'text-foreground' : 'text-muted-foreground/70',
                      )}
                    >
                      {d.short}
                    </p>
                    <div className="mt-0.5 flex items-center justify-center gap-1">
                      <span className={cn('truncate text-xs', isToday ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                        {d.label}
                      </span>
                      {isToday && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-label="Today" />}
                    </div>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                        {dayEvents.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => openNew(d.id)}
                        className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        aria-label={`Add class on ${d.label}`}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grid body */}
            <div className="flex">
              {/* Time gutter */}
              <div className="relative w-14 shrink-0" style={{ height: totalMin * PX_PER_MINUTE }}>
                {labelMins.map((m) => (
                  <span
                    key={m}
                    className={cn(
                      'absolute right-2 text-[10px] tabular-nums text-muted-foreground/80',
                      m === startMin ? 'top-0' : '-translate-y-1/2',
                    )}
                    style={{ top: m === startMin ? 0 : (m - startMin) * PX_PER_MINUTE }}
                  >
                    {minutesToTime(m)}
                  </span>
                ))}
              </div>

              {/* Day columns */}
              {days.map((d) => {
                const dayEvents = byDay[d.id] ?? [];
                const isToday = d.id === todayId;
                return (
                  <div
                    key={d.id}
                    role="group"
                    aria-label={`${d.label} schedule`}
                    onClick={(e) => onColumnClick(e, d.id)}
                    className="relative min-w-[7.5rem] flex-1 cursor-copy border-l border-border/40"
                    style={{ height: totalMin * PX_PER_MINUTE }}
                  >
                    {/* Slot lines */}
                    {rowMins.map((m) => (
                      <div
                        key={m}
                        className={cn(
                          'pointer-events-none absolute inset-x-0 border-t',
                          m % 60 === 0 ? 'border-border/45' : 'border-border/20',
                        )}
                        style={{ top: (m - startMin) * PX_PER_MINUTE }}
                        aria-hidden="true"
                      />
                    ))}

                    {isToday && nowMinutes >= startMin && nowMinutes <= endMin && (
                      <div
                        className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-primary/70"
                        style={{ top: (nowMinutes - startMin) * PX_PER_MINUTE }}
                        aria-hidden="true"
                      >
                        <span className="absolute -left-0.5 -top-1 h-1.5 w-1.5 rounded-full bg-primary" />
                      </div>
                    )}

                    {dayEvents.map((ev) => {
                      const cat = categoryById[ev.categoryId];
                      const start = timeToMinutes(ev.start);
                      const end = timeToMinutes(ev.end);
                      const blockPx = Math.max(20, (end - start) * PX_PER_MINUTE - 2);
                      const color = cat?.color ?? 'var(--ink-5)';
                      const statusMeta = TIMETABLE_STATUS_META[ev.status];
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          data-event="true"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDialog({
                              mode: 'edit',
                              event: ev,
                              defaults: { dayId: ev.dayId, start: ev.start, end: ev.end },
                            });
                          }}
                          aria-label={`${ev.title}, ${fmtTimeRange(ev.start, ev.end)}, ${cat?.name ?? 'Uncategorised'}, ${statusMeta.label}`}
                          title={`${ev.title}\n${ev.start}–${ev.end} · ${cat?.name ?? 'No category'}${ev.location ? ` · ${ev.location}` : ''}`}
                          className={cn(
                            'group absolute inset-x-1 overflow-hidden rounded-md border border-border/50 px-1.5 py-1 text-left transition-all hover:z-20 hover:border-border hover:glow-soft focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
                            ev.status === 'cancelled' && 'opacity-55',
                            ev.status === 'completed' && 'opacity-80',
                            ev.status === 'moved' && 'border-dashed',
                          )}
                          style={{
                            top: (start - startMin) * PX_PER_MINUTE + 1,
                            height: blockPx,
                            borderLeftWidth: 3,
                            borderLeftColor: color,
                            backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
                          }}
                        >
                          <span className="flex items-start gap-1">
                            {ev.status === 'completed' && <Check className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />}
                            {ev.status === 'cancelled' && <X className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />}
                            {ev.status === 'moved' && <ArrowRightLeft className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />}
                            <span
                              className={cn(
                                'line-clamp-2 text-[11px] font-medium leading-tight',
                                ev.status === 'cancelled' && 'line-through',
                              )}
                            >
                              {ev.title}
                            </span>
                          </span>
                          {blockPx >= 40 && (
                            <span className="mt-0.5 block truncate text-[10px] tabular-nums text-muted-foreground">
                              {fmtTimeRange(ev.start, ev.end)}
                            </span>
                          )}
                          {blockPx >= 56 && ev.location && (
                            <span className="block truncate text-[10px] text-muted-foreground/80">
                              {ev.location}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" aria-hidden="true" /> completed</span>
          <span className="inline-flex items-center gap-1"><X className="h-3 w-3" aria-hidden="true" /> cancelled</span>
          <span className="inline-flex items-center gap-1"><ArrowRightLeft className="h-3 w-3" aria-hidden="true" /> moved</span>
          <span className="ml-auto tabular-nums">
            {minutesLabel(settings.dayStart, settings.dayEnd)} visible · {settings.slotMinutes} min rows
          </span>
        </div>
      </div>

      {dialog && (
        <TimetableEventDialog
          open
          onOpenChange={(open) => { if (!open) setDialog(null); }}
          event={dialog.mode === 'edit' ? dialog.event : null}
          defaults={dialog.defaults}
        />
      )}

      {settingsOpen && (
        <TimetableSettingsDialog open onOpenChange={setSettingsOpen} />
      )}
    </div>
  );
}
