import type {
  ID, TimetableCategory, TimetableData, TimetableDay, TimetableEvent,
  TimetableSettings, TimetableStatus,
} from './types';
import { INK_VARS, TIMETABLE_STATUS_META } from './constants';
import { minutesToTime, timeToMinutes, uid } from './utils';

// ─── Grid maths ───────────────────────────────────────────────────────────────
export const TIMETABLE_STATUSES = Object.keys(TIMETABLE_STATUS_META) as TimetableStatus[];

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isTime = (v: unknown): v is string => typeof v === 'string' && HHMM.test(v);

export const timeline = (settings: TimetableSettings) => {
  const startMin = timeToMinutes(settings.dayStart);
  const endMin = timeToMinutes(settings.dayEnd);
  return { startMin, endMin, totalMin: Math.max(0, endMin - startMin) };
};

/** Slot boundaries rendered in the left gutter. */
export const gridRows = (settings: TimetableSettings): number[] => {
  const { startMin, endMin } = timeline(settings);
  const step = Math.max(5, settings.slotMinutes);
  const rows: number[] = [];
  for (let m = startMin; m <= endMin; m += step) rows.push(m);
  return rows;
};

export const snapToSlot = (minute: number, settings: TimetableSettings) => {
  const { startMin, endMin } = timeline(settings);
  const step = Math.max(5, settings.slotMinutes);
  const snapped = startMin + Math.floor((minute - startMin) / step) * step;
  return Math.min(Math.max(snapped, startMin), Math.max(startMin, endMin - step));
};

export const eventDuration = (ev: Pick<TimetableEvent, 'start' | 'end'>) =>
  Math.max(0, timeToMinutes(ev.end) - timeToMinutes(ev.start));

export const fmtTimeRange = (start: string, end: string) => `${start} – ${end}`;

/** True when two half-open [start, end) ranges intersect. */
export const rangesOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && bStart < aEnd;

// ─── Validation ───────────────────────────────────────────────────────────────
export type TimetableDraft = Pick<
  TimetableEvent, 'title' | 'dayId' | 'start' | 'end' | 'categoryId'
> & { status?: TimetableStatus };

export interface TimetableInput {
  days: TimetableDay[];
  categories: TimetableCategory[];
  events: TimetableEvent[];
  settings: TimetableSettings;
  /** Set when editing so the event doesn't collide with itself. */
  selfId?: ID;
}

export type TimetableErrors = Partial<Record<'title' | 'dayId' | 'start' | 'end' | 'categoryId', string>>;

export function validateTimetableEvent(draft: TimetableDraft, ctx: TimetableInput): TimetableErrors {
  const errors: TimetableErrors = {};
  const title = draft.title.trim();

  if (!title) errors.title = 'Title is required.';
  else if (title.length > 80) errors.title = 'Keep the title under 80 characters.';

  if (!draft.dayId) errors.dayId = 'Pick a day.';
  else if (!ctx.days.some((d) => d.id === draft.dayId)) errors.dayId = 'That day no longer exists.';

  if (!draft.categoryId) errors.categoryId = 'Pick a category.';
  else if (!ctx.categories.some((c) => c.id === draft.categoryId)) errors.categoryId = 'That category no longer exists.';

  if (!isTime(draft.start)) errors.start = 'Use a valid start time (HH:mm).';
  if (!isTime(draft.end)) errors.end = 'Use a valid end time (HH:mm).';

  if (!errors.start && !errors.end) {
    const startMin = timeToMinutes(draft.start);
    const endMin = timeToMinutes(draft.end);
    const { startMin: boundStart, endMin: boundEnd } = timeline(ctx.settings);

    if (endMin <= startMin) {
      errors.end = 'End time must be after the start time.';
    } else if (startMin < boundStart || endMin > boundEnd) {
      errors.end = `Class must fit inside timetable hours (${ctx.settings.dayStart}–${ctx.settings.dayEnd}). Change the grid in Schedule settings.`;
    } else if (!errors.dayId) {
      const conflict = ctx.events.find(
        (ev) =>
          ev.id !== ctx.selfId &&
          ev.dayId === draft.dayId &&
          rangesOverlap(startMin, endMin, timeToMinutes(ev.start), timeToMinutes(ev.end)),
      );
      if (conflict) {
        errors.start = `Overlaps “${conflict.title}” (${conflict.start}–${conflict.end}).`;
      }
    }
  }

  return errors;
}

export const hasErrors = (errors: TimetableErrors) => Object.keys(errors).length > 0;

