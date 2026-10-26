import type {
  Subject, SubjectCategory, TaskStatus, TaskPriority, TaskArea,
  ModuleId, Habit, DsaTopic,
} from './types';

// ─── Category / status / priority metadata ───────────────────────────────────
export const CATEGORY_META: Record<SubjectCategory, { label: string; color: string }> = {
  college: { label: 'College', color: '#a78bfa' },
  coding: { label: 'Coding', color: '#22d3ee' },
  language: { label: 'Language', color: '#fbbf24' },
  music: { label: 'Music', color: '#e879f9' },
  fitness: { label: 'Fitness', color: '#34d399' },
  dsa: { label: 'DSA', color: '#f43f5e' },
};

export const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  inbox: { label: 'Inbox', color: '#94a3b8' },
  next: { label: 'Next', color: '#22d3ee' },
  doing: { label: 'Doing', color: '#a78bfa' },
  waiting: { label: 'Waiting', color: '#fbbf24' },
  blocked: { label: 'Blocked', color: '#f43f5e' },
  done: { label: 'Done', color: '#34d399' },
};

export const STATUS_ORDER: TaskStatus[] = ['inbox', 'next', 'doing', 'waiting', 'blocked', 'done'];

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string; rank: number }> = {
  critical: { label: 'Critical', color: '#f43f5e', rank: 0 },
  important: { label: 'Important', color: '#fb923c', rank: 1 },
  normal: { label: 'Normal', color: '#22d3ee', rank: 2 },
  low: { label: 'Low', color: '#94a3b8', rank: 3 },
};

export const AREA_META: Record<TaskArea, { label: string; color: string }> = {
  college: { label: 'College', color: '#a78bfa' },
  coding: { label: 'Coding', color: '#22d3ee' },
  habits: { label: 'Habits', color: '#34d399' },
  personal: { label: 'Personal', color: '#f472b6' },
  admin: { label: 'Admin', color: '#fbbf24' },
};

export const EXAM_TYPE_META: Record<string, { label: string; color: string }> = {
  exam: { label: 'Exam', color: '#f43f5e' },
  assignment: { label: 'Assignment', color: '#fbbf24' },
  project: { label: 'Project', color: '#22d3ee' },
  personal: { label: 'Personal', color: '#f472b6' },
  dsa: { label: 'DSA', color: '#a78bfa' },
};

// ─── Navigation ───────────────────────────────────────────────────────────────
export const MODULE_NAV: { id: ModuleId; label: string; desc: string; group: 'core' | 'plan' | 'data' }[] = [
  { id: 'dashboard', label: 'Dashboard', desc: 'Overview & live KPIs', group: 'core' },
  { id: 'tracker', label: 'Daily Tracker', desc: 'Log today\u2019s study', group: 'core' },
  { id: 'sessions', label: 'Sessions', desc: 'Focus timer & session log', group: 'core' },
  { id: 'tasks', label: 'Tasks', desc: 'Kanban, calendar & focus', group: 'core' },
  { id: 'habits', label: 'Habits', desc: 'Streaks & consistency', group: 'core' },
  { id: 'analytics', label: 'Analytics', desc: '20+ interactive charts', group: 'data' },
  { id: 'calendar', label: 'Calendar', desc: 'Unified timeline', group: 'plan' },
  { id: 'roadmap', label: 'Roadmap', desc: 'Skills & projects', group: 'plan' },
  { id: 'dsa', label: 'DSA Plan', desc: 'Locked until Sem 1 ends', group: 'plan' },
  { id: 'notes', label: 'Notes', desc: 'Markdown & resources', group: 'plan' },
  { id: 'reports', label: 'Reports', desc: 'Summaries & export', group: 'data' },
  { id: 'settings', label: 'Settings', desc: 'Profile, themes & AI', group: 'data' },
];

