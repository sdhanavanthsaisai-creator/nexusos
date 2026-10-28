'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import type {
  ChatMessage, DailyLog, ExamEvent, Habit, HabitRecords, ID, ModuleId, NexusData, Note,
  Project, Recurrence, Settings, StudySession, Subject, SubjectCategory,
  Subtask, Task, TaskArea, TaskPriority, TaskStatus, TimetableCategory, TimetableDay,
  TimetableEvent, TimetableSettings, UserProfile,
} from './types';
import { buildSeed, buildTimetableSeed } from './seed';
import { INK_VARS } from './constants';
import { parseTimetableImport } from './timetable';
import { addDays, addDaysKey, dateKey, todayKey, uid } from './utils';

const STORAGE_KEY = 'nexusos-data-v1';
const SUBTASK: (t: string) => Subtask = (title) => ({ id: uid(), title, done: false });

// ─── Persisted data store ─────────────────────────────────────────────────────
export interface NexusStore extends NexusData {
  _hydrated: boolean;
  setHydrated: (v: boolean) => void;
  setProfile: (patch: Partial<UserProfile>) => void;
  setSetting: (patch: Partial<Settings>) => void;
  toggleDsa: () => void;
  addSubject: (name: string, category: SubjectCategory, color: string) => void;
  updateSubject: (id: ID, patch: Partial<Subject>) => void;
  deleteSubject: (id: ID) => void;
  upsertDailyLog: (date: string, patch: Partial<DailyLog>) => void;
  setDayMinutes: (date: string, subjectId: ID, minutes: number) => void;
  addSession: (input: Partial<StudySession> & { subjectId: ID; durationMin: number; date: string; startTime: string }) => StudySession;
  updateSession: (id: ID, patch: Partial<StudySession>) => void;
  deleteSession: (id: ID) => void;
  addTask: (input: Partial<Task> & { title: string }) => Task;
  updateTask: (id: ID, patch: Partial<Task>) => void;
  deleteTask: (id: ID) => void;
  bulkUpdateTasks: (ids: ID[], patch: Partial<Task>) => void;
  bulkDeleteTasks: (ids: ID[]) => void;
  completeTask: (id: ID) => void;
  reopenTask: (id: ID) => void;
  addSubtask: (taskId: ID, title: string) => void;
  toggleSubtask: (taskId: ID, subId: ID) => void;
  deleteSubtask: (taskId: ID, subId: ID) => void;
  addHabit: (input: { name: string; icon: string; color: string; targetPerWeek: number }) => void;
  updateHabit: (id: ID, patch: Partial<Habit>) => void;
  deleteHabit: (id: ID) => void;
  toggleHabitDate: (habitId: ID, date: string) => void;
  updateSkill: (id: ID, patch: Partial<NexusData['skills'][number]>) => void;
  addProject: (input: Partial<Project> & { name: string }) => void;
  updateProject: (id: ID, patch: Partial<Project>) => void;
  deleteProject: (id: ID) => void;
  addNote: (input?: Partial<Note>) => Note;
  updateNote: (id: ID, patch: Partial<Note>) => void;
  deleteNote: (id: ID) => void;
  addResource: (input: { title: string; url: string; category: string; notes?: string }) => void;
  deleteResource: (id: ID) => void;
  addExam: (input: { title: string; date: string; type: ExamEvent['type']; notes?: string }) => void;
  updateExam: (id: ID, patch: Partial<ExamEvent>) => void;
  deleteExam: (id: ID) => void;
  updateDsaTopic: (id: ID, patch: Partial<NexusData['dsaTopics'][number]>) => void;
  bumpDsaProblem: (id: ID, delta: number) => void;
  addTimetableEvent: (input: Partial<TimetableEvent> & { title: string; dayId: ID; start: string; end: string; categoryId: ID }) => TimetableEvent;
  updateTimetableEvent: (id: ID, patch: Partial<TimetableEvent>) => void;
  deleteTimetableEvent: (id: ID) => void;
  updateTimetableSettings: (patch: Partial<TimetableSettings>) => void;
  addTimetableDay: (label: string, short: string) => void;
  updateTimetableDay: (id: ID, patch: Partial<TimetableDay>) => void;
  deleteTimetableDay: (id: ID) => void;
  addTimetableCategory: (name: string, color: string) => void;
  updateTimetableCategory: (id: ID, patch: Partial<TimetableCategory>) => void;
  deleteTimetableCategory: (id: ID) => void;
  importTimetable: (json: unknown) => { ok: boolean; error?: string };
  resetTimetable: () => void;
  addChat: (msg: Omit<ChatMessage, 'id' | 'ts'> & { ts?: number }) => void;
  clearChat: () => void;
  celebrate: (milestone: number) => void;
  importData: (json: unknown) => { ok: boolean; error?: string };
  resetToSeed: () => void;
  clearAllData: () => void;
}

