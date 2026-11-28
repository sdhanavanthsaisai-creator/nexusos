import type {
  Subject, SubjectCategory, TaskStatus, TaskPriority, TaskArea,
  ModuleId, Habit, DsaTopic, TimetableCategory, TimetableDay,
  TimetableSettings, TimetableStatus,
} from './types';

// ─── Roboto® RB/25 — monochrome ink system ──────────────────────
// Entity colors are CSS custom properties (--ink-1…10, a theme-aware alpha ramp
// of the foreground). DOM resolves them natively; ECharts call sites resolve
// series colors through useChartTheme().palette instead (canvas cannot resolve
// CSS custom properties).
export const INK_VARS = [
  'var(--ink-1)', 'var(--ink-2)', 'var(--ink-3)', 'var(--ink-4)', 'var(--ink-5)',
  'var(--ink-6)', 'var(--ink-7)', 'var(--ink-8)', 'var(--ink-9)', 'var(--ink-10)',
];

/** Canvas-safe chart ramps (theme-aware). */
export const CHART_RAMP = {
  dark: [
    'rgba(255,255,255,0.95)', 'rgba(255,255,255,0.80)', 'rgba(255,255,255,0.66)',
    'rgba(255,255,255,0.54)', 'rgba(255,255,255,0.44)', 'rgba(255,255,255,0.35)',
    'rgba(255,255,255,0.28)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.16)',
    'rgba(255,255,255,0.11)',
  ],
  light: [
    'rgba(0,0,0,0.92)', 'rgba(0,0,0,0.78)', 'rgba(0,0,0,0.64)', 'rgba(0,0,0,0.52)',
    'rgba(0,0,0,0.42)', 'rgba(0,0,0,0.34)', 'rgba(0,0,0,0.27)', 'rgba(0,0,0,0.21)',
    'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.10)',
  ],
} as const;

export const chartPalette = (dark: boolean): string[] =>
  (dark ? [...CHART_RAMP.dark] : [...CHART_RAMP.light]);

export const CATEGORY_META: Record<SubjectCategory, { label: string; color: string }> = {
  college: { label: 'College', color: 'var(--ink-3)' },
  coding: { label: 'Coding', color: 'var(--ink-1)' },
  language: { label: 'Language', color: 'var(--ink-6)' },
  music: { label: 'Music', color: 'var(--ink-4)' },
  fitness: { label: 'Fitness', color: 'var(--ink-2)' },
  dsa: { label: 'DSA', color: 'var(--ink-5)' },
};

export const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  inbox: { label: 'Inbox', color: 'var(--ink-5)' },
  next: { label: 'Next', color: 'var(--ink-3)' },
  doing: { label: 'Doing', color: 'var(--ink-1)' },
  waiting: { label: 'Waiting', color: 'var(--ink-4)' },
  blocked: { label: 'Blocked', color: 'var(--ink-2)' },
  done: { label: 'Done', color: 'var(--ink-6)' },
};

export const STATUS_ORDER: TaskStatus[] = ['inbox', 'next', 'doing', 'waiting', 'blocked', 'done'];

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string; rank: number }> = {
  critical: { label: 'Critical', color: 'var(--ink-1)', rank: 0 },
  important: { label: 'Important', color: 'var(--ink-2)', rank: 1 },
  normal: { label: 'Normal', color: 'var(--ink-4)', rank: 2 },
  low: { label: 'Low', color: 'var(--ink-6)', rank: 3 },
};

export const AREA_META: Record<TaskArea, { label: string; color: string }> = {
  college: { label: 'College', color: 'var(--ink-3)' },
  coding: { label: 'Coding', color: 'var(--ink-1)' },
  habits: { label: 'Habits', color: 'var(--ink-2)' },
  personal: { label: 'Personal', color: 'var(--ink-4)' },
  admin: { label: 'Admin', color: 'var(--ink-5)' },
};

export const EXAM_TYPE_META: Record<string, { label: string; color: string }> = {
  exam: { label: 'Exam', color: 'var(--ink-1)' },
  assignment: { label: 'Assignment', color: 'var(--ink-3)' },
  project: { label: 'Project', color: 'var(--ink-2)' },
  personal: { label: 'Personal', color: 'var(--ink-5)' },
  dsa: { label: 'DSA', color: 'var(--ink-4)' },
};

