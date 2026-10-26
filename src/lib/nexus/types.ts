// ─── NexusOS core domain types ────────────────────────────────────────────────
export type ID = string;

export type ThemeId = 'dark' | 'light' | 'oled' | 'cyberpunk';
export type ModuleId =
  | 'dashboard' | 'tracker' | 'sessions' | 'tasks' | 'habits' | 'analytics'
  | 'roadmap' | 'dsa' | 'calendar' | 'notes' | 'reports' | 'settings';

export type DayType = 'college' | 'weekend';
export type SubjectCategory = 'college' | 'coding' | 'language' | 'music' | 'fitness' | 'dsa';

export interface UserProfile {
  name: string;
  university: string;
  degree: string;
  semester: number;
  dailyTargetHours: number;
  weeklyCodingTargetHours: number;
}

export interface Subject {
  id: ID;
  name: string;
  category: SubjectCategory;
  color: string;
}

/** One record per calendar day. */
export interface DailyLog {
  date: string; // yyyy-MM-dd
  dayType: DayType;
  sleepHours: number; // 0-14, 0.5 steps
  energy: number; // 1-5
  notes: string;
  minutes: Record<ID, number>; // subjectId -> focused minutes that day
  updatedAt: string;
}

export interface StudySession {
  id: ID;
  date: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  subjectId: ID;
  category: SubjectCategory;
  durationMin: number;
  concentration: number; // 1-5
  energy: number; // 1-5
  tags: string[];
  notes: string;
  createdAt: string;
}

export type TaskStatus = 'inbox' | 'next' | 'doing' | 'waiting' | 'blocked' | 'done';
export type TaskPriority = 'critical' | 'important' | 'normal' | 'low';
export type TaskArea = 'college' | 'coding' | 'habits' | 'personal' | 'admin';
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Subtask { id: ID; title: string; done: boolean; }

export interface Task {
  id: ID;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  area: TaskArea;
  dueDate: string | null;   // yyyy-MM-dd
  startDate: string | null; // yyyy-MM-dd
  estimatedHours: number | null;
  actualHours: number | null;
  subtasks: Subtask[];
  recurrence: Recurrence;
  tags: string[];
  createdAt: string;
  completedAt: string | null;
}

export interface Habit {
  id: ID;
  name: string;
  icon: string; // lucide icon key, see HABIT_ICON_MAP in module
  color: string;
  targetPerWeek: number;
  archived: boolean;
  createdAt: string;
}
export type HabitRecords = Record<ID, Record<string, boolean>>; // habitId -> dateKey -> done

export interface Skill {
  id: ID;
  name: string;
  color: string;
  status: 'active' | 'paused' | 'completed';
  currentLevel: number; // 0-100
  targetLevel: number;  // 0-100
  weeklyHoursGoal: number;
  nextMilestone: string;
  resources: string; // newline separated urls
  notes: string;
  targetDate: string | null;
}

export interface Project {
  id: ID;
  name: string;
  description: string;
  repoUrl: string;
  liveUrl: string;
  techStack: string[];
  status: 'idea' | 'planning' | 'in-progress' | 'shipped';
  hoursLogged: number;
  dueDate: string | null;
  createdAt: string;
}

export interface DsaTopic {
  id: ID;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  problemsSolved: number;
  problemsTotal: number;
  mastery: number; // 0-100
}

export interface ExamEvent {
  id: ID;
  title: string;
  date: string; // yyyy-MM-dd
  type: 'exam' | 'assignment' | 'project' | 'personal' | 'dsa';
  notes: string;
}

export interface Note {
  id: ID;
  title: string;
  content: string; // markdown
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Resource {
  id: ID;
  title: string;
  url: string;
  category: string;
  notes: string;
  createdAt: string;
}

export interface ChatMessage {
  id: ID;
  role: 'user' | 'assistant';
  content: string;
  ts: number;
  provider?: string;
}

export interface Settings {
  theme: ThemeId;
  confettiEnabled: boolean;
  reduce3d: boolean;
  aiProvider: 'nexus' | 'gemini';
  geminiKey: string;
  geminiModel: string;
  dashboardWidgets: string[]; // ordered widget ids, controls visibility+order on dashboard
}

/** The full persisted data shape. */
export interface NexusData {
  profile: UserProfile;
  settings: Settings;
  subjects: Subject[];
  skills: Skill[];
  dailyLogs: Record<string, DailyLog>;
  sessions: StudySession[];
  tasks: Task[];
  habits: Habit[];
  habitRecords: HabitRecords;
  projects: Project[];
  notes: Note[];
  resources: Resource[];
  exams: ExamEvent[];
  dsaActive: boolean;
  dsaTopics: DsaTopic[];
  chat: ChatMessage[];
  celebrated: number[]; // streak milestones already celebrated
}

/** Compact stats snapshot sent to the AI coach. */
export interface AiStats {
  todayMinutes: number;
  weekMinutes: number;
  avgDayMinutes: number;
  streak: { current: number; best: number };
  topSubjects: { name: string; minutes: number }[];
  neglectedSubjects: string[];
  codingHoursThisWeek: number;
  codingTarget: number;
  tasks: { overdue: number; dueToday: number; doing: number; inbox: number; done7d: number };
  habitSummary: { name: string; done7: number; target: number }[];
  dsaActive: boolean;
  dsaSolved: number;
  sleepAvg: number;
  energyAvg: number;
  profile: UserProfile;
}