const emptyState: NexusData = {
  profile: { name: 'Student', university: '', degree: '', semester: 1, dailyTargetHours: 4, weeklyCodingTargetHours: 15 },
  settings: {
    theme: 'dark', confettiEnabled: true, reduce3d: false,
    aiProvider: 'nexus', geminiKey: '', geminiModel: 'gemini-2.0-flash',
    dashboardWidgets: ['hero', 'kpis', 'focus', 'habits', 'weekly', 'donut', 'exams'],
  },
  subjects: [], skills: [], dailyLogs: {}, sessions: [], tasks: [],
  habits: [], habitRecords: {}, projects: [], notes: [], resources: [],
  exams: [],
  timetable: { ...buildTimetableSeed(), events: [] },
  dsaActive: false, dsaTopics: [], chat: [], celebrated: [],
};

export const useNexus = create<NexusStore>()(
  persist(
    (set, get) => ({
      ...buildSeed(),
      _hydrated: false,
      setHydrated: (v) => set({ _hydrated: v }),

      // ── profile & settings ──
      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      setSetting: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      toggleDsa: () => set((s) => ({ dsaActive: !s.dsaActive })),

      // ── subjects ──
      addSubject: (name, category, color) =>
        set((s) => ({ subjects: [...s.subjects, { id: `sub-${uid()}`, name, category, color }] })),
      updateSubject: (id, patch) =>
        set((s) => ({ subjects: s.subjects.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteSubject: (id) =>
        set((s) => {
          const dailyLogs: typeof s.dailyLogs = {};
          for (const [k, log] of Object.entries(s.dailyLogs)) {
            const { [id]: _drop, ...rest } = log.minutes;
            dailyLogs[k] = { ...log, minutes: rest };
          }
          return {
            subjects: s.subjects.filter((x) => x.id !== id),
            dailyLogs,
            sessions: s.sessions.filter((x) => x.subjectId !== id),
          };
        }),

      // ── daily logs (one per date — duplicates impossible by key) ──
      upsertDailyLog: (date, patch) =>
        set((s) => {
          const prev: DailyLog = s.dailyLogs[date] ?? {
            date, dayType: 'college', sleepHours: 7.5, energy: 3, notes: '', minutes: {},
            updatedAt: new Date().toISOString(),
          };
          const day = new Date(date + 'T00:00:00');
          const dow = day.getDay();
          const merged: DailyLog = { ...prev, ...patch, date, updatedAt: new Date().toISOString() };
          if (!patch.dayType && !s.dailyLogs[date]) {
            merged.dayType = dow === 0 || dow === 6 ? 'weekend' : 'college';
          }
          return { dailyLogs: { ...s.dailyLogs, [date]: merged } };
        }),
      setDayMinutes: (date, subjectId, minutes) =>
        set((s) => {
          const prev: DailyLog = s.dailyLogs[date] ?? {
            date, dayType: 'college', sleepHours: 7.5, energy: 3, notes: '', minutes: {},
            updatedAt: new Date().toISOString(),
          };
          const m = Math.max(0, Math.round(minutes));
          const nextMinutes = { ...prev.minutes };
          if (m === 0) delete nextMinutes[subjectId];
          else nextMinutes[subjectId] = m;
          return {
            dailyLogs: {
              ...s.dailyLogs,
              [date]: { ...prev, minutes: nextMinutes, updatedAt: new Date().toISOString() },
            },
          };
        }),

      // ── sessions ──
      addSession: (input) => {
        const session: StudySession = {
          id: uid(),
          date: input.date,
          startTime: input.startTime,
          endTime: input.endTime ?? '',
          subjectId: input.subjectId,
          category: input.category ?? get().subjects.find((x) => x.id === input.subjectId)?.category ?? 'college',
          durationMin: Math.max(1, Math.round(input.durationMin)),
          concentration: input.concentration ?? 3,
          energy: input.energy ?? 3,
          tags: input.tags ?? [],
          notes: input.notes ?? '',
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ sessions: [session, ...s.sessions] }));
        // also merge minutes into the daily log so tracker & analytics stay in sync
        get().setDayMinutes(session.date, session.subjectId, (get().dailyLogs[session.date]?.minutes?.[session.subjectId] ?? 0) + session.durationMin);
        return session;
      },
      updateSession: (id, patch) =>
        set((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteSession: (id) => set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) })),

      // ── tasks ──
      addTask: (input) => {
        const task: Task = {
          id: uid(),
          title: input.title,
          description: input.description ?? '',
          status: input.status ?? 'inbox',
          priority: input.priority ?? 'normal',
          area: input.area ?? 'college',
          dueDate: input.dueDate ?? null,
          startDate: input.startDate ?? null,
          estimatedHours: input.estimatedHours ?? null,
          actualHours: input.actualHours ?? null,
          subtasks: (input.subtasks ?? []).map((st) => (typeof st === 'string' ? SUBTASK(st) : st)),
          recurrence: input.recurrence ?? 'none',
          tags: input.tags ?? [],
          createdAt: new Date().toISOString(),
          completedAt: null,
        };
        set((s) => ({ tasks: [task, ...s.tasks] }));
        return task;
      },
      updateTask: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((x) => x.id !== id) })),
      bulkUpdateTasks: (ids, patch) =>
        set((s) => ({ tasks: s.tasks.map((x) => (ids.includes(x.id) ? { ...x, ...patch } : x)) })),
      bulkDeleteTasks: (ids) => set((s) => ({ tasks: s.tasks.filter((x) => !ids.includes(x.id)) })),
      completeTask: (id) => {
        const task = get().tasks.find((x) => x.id === id);
        if (!task) return;
        set((s) => ({
          tasks: s.tasks.map((x) =>
            x.id === id ? { ...x, status: 'done' as TaskStatus, completedAt: new Date().toISOString() } : x,
          ),
        }));
        // spawn next occurrence for recurring tasks
        if (task.recurrence && task.recurrence !== 'none') {
          const step = task.recurrence === 'daily' ? 1 : task.recurrence === 'weekly' ? 7 : 30;
          const base = task.dueDate ?? todayKey();
          set((s) => ({
            tasks: [
              {
                ...task,
                id: uid(),
                status: 'next',
                completedAt: null,
                actualHours: null,
                dueDate: addDaysKey(base, step),
                startDate: task.startDate ? addDaysKey(task.startDate, step) : null,
                subtasks: task.subtasks.map((st) => ({ ...st, done: false })),
                createdAt: new Date().toISOString(),
              },
              ...s.tasks,
            ],
          }));
        }
      },
      reopenTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((x) => (x.id === id ? { ...x, status: 'next' as TaskStatus, completedAt: null } : x)),
        })),
      addSubtask: (taskId, title) =>
        set((s) => ({
          tasks: s.tasks.map((x) => (x.id === taskId ? { ...x, subtasks: [...x.subtasks, SUBTASK(title)] } : x)),
        })),
      toggleSubtask: (taskId, subId) =>
        set((s) => ({
          tasks: s.tasks.map((x) =>
            x.id === taskId
              ? { ...x, subtasks: x.subtasks.map((st) => (st.id === subId ? { ...st, done: !st.done } : st)) }
              : x,
          ),
        })),
      deleteSubtask: (taskId, subId) =>
        set((s) => ({
          tasks: s.tasks.map((x) =>
            x.id === taskId ? { ...x, subtasks: x.subtasks.filter((st) => st.id !== subId) } : x,
          ),
        })),

      // ── habits ──
      addHabit: (input) => {
        const id = uid();
        set((s) => ({
          habits: [
            ...s.habits,
            { id, name: input.name, icon: input.icon, color: input.color, targetPerWeek: input.targetPerWeek, archived: false, createdAt: new Date().toISOString() },
          ],
          habitRecords: { ...s.habitRecords, [id]: {} },
        }));
      },
      updateHabit: (id, patch) =>
        set((s) => ({ habits: s.habits.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteHabit: (id) =>
        set((s) => {
          const { [id]: _drop, ...restRecords } = s.habitRecords;
          return { habits: s.habits.filter((x) => x.id !== id), habitRecords: restRecords };
        }),
      toggleHabitDate: (habitId, date) =>
        set((s) => {
          const rec = { ...(s.habitRecords[habitId] ?? {}) };
          if (rec[date]) delete rec[date];
          else rec[date] = true;
          return { habitRecords: { ...s.habitRecords, [habitId]: rec } };
        }),

      // ── skills & projects ──
      updateSkill: (id, patch) =>
        set((s) => ({ skills: s.skills.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      addProject: (input) =>
        set((s) => ({
          projects: [
            {
              id: uid(), name: input.name, description: input.description ?? '',
              repoUrl: input.repoUrl ?? '', liveUrl: input.liveUrl ?? '',
              techStack: input.techStack ?? [], status: input.status ?? 'idea',
              hoursLogged: input.hoursLogged ?? 0, dueDate: input.dueDate ?? null,
              createdAt: new Date().toISOString(),
            },
            ...s.projects,
          ],
        })),
      updateProject: (id, patch) =>
        set((s) => ({ projects: s.projects.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteProject: (id) => set((s) => ({ projects: s.projects.filter((x) => x.id !== id) })),

      // ── notes & resources ──
      addNote: (input) => {
        const note: Note = {
          id: uid(),
          title: input?.title ?? 'Untitled note',
          content: input?.content ?? '',
          tags: input?.tags ?? [],
          pinned: input?.pinned ?? false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ notes: [note, ...s.notes] }));
        return note;
      },
      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: new Date().toISOString() } : x)),
        })),
      deleteNote: (id) => set((s) => ({ notes: s.notes.filter((x) => x.id !== id) })),
      addResource: (input) =>
        set((s) => ({
          resources: [
            { id: uid(), title: input.title, url: input.url, category: input.category, notes: input.notes ?? '', createdAt: new Date().toISOString() },
            ...s.resources,
          ],
        })),
      deleteResource: (id) => set((s) => ({ resources: s.resources.filter((x) => x.id !== id) })),

      // ── exams ──
      addExam: (input) =>
        set((s) => ({
          exams: [...s.exams, { id: uid(), title: input.title, date: input.date, type: input.type, notes: input.notes ?? '' }],
        })),
      updateExam: (id, patch) =>
        set((s) => ({ exams: s.exams.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteExam: (id) => set((s) => ({ exams: s.exams.filter((x) => x.id !== id) })),

      // ── DSA ──
      updateDsaTopic: (id, patch) =>
        set((s) => ({
          dsaTopics: s.dsaTopics.map((x) => {
            if (x.id !== id) return x;
            const next = { ...x, ...patch };
            next.mastery = next.problemsTotal > 0
              ? Math.round((next.problemsSolved / next.problemsTotal) * 100)
              : next.mastery;
            return next;
          }),
        })),
      bumpDsaProblem: (id, delta) =>
        set((s) => ({
          dsaTopics: s.dsaTopics.map((x) => {
            if (x.id !== id) return x;
            const solved = Math.min(x.problemsTotal, Math.max(0, x.problemsSolved + delta));
            return { ...x, problemsSolved: solved, mastery: x.problemsTotal > 0 ? Math.round((solved / x.problemsTotal) * 100) : 0 };
          }),
        })),

      // ── timetable ──
      addTimetableEvent: (input) => {
        const event: TimetableEvent = {
          id: input.id ?? uid(),
          title: input.title.trim(),
          dayId: input.dayId,
          start: input.start,
          end: input.end,
          categoryId: input.categoryId,
          location: input.location ?? '',
          description: input.description ?? '',
          status: input.status ?? 'scheduled',
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ timetable: { ...s.timetable, events: [...s.timetable.events, event] } }));
        return event;
      },
      updateTimetableEvent: (id, patch) =>
        set((s) => ({
          timetable: {
            ...s.timetable,
            events: s.timetable.events.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          },
        })),
      deleteTimetableEvent: (id) =>
        set((s) => ({
          timetable: { ...s.timetable, events: s.timetable.events.filter((x) => x.id !== id) },
        })),
      updateTimetableSettings: (patch) =>
        set((s) => ({
          timetable: { ...s.timetable, settings: { ...s.timetable.settings, ...patch } },
        })),
      addTimetableDay: (label, short) =>
        set((s) => ({
          timetable: {
            ...s.timetable,
            days: [
              ...s.timetable.days,
              { id: `day-${uid()}`, label: label.trim(), short: (short.trim() || label.trim().slice(0, 3)).slice(0, 8) },
            ],
          },
        })),
      updateTimetableDay: (id, patch) =>
        set((s) => ({
          timetable: {
            ...s.timetable,
            days: s.timetable.days.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          },
        })),
      deleteTimetableDay: (id) =>
        set((s) => {
          if (s.timetable.days.length <= 1) return {}; // never leave the grid with no columns
          return {
            timetable: {
              ...s.timetable,
              days: s.timetable.days.filter((x) => x.id !== id),
              events: s.timetable.events.filter((x) => x.dayId !== id),
            },
          };
        }),
      addTimetableCategory: (name, color) =>
        set((s) => ({
          timetable: {
            ...s.timetable,
            categories: [...s.timetable.categories, { id: `cat-${uid()}`, name: name.trim(), color }],
          },
        })),
      updateTimetableCategory: (id, patch) =>
        set((s) => ({
          timetable: {
            ...s.timetable,
            categories: s.timetable.categories.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          },
        })),
      deleteTimetableCategory: (id) =>
        set((s) => {
          const remaining = s.timetable.categories.filter((x) => x.id !== id);
          if (remaining.length === 0) return {}; // keep at least one category for the form
          const fallback = remaining[0].id;
          return {
            timetable: {
              ...s.timetable,
              categories: remaining,
              // never leave events pointing at a deleted category
              events: s.timetable.events.map((x) => (x.categoryId === id ? { ...x, categoryId: fallback } : x)),
            },
          };
        }),
      importTimetable: (json) => {
        const parsed = parseTimetableImport(json);
        if (!parsed.ok) return { ok: false, error: parsed.error };
        set({ timetable: parsed.data });
        return { ok: true };
      },
      resetTimetable: () => set({ timetable: buildTimetableSeed() }),

      // ── chat ──
      addChat: (msg) =>
        set((s) => ({
          chat: [...s.chat, { id: uid(), ts: msg.ts ?? Date.now(), role: msg.role, content: msg.content, provider: msg.provider }],
        })),
      clearChat: () => set({ chat: [] }),
      celebrate: (milestone) =>
        set((s) => ({ celebrated: s.celebrated.includes(milestone) ? s.celebrated : [...s.celebrated, milestone] })),

      // ── data management ──
      importData: (json) => {
        try {
          if (!json || typeof json !== 'object') return { ok: false, error: 'Not an object' };
          const data = json as Partial<NexusData>;
          if (!data.profile || !Array.isArray(data.subjects)) return { ok: false, error: 'Missing required fields (profile, subjects)' };
          const cur = get();
          const parsedTimetable = data.timetable ? parseTimetableImport(data.timetable) : null;
          if (parsedTimetable && !parsedTimetable.ok) return { ok: false, error: `Timetable: ${parsedTimetable.error}` };
          set({
            profile: { ...cur.profile, ...data.profile },
            settings: { ...cur.settings, ...data.settings },
            subjects: data.subjects ?? cur.subjects,
            skills: data.skills ?? cur.skills,
            dailyLogs: data.dailyLogs ?? cur.dailyLogs,
            sessions: data.sessions ?? cur.sessions,
            tasks: data.tasks ?? cur.tasks,
            habits: data.habits ?? cur.habits,
            habitRecords: data.habitRecords ?? cur.habitRecords,
            projects: data.projects ?? cur.projects,
            notes: data.notes ?? cur.notes,
            resources: data.resources ?? cur.resources,
            exams: data.exams ?? cur.exams,
            dsaActive: data.dsaActive ?? cur.dsaActive,
            dsaTopics: data.dsaTopics ?? cur.dsaTopics,
            timetable: parsedTimetable?.ok ? parsedTimetable.data : cur.timetable,
            chat: data.chat ?? cur.chat,
            celebrated: data.celebrated ?? cur.celebrated,
          });
          return { ok: true };
        } catch (e) {
          return { ok: false, error: e instanceof Error ? e.message : 'Import failed' };
        }
      },
      resetToSeed: () => set({ ...buildSeed() }),
      clearAllData: () => set({ ...emptyState }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 3,
      migrate: (persisted, version) => {
        const s = persisted as NexusStore;
        if (version < 2) {
          // Roboto® RB/25 re-skin: remap entity colors onto the monochrome ink ramp.
          try {
            s.subjects = (s.subjects ?? []).map((x, i) => ({ ...x, color: INK_VARS[i % INK_VARS.length] }));
            s.habits = (s.habits ?? []).map((x, i) => ({ ...x, color: INK_VARS[i % INK_VARS.length] }));
            s.skills = (s.skills ?? []).map((x, i) => ({ ...x, color: INK_VARS[i % INK_VARS.length] }));
          } catch { /* best-effort migration */ }
        }
        if (!s.timetable) {
          s.timetable = buildTimetableSeed();
        }
        return s;
      },
      partialize: (s) => {
        const { _hydrated: _h, setHydrated: _sh, ...rest } = s;
        void _h; void _sh;
        return rest as NexusStore;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

/** Fallback hydration flag for browsers where nothing was stored. */
if (typeof window !== 'undefined') {
  setTimeout(() => {
    if (!useNexus.getState()._hydrated) useNexus.getState().setHydrated(true);
  }, 400);
}

// ─── Ephemeral UI store (not persisted) ───────────────────────────────────────
export type TimerState = {
  running: boolean;
  subjectId: ID | null;
  startedAt: number | null; // epoch ms of current run segment
  accumulatedMs: number;    // ms accumulated across paused segments
  startedWallClock: string | null; // HH:mm when the whole timer began
};

interface UIStore {
  activeModule: ModuleId;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  paletteOpen: boolean;
  aiOpen: boolean;
  timer: TimerState;
  setActiveModule: (m: UIStore['activeModule']) => void;
  toggleSidebar: () => void;
  setMobileNavOpen: (v: boolean) => void;
  setPaletteOpen: (v: boolean) => void;
  setAiOpen: (v: boolean) => void;
  startTimer: (subjectId: ID) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => number; // returns total minutes logged
  resetTimer: () => void;
}

const initialTimer: TimerState = { running: false, subjectId: null, startedAt: null, accumulatedMs: 0, startedWallClock: null };

export const timerElapsedMs = (timer: TimerState) =>
  timer.accumulatedMs + (timer.running && timer.startedAt ? Date.now() - timer.startedAt : 0);

export const useUI = create<UIStore>((set, get) => ({
  activeModule: 'dashboard',
  sidebarCollapsed: false,
  mobileNavOpen: false,
  paletteOpen: false,
  aiOpen: false,
  timer: initialTimer,
  setActiveModule: (m) => set({ activeModule: m, mobileNavOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileNavOpen: (v) => set({ mobileNavOpen: v }),
  setPaletteOpen: (v) => set({ paletteOpen: v }),
  setAiOpen: (v) => set({ aiOpen: v }),
  startTimer: (subjectId) =>
    set({ timer: { running: true, subjectId, startedAt: Date.now(), accumulatedMs: 0, startedWallClock: new Date().toTimeString().slice(0, 5) } }),
  pauseTimer: () =>
    set((s) => ({
      timer: {
        ...s.timer,
        running: false,
        accumulatedMs: s.timer.accumulatedMs + (s.timer.startedAt ? Date.now() - s.timer.startedAt : 0),
        startedAt: null,
      },
    })),
  resumeTimer: () =>
    set((s) => ({ timer: { ...s.timer, running: true, startedAt: Date.now() } })),
  stopTimer: () => {
    const { timer } = get();
    const totalMs = timerElapsedMs(timer);
    const minutes = Math.max(1, Math.round(totalMs / 60000));
    if (timer.subjectId) {
      const now = new Date();
      const startLabel = timer.startedWallClock ?? new Date(now.getTime() - totalMs).toTimeString().slice(0, 5);
      useNexus.getState().addSession({
        subjectId: timer.subjectId,
        date: dateKey(now),
        startTime: startLabel,
        endTime: now.toTimeString().slice(0, 5),
        durationMin: minutes,
        concentration: 3,
        energy: 3,
        tags: ['focus-timer'],
      });
    }
    set({ timer: initialTimer });
    return minutes;
  },
  resetTimer: () => set({ timer: initialTimer }),
}));

/** Live ticking hook — re-renders every second while the timer runs. */
export function useTimerTick(enabled: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [enabled]);
  return now;
}

// Convenience selectors
export const useProfile = () => useNexus((s) => s.profile);
export const useSettings = () => useNexus((s) => s.settings);
export const useSubjectById = (id: ID | null | undefined) =>
  useNexus((s) => (id ? s.subjects.find((x) => x.id === id) : undefined));
export type { Task, TaskStatus, TaskPriority, TaskArea, Recurrence, Subject, SubjectCategory };
