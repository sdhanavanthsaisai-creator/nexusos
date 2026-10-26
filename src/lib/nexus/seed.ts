import type {
  DailyLog, StudySession, Task, Habit, HabitRecords, Skill, Project,
  Note, Resource, ExamEvent, DsaTopic, NexusData,
} from './types';
import {
  SUBJECT_SEED, HABIT_SEED, DSA_TOPICS_SEED, SKILL_SEED,
  DEFAULT_PROFILE, DASHBOARD_WIDGETS_DEFAULT,
} from './constants';
import { addDays, dateKey, pad2, todayKey, uid } from './utils';

/** Deterministic PRNG so seed data looks natural and stable. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSeed(): NexusData {
  const rnd = mulberry32(1337);
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const rint = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;

  const dailyLogs: Record<string, DailyLog> = {};
  const sessions: StudySession[] = [];

  const collegeIds = ['maths', 'chem', 'cs', 'cprog', 'bio'];
  const langIds = ['chinese'];
  const codingIds = ['htmlcss', 'js', 'java', 'react', 'c', 'cpp'];
  const lifeIds = ['yoga', 'guitar', 'gym'];
  const notePool = [
    'Solid focus block — phone was in another room.',
    'Got distracted a couple of times, still finished the plan.',
    'Library session, very productive.',
    'Tired after college but pushed through.',
    'Great momentum today!', 'Weekend deep-work marathon.',
    'Revised lecture notes + practice problems.', '',
  ];

  for (let i = 55; i >= 0; i--) {
    const day = addDays(now, -i);
    const key = dateKey(day);
    const dow = day.getDay(); // 0 Sun … 6 Sat
    const isWeekend = dow === 0 || dow === 6;
    if (rnd() < 0.14 && i !== 0) continue; // some off days
    const minutes: Record<string, number> = {};
    const addM = (id: string, lo: number, hi: number) => {
      const m = Math.round(rint(lo, hi) / 5) * 5;
      if (m > 0) minutes[id] = (minutes[id] ?? 0) + m;
    };

    if (!isWeekend) {
      addM('maths', 20, 60); addM('chem', 15, 50); addM('cs', 20, 55); addM('cprog', 15, 45);
      if (rnd() < 0.5) addM('bio', 10, 35);
      if (dow === 1 || dow === 3 || dow === 5) addM('yoga', 25, 45);
      if (rnd() < 0.75) addM('chinese', 10, 30);
      if (rnd() < 0.85) addM(pick(codingIds), 25, 75);
    } else {
      addM(pick(codingIds), 45, 110);
      if (rnd() < 0.7) addM(pick(codingIds), 30, 80);
      addM('maths', 20, 50);
      if (rnd() < 0.5) addM('guitar', 20, 45);
      if (rnd() < 0.5) addM('gym', 40, 70);
      if (rnd() < 0.4) addM('chinese', 15, 30);
    }

    const total = Object.values(minutes).reduce((a, b) => a + b, 0);
    dailyLogs[key] = {
      date: key,
      dayType: isWeekend ? 'weekend' : 'college',
      sleepHours: Math.round((6 + rnd() * 2.8) * 2) / 2,
      energy: rint(2, 5),
      notes: pick(notePool),
      minutes,
      updatedAt: iso(day),
    };

    // Derive 1-3 sessions per day roughly aligned to logged minutes
    const entries = Object.entries(minutes).filter(([, m]) => m >= 15);
    const sessionCount = Math.min(entries.length, rint(1, 3));
    let cursor = isWeekend ? rint(9, 11) * 60 : rint(16, 18) * 60;
    for (let s = 0; s < sessionCount; s++) {
      const [subjectId] = pick(entries);
      const dur = Math.max(15, Math.round((minutes[subjectId] ?? 30) / sessionCount / 5) * 5);
      const startM = Math.min(cursor, 22 * 60);
      const endM = Math.min(23 * 60 + 30, startM + dur);
      const cat = SUBJECT_SEED.find((x) => x.id === subjectId)?.category ?? 'college';
      sessions.push({
        id: uid(),
        date: key,
        startTime: `${pad2(Math.floor(startM / 60))}:${pad2(startM % 60)}`,
        endTime: `${pad2(Math.floor(endM / 60))}:${pad2(endM % 60)}`,
        subjectId,
        category: cat,
        durationMin: Math.max(10, endM - startM),
        concentration: rint(2, 5),
        energy: rint(2, 5),
        tags: pick([['deep-work'], ['revision'], ['practice'], ['lecture'], ['project'], ['deep-work', 'morning']]),
        notes: '',
        createdAt: iso(day),
      });
      cursor = endM + rint(10, 40);
    }
    void total;
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const t = (p: Partial<Task> & { title: string; daysFromNow?: number }): Task => ({
    id: uid(),
    description: p.description ?? '',
    status: p.status ?? 'inbox',
    priority: p.priority ?? 'normal',
    area: p.area ?? 'college',
    dueDate: p.dueDate ?? (p.daysFromNow !== undefined ? dateKey(addDays(now, p.daysFromNow)) : null),
    startDate: p.startDate ?? null,
    estimatedHours: p.estimatedHours ?? null,
    actualHours: p.actualHours ?? null,
    subtasks: p.subtasks ?? [],
    recurrence: p.recurrence ?? 'none',
    tags: p.tags ?? [],
    createdAt: iso(addDays(now, -rint(1, 14))),
    completedAt: p.completedAt ?? null,
    title: p.title,
  });

  const tasks: Task[] = [
    t({ title: 'Finish Chemistry lab report', area: 'college', priority: 'critical', status: 'doing', daysFromNow: 0, estimatedHours: 2, subtasks: [{ id: uid(), title: 'Write method section', done: true }, { id: uid(), title: 'Add graphs', done: false }, { id: uid(), title: 'Proofread', done: false }], tags: ['lab'] }),
    t({ title: 'Maths Assignment 2 — calculus', area: 'college', priority: 'critical', daysFromNow: 2, estimatedHours: 3 }),
    t({ title: 'Prepare for Chinese quiz (Unit 4)', area: 'college', priority: 'important', status: 'next', daysFromNow: 1, estimatedHours: 1.5 }),
    t({ title: 'Build React todo app with hooks', area: 'coding', priority: 'important', status: 'doing', daysFromNow: 5, estimatedHours: 6, actualHours: 2.5, subtasks: [{ id: uid(), title: 'Component tree', done: true }, { id: uid(), title: 'Add useReducer store', done: false }, { id: uid(), title: 'LocalStorage persistence', done: false }], tags: ['portfolio'] }),
    t({ title: 'CSA: binary & number systems worksheet', area: 'college', priority: 'normal', status: 'next', daysFromNow: 3 }),
    t({ title: 'Read Java OOP chapter 4', area: 'coding', priority: 'normal', status: 'next', daysFromNow: 4, estimatedHours: 1.5 }),
    t({ title: 'Book dentist appointment', area: 'personal', priority: 'low', status: 'waiting', daysFromNow: 6 }),
    t({ title: 'Fix pointer bug in C lab code', area: 'college', priority: 'important', status: 'blocked', daysFromNow: 1, description: 'Blocked: waiting for lab TA to share test cases.' }),
    t({ title: 'Weekly review + plan next week', area: 'admin', priority: 'important', status: 'next', daysFromNow: 0, recurrence: 'weekly' }),
    t({ title: '30 min Yoga flow', area: 'habits', priority: 'normal', status: 'next', daysFromNow: 0, recurrence: 'daily' }),
    t({ title: 'Push portfolio site to GitHub Pages', area: 'coding', priority: 'important', status: 'next', daysFromNow: 8, tags: ['portfolio'] }),
    t({ title: 'Chemistry unit test revision', area: 'college', priority: 'critical', daysFromNow: -2, description: 'Past due — schedule a catch-up block.' }),
    t({ title: 'Submit library form', area: 'admin', priority: 'low', daysFromNow: -4 }),
    t({ title: 'Practice guitar — chord transitions', area: 'personal', priority: 'low', status: 'next', daysFromNow: 1, recurrence: 'weekly' }),
    t({ title: 'Solve 10 C++ STL problems', area: 'coding', priority: 'normal', daysFromNow: 7, estimatedHours: 3 }),
    t({ title: 'Bio: cell diagram notes', area: 'college', priority: 'normal', status: 'inbox', daysFromNow: 5 }),
    t({ title: 'Set up Notion import to NexusOS', area: 'admin', priority: 'low', status: 'inbox' }),
    t({ title: 'JavaScript: closures kata set', area: 'coding', priority: 'important', status: 'next', daysFromNow: 2, estimatedHours: 2 }),
    t({ title: 'Email professor about project topic', area: 'admin', priority: 'important', status: 'waiting', daysFromNow: 1 }),
    t({ title: 'Maths tutorial sheet 5', area: 'college', priority: 'normal', status: 'done', daysFromNow: -1, completedAt: iso(addDays(now, -1)), actualHours: 1.5 }),
    t({ title: 'Deploy Java CLI planner v0.1', area: 'coding', priority: 'normal', status: 'done', daysFromNow: -3, completedAt: iso(addDays(now, -3)), actualHours: 4 }),
    t({ title: 'Organise lecture notes folder', area: 'admin', priority: 'low', status: 'done', daysFromNow: -6, completedAt: iso(addDays(now, -6)) }),
    t({ title: 'Water the plants', area: 'personal', priority: 'low', status: 'inbox' }),
    t({ title: 'Plan DSA starter roadmap', area: 'coding', priority: 'normal', status: 'inbox', daysFromNow: 30, description: 'Unlocks after Semester 1 — pre-read Arrays & Strings.' }),
  ];

  // ── Habits ─────────────────────────────────────────────────────────────────
  const habits: Habit[] = HABIT_SEED.map((h) => ({
    id: uid(), name: h.name, icon: h.icon, color: h.color,
    targetPerWeek: h.targetPerWeek, archived: false, createdAt: iso(addDays(now, -40)),
  }));
  const habitRecords: HabitRecords = {};
  const baseProb = [0.62, 0.78, 0.5, 0.85, 0.6, 0.7, 0.66, 0.42, 0.4];
  habits.forEach((h, idx) => {
    const rec: Record<string, boolean> = {};
    for (let i = 34; i >= 0; i--) {
      const key = dateKey(addDays(now, -i));
      const momentum = 1 + (34 - i) * 0.004; // slight improvement over time
      rec[key] = rnd() < baseProb[idx] * momentum;
    }
    rec[todayKey()] = rnd() < 0.5 ? true : rec[todayKey()];
    habitRecords[h.id] = rec;
  });

  // ── Skills ─────────────────────────────────────────────────────────────────
  const skills: Skill[] = SKILL_SEED.map((s) => ({
    id: s.id, name: s.name, color: s.color,
    status: s.id === 'cpp' ? 'active' : s.id === 'guitar' ? 'paused' : 'active',
    currentLevel: s.currentLevel, targetLevel: s.targetLevel,
    weeklyHoursGoal: s.weeklyHoursGoal,
    nextMilestone: s.nextMilestone,
    resources: s.resources, notes: '',
    targetDate: dateKey(addDays(now, s.targetDateOffsetDays)),
  }));

  // ── Projects ───────────────────────────────────────────────────────────────
  const projects: Project[] = [
    { id: uid(), name: 'Portfolio Website', description: 'Personal portfolio with projects blog, built with React + Tailwind.', repoUrl: 'https://github.com/aarav/portfolio', liveUrl: 'https://aarav.dev', techStack: ['React', 'Tailwind', 'Vite'], status: 'in-progress', hoursLogged: 14.5, dueDate: dateKey(addDays(now, 20)), createdAt: iso(addDays(now, -25)) },
    { id: uid(), name: 'Java CLI Study Planner', description: 'Command-line planner that exports weekly study plans as Markdown.', repoUrl: 'https://github.com/aarav/java-planner', liveUrl: '', techStack: ['Java'], status: 'shipped', hoursLogged: 22, dueDate: null, createdAt: iso(addDays(now, -45)) },
    { id: uid(), name: 'Pomodoro PWA', description: 'Offline-first pomodoro timer with notifications.', repoUrl: 'https://github.com/aarav/pomo', liveUrl: '', techStack: ['TypeScript', 'React'], status: 'planning', hoursLogged: 2, dueDate: dateKey(addDays(now, 40)), createdAt: iso(addDays(now, -8)) },
    { id: uid(), name: 'Chinese Flashcards App', description: 'Spaced-repetition flashcards for HSK1 vocabulary.', repoUrl: '', liveUrl: '', techStack: ['React', 'LocalStorage'], status: 'idea', hoursLogged: 0, dueDate: null, createdAt: iso(addDays(now, -3)) },
  ];

  // ── Notes & resources ──────────────────────────────────────────────────────
  const notes: Note[] = [
    {
      id: uid(), title: 'C pointers cheat-sheet', pinned: true, tags: ['c', 'cheatsheet'],
      content: `# C Pointers — quick reference\n\n\`\`\`c\nint x = 10;\nint *p = &x;   // p stores address of x\nprintf("%d", *p); // 10 (dereference)\n\`\`\`\n\n- \`&x\` → address of x\n- \`*p\` → value at address\n- Arrays decay to pointers: \`arr[i] == *(arr + i)\`\n- Always initialise pointers; use \`NULL\` when empty.`,
      createdAt: iso(addDays(now, -10)), updatedAt: iso(addDays(now, -2)),
    },
    {
      id: uid(), title: 'Chemistry: periodic trends', pinned: false, tags: ['chemistry'],
      content: `# Periodic Trends\n\n1. **Atomic radius** ↓ across period, ↓ up group\n2. **Ionisation energy** ↑ across period\n3. **Electronegativity** ↑ across, ↑ up\n\n> Remember: *more protons pulling same shell = smaller atom*`,
      createdAt: iso(addDays(now, -6)), updatedAt: iso(addDays(now, -6)),
    },
    {
      id: uid(), title: 'React hooks patterns', pinned: false, tags: ['react', 'code'],
      content: `# Hooks patterns\n\n\`\`\`jsx\n// debounce any value\nfunction useDebounced(value, ms = 300) {\n  const [v, setV] = useState(value);\n  useEffect(() => {\n    const id = setTimeout(() => setV(value), ms);\n    return () => clearTimeout(id);\n  }, [value, ms]);\n  return v;\n}\n\`\`\`\n\n- \`useMemo\` for expensive derived data\n- \`useCallback\` only when passing to memo children`,
      createdAt: iso(addDays(now, -4)), updatedAt: iso(addDays(now, -1)),
    },
  ];

  const resources: Resource[] = [
    { id: uid(), title: 'MDN Web Docs', url: 'https://developer.mozilla.org', category: 'Coding', notes: 'The reference for HTML/CSS/JS.', createdAt: iso(addDays(now, -20)) },
    { id: uid(), title: 'javascript.info', url: 'https://javascript.info', category: 'Coding', notes: 'Modern JS tutorial — deep and clear.', createdAt: iso(addDays(now, -18)) },
    { id: uid(), title: 'React Docs', url: 'https://react.dev/learn', category: 'Coding', notes: 'Official learn guide.', createdAt: iso(addDays(now, -12)) },
    { id: uid(), title: 'LeetCode', url: 'https://leetcode.com', category: 'DSA', notes: 'For when DSA unlocks.', createdAt: iso(addDays(now, -9)) },
    { id: uid(), title: 'HSK 1 vocabulary list', url: 'https://www.hsk.academy/en/hsk_1', category: 'Language', notes: '150 words for the quiz.', createdAt: iso(addDays(now, -5)) },
  ];

  // ── Exams ──────────────────────────────────────────────────────────────────
  const exams: ExamEvent[] = [
    { id: uid(), title: 'Maths Assignment 2 deadline', date: dateKey(addDays(now, 2)), type: 'assignment', notes: 'Covers weeks 5-7.' },
    { id: uid(), title: 'Chinese Unit 4 quiz', date: dateKey(addDays(now, 1)), type: 'exam', notes: '' },
    { id: uid(), title: 'Chemistry mid-term', date: dateKey(addDays(now, 9)), type: 'exam', notes: 'Chapters 1-6, lab included.' },
    { id: uid(), title: 'Portfolio site v1 launch', date: dateKey(addDays(now, 15)), type: 'project', notes: '' },
    { id: uid(), title: 'CSA workshop test', date: dateKey(addDays(now, -5)), type: 'exam', notes: 'Done — scored 82%.' },
  ];

  // ── DSA (locked) ───────────────────────────────────────────────────────────
  const dsaTopics: DsaTopic[] = DSA_TOPICS_SEED.map((d, i) => ({
    id: `dsa-${i + 1}`, name: d.name, difficulty: d.difficulty,
    problemsSolved: 0, problemsTotal: d.problemsTotal, mastery: 0,
  }));

  return {
    profile: { ...DEFAULT_PROFILE },
    settings: {
      theme: 'dark',
      confettiEnabled: true,
      reduce3d: false,
      aiProvider: 'nexus',
      geminiKey: '',
      geminiModel: 'gemini-2.0-flash',
      dashboardWidgets: [...DASHBOARD_WIDGETS_DEFAULT],
    },
    subjects: SUBJECT_SEED.map((s) => ({ ...s })),
    skills,
    dailyLogs,
    sessions,
    tasks,
    habits,
    habitRecords,
    projects,
    notes,
    resources,
    exams,
    dsaActive: false,
    dsaTopics,
    chat: [],
    celebrated: [],
  };
}