// ─── Navigation ───────────────────────────────────────────────────────────────
// Single source of truth for every module name in the product. The sidebar, the
// mobile tab bar, the command palette, each page heading and the Help sheet all
// read this list, so a feature can never be called two different things.
export type ModuleGroup = 'today' | 'plan' | 'progress';

export interface ModuleNavEntry {
  id: ModuleId;
  /** Canonical name: page heading, sidebar, palette. */
  label: string;
  /** Compact form for tight surfaces (mobile tab bar). */
  shortLabel: string;
  /** One instructional sentence: why you would open this. */
  blurb: string;
  group: ModuleGroup;
}

export const MODULE_GROUPS: { key: ModuleGroup; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'plan', label: 'Plan' },
  { key: 'progress', label: 'Progress' },
];

export const MODULE_NAV: ModuleNavEntry[] = [
  { id: 'dashboard', label: 'Home', shortLabel: 'Home', group: 'today',
    blurb: 'Your day at a glance \u2014 what needs doing next, and how the week is going.' },
  { id: 'tracker', label: 'Daily Tracker', shortLabel: 'Log', group: 'today',
    blurb: 'Record how long you studied each subject today \u2014 one record per day.' },
  { id: 'sessions', label: 'Focus Sessions', shortLabel: 'Focus', group: 'today',
    blurb: 'Start a timer for a subject, or log a session you already finished.' },
  { id: 'tasks', label: 'Tasks', shortLabel: 'Tasks', group: 'today',
    blurb: 'Everything you have to do, grouped by when it is due.' },
  { id: 'habits', label: 'Habits', shortLabel: 'Habits', group: 'today',
    blurb: 'The routines you want to repeat, and how many days in a row you kept them.' },
  { id: 'timetable', label: 'Timetable', shortLabel: 'Timetable', group: 'plan',
    blurb: 'Your weekly class schedule \u2014 tap any empty slot to add a class, tap a class to edit it.' },
  { id: 'calendar', label: 'Calendar', shortLabel: 'Calendar', group: 'plan',
    blurb: 'One month view of deadlines, exams and the study time you logged.' },
  { id: 'roadmap', label: 'Roadmap', shortLabel: 'Roadmap', group: 'plan',
    blurb: 'The skills and projects you are building, with weekly hours against each.' },
  { id: 'notes', label: 'Notes', shortLabel: 'Notes', group: 'plan',
    blurb: 'Your markdown notes, and the links you want to keep.' },
  { id: 'analytics', label: 'Analytics', shortLabel: 'Analytics', group: 'progress',
    blurb: 'Charts that answer \u201chow am I actually doing this month?\u201d' },
  { id: 'reports', label: 'Reports', shortLabel: 'Reports', group: 'progress',
    blurb: 'A weekly or monthly summary you can copy, download or print.' },
  { id: 'dsa', label: 'DSA Plan', shortLabel: 'DSA', group: 'progress',
    blurb: 'Practice problems per topic \u2014 off until you turn it on in Settings \u2192 DSA tracking.' },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings', group: 'progress',
    blurb: 'Your profile, subjects, study targets, appearance and data.' },
];

/** Nav entry for a module; falls back to Home so a heading is never blank. */
export function moduleMeta(id: ModuleId): ModuleNavEntry {
  return MODULE_NAV.find((m) => m.id === id) ?? MODULE_NAV[0];
}

/** Modules shown in the sidebar list (Settings lives in the sidebar footer). */
export const NAV_MODULES = MODULE_NAV.filter((m) => m.id !== 'settings');

