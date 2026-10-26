import type { DailyLog, Task } from './types';

// ─── Dates ────────────────────────────────────────────────────────────────────
export const pad2 = (n: number) => String(n).padStart(2, '0');

export const dateKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const todayKey = () => dateKey(new Date());
export const parseKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const addDaysKey = (k: string, n: number) => dateKey(addDays(parseKey(k), n));

/** Monday-based week start. */
export const startOfWeek = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
};

export const eachDayKeys = (start: Date, end: Date): string[] => {
  const keys: string[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  while (cur <= end) {
    keys.push(dateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
};

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const fmtDayNum = (k: string) => {
  const d = parseKey(k);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
};
export const fmtDayFull = (k: string) => {
  const d = parseKey(k);
  return `${WEEKDAYS[(d.getDay() + 6) % 7]}, ${fmtDayNum(k)}`;
};
export const fmtMonthYear = (d: Date) => `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;

// ─── Time formatting ──────────────────────────────────────────────────────────
export const minutesToHM = (m: number) => {
  const mm = Math.max(0, Math.round(m));
  return `${Math.floor(mm / 60)}h ${pad2(mm % 60)}m`;
};
export const minutesToLabel = (m: number) => (m >= 60 ? `${(m / 60).toFixed(m % 60 === 0 ? 0 : 1)}h` : `${m}m`);
export const secondsToClock = (s: number) => {
  const ss = Math.max(0, Math.floor(s));
  return `${pad2(Math.floor(ss / 3600))}:${pad2(Math.floor((ss % 3600) / 60))}:${pad2(ss % 60)}`;
};
export const timeToMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const minutesToTime = (m: number) => `${pad2(Math.floor(m / 60) % 24)}:${pad2(m % 60)}`;

// ─── Data helpers ─────────────────────────────────────────────────────────────
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
export const dayTotalMinutes = (log?: DailyLog | null) => sum(Object.values(log?.minutes ?? {}));
export const isOverdue = (t: Task) => !!t.dueDate && t.dueDate < todayKey() && t.status !== 'done';
export const isDueToday = (t: Task) => t.dueDate === todayKey() && t.status !== 'done';

/** Consecutive study days (>=30 min) ending today or yesterday + all-time best. */
export const computeStreak = (logs: Record<string, DailyLog>) => {
  const qualifies = (k: string) => dayTotalMinutes(logs[k]) >= 30;
  let current = 0;
  let cursor = new Date();
  if (!qualifies(dateKey(cursor))) cursor = addDays(cursor, -1);
  while (qualifies(dateKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  const keys = Object.keys(logs).filter(qualifies).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of keys) {
    run = prev && addDaysKey(prev, 1) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return { current, best: Math.max(best, current) };
};

// ─── Range filters ────────────────────────────────────────────────────────────
export const RANGE_KEYS = ['today', 'week', 'lastweek', 'month', 'semester', 'custom'] as const;
export type RangeKey = (typeof RANGE_KEYS)[number];
export const RANGE_LABELS: Record<RangeKey, string> = {
  today: 'Today', week: 'This Week', lastweek: 'Last Week',
  month: 'This Month', semester: 'Semester', custom: 'Custom',
};

export const rangeStartEnd = (
  r: RangeKey,
  customStart?: string,
  customEnd?: string,
): { start: Date; end: Date; days: string[] } => {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  let start = new Date(startOfToday);
  let end = new Date(now);
  switch (r) {
    case 'today':
      break;
    case 'week':
      start = startOfWeek(new Date());
      break;
    case 'lastweek': {
      const sow = startOfWeek(new Date());
      start = addDays(sow, -7);
      end = addDays(sow, -1);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'semester':
      start = addDays(new Date(), -83); // 12-week semester window
      start.setHours(0, 0, 0, 0);
      break;
    case 'custom':
      start = customStart ? parseKey(customStart) : startOfToday;
      end = customEnd ? parseKey(customEnd) : new Date(now);
      end.setHours(23, 59, 59, 999);
      break;
  }
  return { start, end, days: eachDayKeys(start, end) };
};

// ─── Export helpers ───────────────────────────────────────────────────────────
const csvEscape = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCSV = (rows: Record<string, unknown>[]): string => {
  if (!rows.length) return '';
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const head = cols.map(csvEscape).join(',');
  const body = rows.map((r) => cols.map((c) => csvEscape(r[c])).join(',')).join('\n');
  return `${head}\n${body}`;
};

export const downloadFile = (name: string, content: string, mime = 'text/plain') => {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export const downloadCSV = (name: string, rows: Record<string, unknown>[]) =>
  downloadFile(name.endsWith('.csv') ? name : `${name}.csv`, toCSV(rows), 'text/csv');

export const downloadJSON = (name: string, data: unknown) =>
  downloadFile(name.endsWith('.json') ? name : `${name}.json`, JSON.stringify(data, null, 2), 'application/json');

// ─── Chart shared bits ────────────────────────────────────────────────────────
export const pct = (v: number, total: number) => (total <= 0 ? 0 : Math.round((v / total) * 100));
export const avg = (arr: number[]) => (arr.length ? sum(arr) / arr.length : 0);
export const round1 = (v: number) => Math.round(v * 10) / 10;

/** Simple least-squares linear regression y = a + b·x. */
export const linearRegression = (points: { x: number; y: number }[]) => {
  const n = points.length;
  if (n < 2) return { a: points[0]?.y ?? 0, b: 0 };
  const sx = sum(points.map((p) => p.x));
  const sy = sum(points.map((p) => p.y));
  const sxy = sum(points.map((p) => p.x * p.y));
  const sxx = sum(points.map((p) => p.x * p.x));
  const b = (n * sxy - sx * sy) / Math.max(1e-9, n * sxx - sx * sx);
  const a = (sy - b * sx) / n;
  return { a, b };
};