/** Grid settings validation, used by the settings dialog. */
export function validateTimetableSettings(s: TimetableSettings): string | null {
  if (!isTime(s.dayStart) || !isTime(s.dayEnd)) return 'Day boundaries need valid times.';
  const start = timeToMinutes(s.dayStart);
  const end = timeToMinutes(s.dayEnd);
  if (end <= start) return 'The day must end after it starts.';
  if (end - start < 60) return 'Leave at least one hour in the grid.';
  if (!Number.isInteger(s.slotMinutes) || s.slotMinutes < 5 || s.slotMinutes > 180) {
    return 'Slot length must be between 5 and 180 minutes.';
  }
  if (s.slotMinutes > end - start) return 'Slot length must fit within the day.';
  return null;
}

/** Which events would fall outside a proposed grid. */
export const eventsOutsideGrid = (events: TimetableEvent[], settings: TimetableSettings) => {
  const { startMin, endMin } = timeline(settings);
  return events.filter(
    (ev) => timeToMinutes(ev.start) < startMin || timeToMinutes(ev.end) > endMin,
  );
};

// ─── Import / export ──────────────────────────────────────────────────────────
export const TIMETABLE_EXPORT_KIND = 'nexusos-timetable';
export const TIMETABLE_EXPORT_VERSION = 1;

export interface TimetableExport {
  app: typeof TIMETABLE_EXPORT_KIND;
  version: number;
  exportedAt: string;
  settings: TimetableSettings;
  days: TimetableDay[];
  categories: TimetableCategory[];
  events: TimetableEvent[];
}

export const buildTimetableExport = (tt: TimetableData): TimetableExport => ({
  app: TIMETABLE_EXPORT_KIND,
  version: TIMETABLE_EXPORT_VERSION,
  exportedAt: new Date().toISOString(),
  settings: { ...tt.settings },
  days: tt.days.map((d) => ({ ...d })),
  categories: tt.categories.map((c) => ({ ...c })),
  events: tt.events.map((e) => ({ ...e })),
});

export type ImportResult =
  | { ok: true; data: TimetableData }
  | { ok: false; error: string };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const asString = (v: unknown, max = 200): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s || s.length > max) return null;
  return s;
};