// ─── Seed content ─────────────────────────────────────────────────────────────
export const SUBJECT_SEED: Subject[] = [
  { id: 'maths', name: 'Maths', category: 'college', color: '#f472b6' },
  { id: 'chem', name: 'Chemistry', category: 'college', color: '#a78bfa' },
  { id: 'cs', name: 'Computer Science', category: 'college', color: '#22d3ee' },
  { id: 'cprog', name: 'C Programming', category: 'college', color: '#fb923c' },
  { id: 'yoga', name: 'Yoga', category: 'college', color: '#34d399' },
  { id: 'chinese', name: 'Chinese', category: 'language', color: '#fbbf24' },
  { id: 'bio', name: 'Bio', category: 'college', color: '#4ade80' },
  { id: 'htmlcss', name: 'HTML & CSS', category: 'coding', color: '#fb7185' },
  { id: 'js', name: 'JavaScript', category: 'coding', color: '#facc15' },
  { id: 'java', name: 'Java', category: 'coding', color: '#f87171' },
  { id: 'react', name: 'React', category: 'coding', color: '#2dd4bf' },
  { id: 'c', name: 'C', category: 'coding', color: '#94a3b8' },
  { id: 'cpp', name: 'C++', category: 'coding', color: '#c084fc' },
  { id: 'guitar', name: 'Guitar', category: 'music', color: '#e879f9' },
  { id: 'gym', name: 'Gym', category: 'fitness', color: '#38bdf8' },
];

export const HABIT_SEED: { name: string; icon: string; color: string; targetPerWeek: number }[] = [
  { name: 'Wake Before 7', icon: 'sunrise', color: '#fbbf24', targetPerWeek: 6 },
  { name: 'Study Block Completed', icon: 'book-open', color: '#22d3ee', targetPerWeek: 6 },
  { name: 'Exercise', icon: 'dumbbell', color: '#34d399', targetPerWeek: 4 },
  { name: 'Drink 2L Water', icon: 'glass-water', color: '#38bdf8', targetPerWeek: 7 },
  { name: 'Read 20 Mins', icon: 'book-marked', color: '#a78bfa', targetPerWeek: 5 },
  { name: 'Sleep 7+ Hours', icon: 'moon-star', color: '#818cf8', targetPerWeek: 6 },
  { name: 'No Social Media Before Studying', icon: 'ban', color: '#f43f5e', targetPerWeek: 6 },
  { name: 'Gym', icon: 'bike', color: '#2dd4bf', targetPerWeek: 3 },
  { name: 'Guitar', icon: 'music', color: '#e879f9', targetPerWeek: 3 },
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
  { id: 'htmlcss', name: 'HTML & CSS', color: '#fb7185', currentLevel: 78, targetLevel: 90, weeklyHoursGoal: 3, nextMilestone: 'Build responsive portfolio layout', resources: 'https://developer.mozilla.org\nhttps://web.dev/learn/css', targetDateOffsetDays: 30 },
  { id: 'js', name: 'JavaScript', color: '#facc15', currentLevel: 62, targetLevel: 85, weeklyHoursGoal: 5, nextMilestone: 'Master array methods & closures', resources: 'https://javascript.info', targetDateOffsetDays: 60 },
  { id: 'java', name: 'Java', color: '#f87171', currentLevel: 45, targetLevel: 75, weeklyHoursGoal: 4, nextMilestone: 'OOP mini-project: library system', resources: 'https://dev.java/learn', targetDateOffsetDays: 75 },
  { id: 'react', name: 'React', color: '#2dd4bf', currentLevel: 38, targetLevel: 80, weeklyHoursGoal: 5, nextMilestone: 'Hooks deep-dive + context API', resources: 'https://react.dev/learn', targetDateOffsetDays: 90 },
  { id: 'c', name: 'C', color: '#94a3b8', currentLevel: 55, targetLevel: 70, weeklyHoursGoal: 3, nextMilestone: 'Pointers & dynamic memory lab', resources: 'https://en.cppreference.com', targetDateOffsetDays: 45 },
  { id: 'cpp', name: 'C++', color: '#c084fc', currentLevel: 25, targetLevel: 70, weeklyHoursGoal: 3, nextMilestone: 'STL containers crash course', resources: 'https://www.learncpp.com', targetDateOffsetDays: 120 },
  { id: 'guitar', name: 'Guitar', color: '#e879f9', currentLevel: 30, targetLevel: 60, weeklyHoursGoal: 2, nextMilestone: 'Play 3 chords cleanly', resources: '', targetDateOffsetDays: 60 },
];

export const CHART_PALETTE = [
  '#22d3ee', '#a78bfa', '#34d399', '#f472b6', '#fbbf24',
  '#fb7185', '#2dd4bf', '#e879f9', '#fb923c', '#4ade80',
];

export const DASHBOARD_WIDGETS_DEFAULT = [
  'hero', 'kpis', 'focus', 'habits', 'weekly', 'donut', 'exams',
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
