import type { NexusData, AiStats } from './types';
import { computeStreak, dayTotalMinutes, eachDayKeys, addDays, todayKey, startOfWeek, sum, avg, round1 } from './utils';

/** Build the compact stats snapshot that is sent to the AI coach. */
export function buildAiStats(state: NexusData): AiStats {
  const today = todayKey();
  const weekStart = startOfWeek(new Date());
  const weekDays = eachDayKeys(weekStart, new Date());
  const last7 = eachDayKeys(addDays(new Date(), -6), new Date());

  const todayMinutes = dayTotalMinutes(state.dailyLogs[today]);
  const weekMinutes = sum(weekDays.map((d) => dayTotalMinutes(state.dailyLogs[d])));
  const logged = last7.map((d) => dayTotalMinutes(state.dailyLogs[d])).filter((m) => m > 0);
  const avgDayMinutes = Math.round(avg(logged.length ? logged : [0]));

  const subjectMinutes = new Map<string, number>();
  for (const d of last7) {
    const log = state.dailyLogs[d];
    if (!log) continue;
    for (const [sid, m] of Object.entries(log.minutes)) {
      subjectMinutes.set(sid, (subjectMinutes.get(sid) ?? 0) + m);
    }
  }
  const nameOf = (id: string) => state.subjects.find((s) => s.id === id)?.name ?? id;
  const topSubjects = [...subjectMinutes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, m]) => ({ name: nameOf(id), minutes: m }));

  const codingIds = new Set(state.subjects.filter((s) => s.category === 'coding').map((s) => s.id));
  const codingMinutesWeek = sum(
    weekDays.flatMap((d) =>
      Object.entries(state.dailyLogs[d]?.minutes ?? {})
        .filter(([sid]) => codingIds.has(sid))
        .map(([, m]) => m),
    ),
  );

  const neglected = state.subjects
    .filter((s) => (subjectMinutes.get(s.id) ?? 0) === 0)
    .slice(0, 6)
    .map((s) => s.name);

  const t = state.tasks;
  const weekAgo = addDays(new Date(), -7).getTime();
  const tasks = {
    overdue: t.filter((x) => x.dueDate && x.dueDate < today && x.status !== 'done').length,
    dueToday: t.filter((x) => x.dueDate === today && x.status !== 'done').length,
    doing: t.filter((x) => x.status === 'doing').length,
    inbox: t.filter((x) => x.status === 'inbox').length,
    done7d: t.filter((x) => x.status === 'done' && x.completedAt && new Date(x.completedAt).getTime() >= weekAgo).length,
  };

  const habitSummary = state.habits.filter((h) => !h.archived).map((h) => ({
    name: h.name,
    done7: last7.filter((d) => state.habitRecords[h.id]?.[d]).length,
    target: h.targetPerWeek,
  }));

  return {
    todayMinutes,
    weekMinutes,
    avgDayMinutes,
    streak: computeStreak(state.dailyLogs),
    topSubjects,
    neglectedSubjects: neglected,
    codingHoursThisWeek: round1(codingMinutesWeek / 60),
    codingTarget: state.profile.weeklyCodingTargetHours,
    tasks,
    habitSummary,
    dsaActive: state.dsaActive,
    dsaSolved: state.dsaTopics.reduce((a, x) => a + x.problemsSolved, 0),
    sleepAvg: round1(avg(last7.map((d) => state.dailyLogs[d]?.sleepHours ?? 0).filter((v) => v > 0))),
    energyAvg: round1(avg(last7.map((d) => state.dailyLogs[d]?.energy ?? 0).filter((v) => v > 0))),
    profile: state.profile,
  };
}

export function buildSystemPrompt(stats: AiStats): string {
  return [
    'You are Nexus Coach, the built-in AI productivity coach inside NexusOS — a student productivity & coding OS.',
    'You give warm, direct, actionable advice. Keep answers under 220 words unless the user asks for a plan.',
    'Use short markdown (bold key numbers, dash lists). Never invent data that is not in the snapshot.',
    '',
    'STUDENT SNAPSHOT (live data):',
    JSON.stringify(stats),
  ].join('\n');
}

/** Deterministic offline fallback when no AI provider is reachable. */
export function mockCoachReply(question: string, stats: AiStats): string {
  const q = question.toLowerCase();
  const hrs = (m: number) => `${(m / 60).toFixed(1)}h`;
  const lines: string[] = [];
  lines.push(`**Quick read, ${stats.profile.name}** *(offline mode)*`);
  lines.push(`- Today: **${hrs(stats.todayMinutes)}** studied · This week: **${hrs(stats.weekMinutes)}** · Streak: **${stats.streak.current} days**`);
  lines.push(`- Coding this week: **${stats.codingHoursThisWeek}h / ${stats.codingTarget}h** target`);
  if (stats.tasks.overdue > 0) lines.push(`- ⚠️ **${stats.tasks.overdue} overdue task(s)** — clear these first today.`);
  if (stats.topSubjects.length) lines.push(`- Strongest focus lately: **${stats.topSubjects[0].name}** (${hrs(stats.topSubjects[0].minutes)} in 7 days).`);
  if (stats.neglectedSubjects.length) lines.push(`- Neglected: **${stats.neglectedSubjects.slice(0, 3).join(', ')}** — schedule one 30-min block tomorrow.`);
  if (q.includes('plan') || q.includes('tomorrow')) {
    lines.push('', '**Suggested plan:**');
    lines.push('1. 25-min warm-up: flashcards/reading · 2. 50-min deep block on your weakest subject · 3. 10-min break · 4. 50-min coding block · 5. Log everything in Daily Tracker.');
  }
  if (stats.streak.current >= 7) lines.push('', `🔥 ${stats.streak.current}-day streak — protect it with at least a 30-minute block today.`);
  lines.push('', '*Connect the built-in Nexus AI or add a Gemini key in Settings for full coaching.*');
  return lines.join('\n');
}