const COLOR_RE = /^(var\(--ink-(?:10|[1-9])\)|#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgba?\([\d\s.,%]+\))$/;

/**
 * Validates an exported JSON file (wrapped export or a bare TimetableData
 * object) and returns a clean, reference-safe timetable.
 */
export function parseTimetableImport(json: unknown): ImportResult {
  if (!isRecord(json)) return { ok: false, error: 'That file is not a timetable JSON object.' };

  // Accept either the wrapped export or a bare { days, categories, events, settings }.
  const root = isRecord(json.timetable) ? json.timetable : json;

  const rawDays = root.days;
  const rawCategories = root.categories;
  const rawEvents = root.events;
  const rawSettings = root.settings;

  if (!Array.isArray(rawDays) || rawDays.length === 0) {
    return { ok: false, error: 'Missing days — a timetable needs at least one day.' };
  }
  if (rawDays.length > 14) return { ok: false, error: 'Too many days (max 14).' };
  if (!Array.isArray(rawCategories) || rawCategories.length === 0) {
    return { ok: false, error: 'Missing categories — a timetable needs at least one category.' };
  }
  if (rawCategories.length > 30) return { ok: false, error: 'Too many categories (max 30).' };
  if (!Array.isArray(rawEvents)) return { ok: false, error: 'Missing the events list.' };
  if (rawEvents.length > 500) return { ok: false, error: 'Too many events (max 500).' };

  const days: TimetableDay[] = [];
  const dayIds = new Set<string>();
  for (let i = 0; i < rawDays.length; i++) {
    const d = rawDays[i];
    if (!isRecord(d)) return { ok: false, error: `Day ${i + 1} is not an object.` };
    const id = asString(d.id, 60);
    const label = asString(d.label, 40);
    const short = asString(d.short, 8);
    if (!id || !label || !short) return { ok: false, error: `Day ${i + 1} needs an id, label and short name.` };
    if (dayIds.has(id)) return { ok: false, error: `Duplicate day id “${id}”.` };
    dayIds.add(id);
    days.push({ id, label, short });
  }

  const categories: TimetableCategory[] = [];
  const categoryIds = new Set<string>();
  for (let i = 0; i < rawCategories.length; i++) {
    const c = rawCategories[i];
    if (!isRecord(c)) return { ok: false, error: `Category ${i + 1} is not an object.` };
    const id = asString(c.id, 60);
    const name = asString(c.name, 40);
    const color = asString(c.color, 80);
    if (!id || !name) return { ok: false, error: `Category ${i + 1} needs an id and a name.` };
    if (categoryIds.has(id)) return { ok: false, error: `Duplicate category id “${id}”.` };
    if (!color || !COLOR_RE.test(color)) {
      return { ok: false, error: `Category “${name}” has an invalid colour.` };
    }
    categoryIds.add(id);
    categories.push({ id, name, color });
  }

  if (!isRecord(rawSettings) || typeof rawSettings.dayStart !== 'string' ||
      typeof rawSettings.dayEnd !== 'string' || typeof rawSettings.slotMinutes !== 'number') {
    return { ok: false, error: 'Missing or invalid grid settings.' };
  }
  const settings: TimetableSettings = {
    dayStart: rawSettings.dayStart,
    dayEnd: rawSettings.dayEnd,
    slotMinutes: rawSettings.slotMinutes,
  };
  const settingsError = validateTimetableSettings(settings);
  if (settingsError) return { ok: false, error: `Grid settings: ${settingsError}` };

  const events: TimetableEvent[] = [];
  const eventIds = new Set<string>();
  for (let i = 0; i < rawEvents.length; i++) {
    const e = rawEvents[i];
    if (!isRecord(e)) return { ok: false, error: `Event ${i + 1} is not an object.` };
    const label = typeof e.title === 'string' && e.title.trim() ? `“${e.title.trim().slice(0, 40)}”` : `#${i + 1}`;

    const title = asString(e.title, 80);
    if (!title) return { ok: false, error: `Event ${label} needs a title (max 80 chars).` };

    const dayId = asString(e.dayId, 60);
    if (!dayId || !dayIds.has(dayId)) return { ok: false, error: `Event ${label} points at a day that doesn't exist.` };

    const categoryId = asString(e.categoryId, 60);
    if (!categoryId || !categoryIds.has(categoryId)) {
      return { ok: false, error: `Event ${label} points at a category that doesn't exist.` };
    }

    const rawStart = e.start;
    const rawEnd = e.end;
    if (!isTime(rawStart) || !isTime(rawEnd)) return { ok: false, error: `Event ${label} has an invalid time.` };
    const evStart = timeToMinutes(rawStart);
    const evEnd = timeToMinutes(rawEnd);
    if (evEnd <= evStart) {
      return { ok: false, error: `Event ${label} ends before it starts.` };
    }

    const startMin = timeToMinutes(settings.dayStart);
    const endMin = timeToMinutes(settings.dayEnd);
    if (evStart < startMin || evEnd > endMin) {
      return {
        ok: false,
        error: `Event ${label} falls outside the grid (${settings.dayStart}–${settings.dayEnd}).`,
      };
    }

    const clash = events.find(
      (ev) => ev.dayId === dayId && rangesOverlap(evStart, evEnd, timeToMinutes(ev.start), timeToMinutes(ev.end)),
    );
    if (clash) return { ok: false, error: `Event ${label} overlaps “${clash.title}”.` };

    const id = asString(e.id, 60) ?? uid();
    if (eventIds.has(id)) return { ok: false, error: `Duplicate event id “${id}”.` };
    eventIds.add(id);

    if (typeof e.status !== 'string' || !TIMETABLE_STATUSES.includes(e.status as TimetableStatus)) {
      return { ok: false, error: `Event ${label} has an invalid status.` };
    }
    const status = e.status as TimetableStatus;
    if (typeof e.location !== 'string' || e.location.length > 80 ||
        typeof e.description !== 'string' || e.description.length > 500) {
      return { ok: false, error: `Event ${label} has an invalid location or description.` };
    }

    events.push({
      id,
      title,
      dayId,
      start: rawStart,
      end: rawEnd,
      categoryId,
      location: e.location,
      description: e.description,
      status,
      createdAt: typeof e.createdAt === 'string' ? e.createdAt : new Date().toISOString(),
    });
  }

  return { ok: true, data: { days, categories, events, settings } };
}

/** Colour swatches offered in the UI — the monochrome ink ramp. */
export const timetableColorOptions = () =>
  INK_VARS.map((color, i) => ({ color, label: `Ink ${i + 1}` }));

/** Human summary used in toasts and the module header. */
export const timetableSummary = (tt: TimetableData) => {
  const active = tt.events.filter((e) => e.status !== 'cancelled');
  const minutes = active.reduce((sum, e) => sum + eventDuration(e), 0);
  return { classes: active.length, hours: Math.round((minutes / 60) * 10) / 10 };
};

export const minutesLabel = (start: string, end: string) => {
  const mins = Math.max(0, timeToMinutes(end) - timeToMinutes(start));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h ? `${h}h ` : ''}${m ? `${m}m` : !h ? '0m' : ''}`.trim();
};

export const addMinutesToTime = (hhmm: string, minutes: number) =>
  minutesToTime(Math.max(0, Math.min(23 * 60 + 59, timeToMinutes(hhmm) + minutes)));