// ─── Seed content ─────────────────────────────────────────────────────────────
export const SUBJECT_SEED: Subject[] = [
  { id: 'maths', name: 'Maths', category: 'college', color: 'var(--ink-1)' },
  { id: 'chem', name: 'Chemistry', category: 'college', color: 'var(--ink-2)' },
  { id: 'cs', name: 'Computer Science', category: 'college', color: 'var(--ink-3)' },
  { id: 'cprog', name: 'C Programming', category: 'college', color: 'var(--ink-4)' },
  { id: 'yoga', name: 'Yoga', category: 'college', color: 'var(--ink-5)' },
  { id: 'chinese', name: 'Chinese', category: 'language', color: 'var(--ink-6)' },
  { id: 'bio', name: 'Bio', category: 'college', color: 'var(--ink-7)' },
  { id: 'htmlcss', name: 'HTML & CSS', category: 'coding', color: 'var(--ink-8)' },
  { id: 'js', name: 'JavaScript', category: 'coding', color: 'var(--ink-9)' },
  { id: 'java', name: 'Java', category: 'coding', color: 'var(--ink-10)' },
  { id: 'react', name: 'React', category: 'coding', color: 'var(--ink-2)' },
  { id: 'c', name: 'C', category: 'coding', color: 'var(--ink-5)' },
  { id: 'cpp', name: 'C++', category: 'coding', color: 'var(--ink-7)' },
  { id: 'guitar', name: 'Guitar', category: 'music', color: 'var(--ink-4)' },
  { id: 'gym', name: 'Gym', category: 'fitness', color: 'var(--ink-6)' },
];

export const HABIT_SEED: { name: string; icon: string; color: string; targetPerWeek: number }[] = [
  { name: 'Wake Before 7', icon: 'sunrise', color: 'var(--ink-1)', targetPerWeek: 6 },
  { name: 'Study Block Completed', icon: 'book-open', color: 'var(--ink-3)', targetPerWeek: 6 },
  { name: 'Exercise', icon: 'dumbbell', color: 'var(--ink-2)', targetPerWeek: 4 },
  { name: 'Drink 2L Water', icon: 'glass-water', color: 'var(--ink-4)', targetPerWeek: 7 },
  { name: 'Read 20 Mins', icon: 'book-marked', color: 'var(--ink-5)', targetPerWeek: 5 },
  { name: 'Sleep 7+ Hours', icon: 'moon-star', color: 'var(--ink-6)', targetPerWeek: 6 },
  { name: 'No Social Media Before Studying', icon: 'ban', color: 'var(--ink-2)', targetPerWeek: 6 },
  { name: 'Gym', icon: 'bike', color: 'var(--ink-7)', targetPerWeek: 3 },
  { name: 'Guitar', icon: 'music', color: 'var(--ink-8)', targetPerWeek: 3 },
];

export const DSA_TOPICS_SEED: { name: string; difficulty: 'easy' | 'medium' | 'hard'; problemsTotal: number }[] = [
  { name: 'Arrays', difficulty: 'easy', problemsTotal: 45 },
  { name: 'Strings', difficulty: 'easy', problemsTotal: 35 },
  { name: 'Recursion', difficulty: 'medium', problemsTotal: 30 },
  { name: 'Sorting', difficulty: 'easy', problemsTotal: 20 },
  { name: 'Searching', difficulty: 'easy', problemsTotal: 18 },
  { name: 'Linked Lists', difficulty: 'medium', problemsTotal: 22 },
  { name: 'Stacks', difficulty: 'easy', problemsTotal: 16 },
  { name: 'Queues', difficulty: 'easy', problemsTotal: 14 },
  { name: 'Trees', difficulty: 'medium', problemsTotal: 28 },
  { name: 'Heaps', difficulty: 'medium', problemsTotal: 12 },
  { name: 'Graphs', difficulty: 'hard', problemsTotal: 25 },
  { name: 'Greedy', difficulty: 'medium', problemsTotal: 18 },
  { name: 'Dynamic Programming', difficulty: 'hard', problemsTotal: 22 },
];

export const SKILL_SEED: {
  id: string; name: string; color: string; currentLevel: number; targetLevel: number;
  weeklyHoursGoal: number; nextMilestone: string; resources: string; targetDateOffsetDays: number;
}[] = [
  { id: 'htmlcss', name: 'HTML & CSS', color: 'var(--ink-1)', currentLevel: 78, targetLevel: 90, weeklyHoursGoal: 3, nextMilestone: 'Build responsive portfolio layout', resources: 'https://developer.mozilla.org\nhttps://web.dev/learn/css', targetDateOffsetDays: 30 },
  { id: 'js', name: 'JavaScript', color: 'var(--ink-2)', currentLevel: 62, targetLevel: 85, weeklyHoursGoal: 5, nextMilestone: 'Master array methods & closures', resources: 'https://javascript.info', targetDateOffsetDays: 60 },
  { id: 'java', name: 'Java', color: 'var(--ink-3)', currentLevel: 45, targetLevel: 75, weeklyHoursGoal: 4, nextMilestone: 'OOP mini-project: library system', resources: 'https://dev.java/learn', targetDateOffsetDays: 75 },
  { id: 'react', name: 'React', color: 'var(--ink-4)', currentLevel: 38, targetLevel: 80, weeklyHoursGoal: 5, nextMilestone: 'Hooks deep-dive + context API', resources: 'https://react.dev/learn', targetDateOffsetDays: 90 },
  { id: 'c', name: 'C', color: 'var(--ink-5)', currentLevel: 55, targetLevel: 70, weeklyHoursGoal: 3, nextMilestone: 'Pointers & dynamic memory lab', resources: 'https://en.cppreference.com', targetDateOffsetDays: 45 },
  { id: 'cpp', name: 'C++', color: 'var(--ink-6)', currentLevel: 25, targetLevel: 70, weeklyHoursGoal: 3, nextMilestone: 'STL containers crash course', resources: 'https://www.learncpp.com', targetDateOffsetDays: 120 },
  { id: 'guitar', name: 'Guitar', color: 'var(--ink-7)', currentLevel: 30, targetLevel: 60, weeklyHoursGoal: 2, nextMilestone: 'Play 3 chords cleanly', resources: '', targetDateOffsetDays: 60 },
];

/** Legacy export kept for pickers — prefer INK_VARS (DOM) or chartPalette(dark) (canvas). */
export const CHART_PALETTE: string[] = [...CHART_RAMP.dark];

// ─── Timetable defaults ───────────────────────────────────────────────────────
export const TIMETABLE_DAYS_SEED: TimetableDay[] = [
  { id: 'mon', label: 'Monday', short: 'Mon' },
  { id: 'tue', label: 'Tuesday', short: 'Tue' },
  { id: 'wed', label: 'Wednesday', short: 'Wed' },
  { id: 'thu', label: 'Thursday', short: 'Thu' },
  { id: 'fri', label: 'Friday', short: 'Fri' },
  { id: 'sat', label: 'Saturday', short: 'Sat' },
];

export const TIMETABLE_CATEGORIES_SEED: TimetableCategory[] = [
  { id: 'cat-lecture', name: 'Lecture', color: 'var(--ink-1)' },
  { id: 'cat-lab', name: 'Lab', color: 'var(--ink-3)' },
  { id: 'cat-tutorial', name: 'Tutorial', color: 'var(--ink-5)' },
  { id: 'cat-study', name: 'Self study', color: 'var(--ink-7)' },
  { id: 'cat-break', name: 'Break', color: 'var(--ink-9)' },
];

export const TIMETABLE_SETTINGS_DEFAULT: TimetableSettings = {
  dayStart: '08:00',
  dayEnd: '18:00',
  slotMinutes: 30,
};

export const TIMETABLE_STATUS_META: Record<TimetableStatus, { label: string; hint: string }> = {
  scheduled: { label: 'Scheduled', hint: 'Planned as usual' },
  completed: { label: 'Completed', hint: 'This slot already happened' },
  cancelled: { label: 'Cancelled', hint: 'Skipped this week' },
  moved: { label: 'Moved', hint: 'Held at a different time' },
};

export const DASHBOARD_WIDGETS_DEFAULT = [
  'hero', 'starthere', 'kpis', 'focus', 'habits', 'weekly', 'exams',
];

export const DEFAULT_PROFILE = {
  name: 'Aarav',
  university: 'SRM Institute of Science and Technology',
  degree: 'B.Tech CSE',
  semester: 1,
  dailyTargetHours: 4,
  weeklyCodingTargetHours: 15,
};

export const STREAK_MILESTONES = [7, 14, 30, 50, 100, 200];
