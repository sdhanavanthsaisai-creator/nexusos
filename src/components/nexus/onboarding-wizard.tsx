'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BookOpen, Check, Code2, Dumbbell, LoaderCircle, Minus, Plus,
  Target, Trash2, UserRound, type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useNexus, useUI } from '@/lib/nexus/store';
import { CATEGORY_META, HABIT_SEED, INK_VARS, SKILL_SEED } from '@/lib/nexus/constants';
import type { Habit, Skill, Subject, SubjectCategory } from '@/lib/nexus/types';
import { uid } from '@/lib/nexus/utils';

const STEPS: { question: string; subtitle: string; icon: LucideIcon }[] = [
  { question: 'Who are you?', subtitle: 'A few details so your dashboard is yours, not a demo.', icon: UserRound },
  { question: 'What are you studying this term?', subtitle: 'Pick what applies, add your own, or rename anything.', icon: BookOpen },
  { question: 'What do you want to get better at?', subtitle: 'These become the skills on your roadmap.', icon: Code2 },
  { question: 'Which routines should we track?', subtitle: 'Choose habits you actually want to keep, with weekly goals.', icon: Dumbbell },
  { question: 'How much time do you have?', subtitle: 'Set realistic targets and preview the workspace we will build.', icon: Target },
];

const SUBJECT_SUGGESTIONS: { name: string; category: SubjectCategory }[] = [
  { name: 'Maths', category: 'college' },
  { name: 'Physics', category: 'college' },
  { name: 'Chemistry', category: 'college' },
  { name: 'Biology', category: 'college' },
  { name: 'Computer Science', category: 'college' },
  { name: 'Data Structures', category: 'college' },
  { name: 'Operating Systems', category: 'college' },
  { name: 'DBMS', category: 'college' },
  { name: 'Electronics', category: 'college' },
  { name: 'Statistics', category: 'college' },
  { name: 'Economics', category: 'college' },
  { name: 'English', category: 'language' },
  { name: 'Japanese', category: 'language' },
  { name: 'JavaScript', category: 'coding' },
  { name: 'Python', category: 'coding' },
  { name: 'React', category: 'coding' },
  { name: 'Guitar', category: 'music' },
  { name: 'Gym', category: 'fitness' },
];

const slug = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `item-${uid()}`;

const buildHabit = (seed: (typeof HABIT_SEED)[number]): Habit => ({
  id: `habit-${slug(seed.name)}`,
  name: seed.name,
  icon: seed.icon,
  color: seed.color,
  targetPerWeek: seed.targetPerWeek,
  archived: false,
  createdAt: new Date().toISOString(),
});

const buildSkill = (skill: (typeof SKILL_SEED)[number]): Skill => ({
  id: skill.id,
  name: skill.name,
  color: skill.color,
  status: 'active',
  currentLevel: 0,
  targetLevel: skill.targetLevel,
  weeklyHoursGoal: skill.weeklyHoursGoal,
  nextMilestone: skill.nextMilestone,
  resources: '',
  notes: '',
  targetDate: null,
});

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? 'border-primary/50 bg-primary/[0.12] text-foreground' : 'border-border/60 bg-background/35 text-muted-foreground hover:text-foreground'}`}
    >
      {active && <Check className="h-3 w-3 text-primary" />}
      {children}
    </button>
  );
}

function TargetControl({
  label, hint, value, min, max, step, unit, presets, onChange,
}: {
  label: string; hint: string; value: number; min: number; max: number; step: number;
  unit: string; presets: number[]; onChange: (next: number) => void;
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next / step) * step));
  const display = Number.isInteger(value) ? String(value) : value.toFixed(1);

  return (
    <div className="rounded-3xl border border-border/60 bg-background/35 p-5">
      <label className="block text-sm font-medium" htmlFor={`target-${label.replace(/\s+/g, '-').toLowerCase()}`}>{label}</label>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      <div className="mt-5 flex items-center justify-between gap-3">
        <Button type="button" variant="outline" size="icon" onClick={() => onChange(clamp(value - step))} disabled={value <= min} aria-label={`Decrease ${label}`} className="h-10 w-10 shrink-0 rounded-full border-border/70 bg-background/60">
          <Minus className="h-4 w-4" />
        </Button>
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-semibold tabular-nums tracking-tight">{display}</span>
          <span className="text-xs font-medium text-muted-foreground">{unit}</span>
        </div>
        <Button type="button" variant="outline" size="icon" onClick={() => onChange(clamp(value + step))} disabled={value >= max} aria-label={`Increase ${label}`} className="h-10 w-10 shrink-0 rounded-full border-border/70 bg-background/60">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <Slider
        id={`target-${label.replace(/\s+/g, '-').toLowerCase()}`}
        className="mt-6"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(next) => onChange(clamp(next[0] ?? value))}
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <Chip key={preset} active={preset === value} onClick={() => onChange(preset)}>{preset}{unit.startsWith('hours') ? 'h' : ` ${unit}`}</Chip>
        ))}
      </div>
    </div>
  );
}

function SemesterControl({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const clamp = (next: number) => Math.min(8, Math.max(1, Math.round(next)));

  return (
    <div className="rounded-3xl border border-border/60 bg-background/35 p-5 sm:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Semester / year</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Where you are in your program — it also shapes when DSA unlocks.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" onClick={() => onChange(clamp(value - 1))} disabled={value <= 1} aria-label="Previous semester" className="h-10 w-10 shrink-0 rounded-full border-border/70 bg-background/60">
            <Minus className="h-4 w-4" />
          </Button>
          <span className="min-w-10 text-center text-4xl font-semibold tabular-nums tracking-tight">{value}</span>
          <Button type="button" variant="outline" size="icon" onClick={() => onChange(clamp(value + 1))} disabled={value >= 8} aria-label="Next semester" className="h-10 w-10 shrink-0 rounded-full border-border/70 bg-background/60">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-8 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={value === option}
            aria-label={`Semester ${option}`}
            className={`rounded-xl border py-2 text-xs font-medium tabular-nums transition ${value === option ? 'border-primary/50 bg-primary/[0.12] text-foreground' : 'border-border/60 bg-background/40 text-muted-foreground hover:text-foreground'}`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function HabitTarget({ name, value, onChange }: { name: string; value: number; onChange: (next: number) => void }) {
  const clamp = (next: number) => Math.min(7, Math.max(0, Math.round(next)));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1" role="group" aria-label={`${name || 'Habit'} days per week`}>
        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => onChange(day)}
            aria-label={`${day} ${day === 1 ? 'day' : 'days'} per week`}
            aria-pressed={value === day}
            className={`h-1.5 w-4 rounded-full transition ${day <= value ? 'bg-primary' : 'bg-muted'} ${value === day ? 'ring-2 ring-primary/25 ring-offset-1 ring-offset-background' : ''}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background/50 p-0.5">
        <button type="button" onClick={() => onChange(clamp(value - 1))} disabled={value <= 0} aria-label={`Decrease days per week for ${name || 'habit'}`} className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground transition hover:text-foreground disabled:opacity-40"><Minus className="h-3 w-3" /></button>
        <span className="min-w-8 text-center text-xs font-semibold tabular-nums">{value}<span className="text-[10px] font-normal text-muted-foreground">/7</span></span>
        <button type="button" onClick={() => onChange(clamp(value + 1))} disabled={value >= 7} aria-label={`Increase days per week for ${name || 'habit'}`} className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground transition hover:text-foreground disabled:opacity-40"><Plus className="h-3 w-3" /></button>
      </div>
    </div>
  );
}

function ToggleCard({ checked, onToggle, title, detail }: { checked: boolean; onToggle: () => void; title: string; detail?: string }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={checked} className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition ${checked ? 'border-primary/45 bg-primary/[0.09]' : 'border-border/60 bg-background/35 hover:bg-accent/50'}`}>
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background/40'}`}>{checked && <Check className="h-3.5 w-3.5" />}</span>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{title}</span>{detail && <span className="mt-0.5 block text-[11px] text-muted-foreground">{detail}</span>}</span>
    </button>
  );
}

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [profileName, setProfileName] = useState('');
  const [university, setUniversity] = useState('');
  const [degree, setDegree] = useState('');
  const [semester, setSemester] = useState(1);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectDraft, setSubjectDraft] = useState('');
  const [subjectDraftCategory, setSubjectDraftCategory] = useState<SubjectCategory>('college');

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkills, setCustomSkills] = useState<Skill[]>([]);
  const [skillDraft, setSkillDraft] = useState('');
  const [dsaActive, setDsaActive] = useState(false);

  const [habitIds, setHabitIds] = useState<string[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitDraft, setHabitDraft] = useState('');

  const [dailyTarget, setDailyTarget] = useState(4);
  const [codingTarget, setCodingTarget] = useState(15);

  const addSubject = (name: string, category: SubjectCategory) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubjects((items) => {
      if (items.some((item) => item.name.trim().toLowerCase() === trimmed.toLowerCase())) return items;
      const base = slug(trimmed);
      let id = base;
      let suffix = 2;
      while (items.some((item) => item.id === id)) id = `${base}-${suffix++}`;
      return [...items, { id, name: trimmed, category, color: INK_VARS[items.length % INK_VARS.length] }];
    });
  };

  const addHabit = (seed: (typeof HABIT_SEED)[number]) => {
    const habit = buildHabit(seed);
    setHabitIds((ids) => (ids.includes(habit.id) ? ids : [...ids, habit.id]));
    setHabits((items) => (items.some((item) => item.id === habit.id) ? items : [...items, habit]));
  };

  const removeHabit = (id: string) => {
    setHabitIds((ids) => ids.filter((value) => value !== id));
    setHabits((items) => items.filter((item) => item.id !== id));
  };

  const addCustomHabit = () => {
    const name = habitDraft.trim();
    if (!name) return;
    if (habits.some((habit) => habit.name.toLowerCase() === name.toLowerCase())) {
      setHabitDraft('');
      return;
    }
    const habit: Habit = {
      id: `habit-${slug(name)}-${uid()}`,
      name,
      icon: 'sparkles',
      color: INK_VARS[habits.length % INK_VARS.length],
      targetPerWeek: 3,
      archived: false,
      createdAt: new Date().toISOString(),
    };
    setHabits((items) => [...items, habit]);
    setHabitIds((ids) => [...ids, habit.id]);
    setHabitDraft('');
  };

  const addCustomSkill = () => {
    const name = skillDraft.trim();
    if (!name) return;
    if (customSkills.some((skill) => skill.name.toLowerCase() === name.toLowerCase())) {
      setSkillDraft('');
      return;
    }
    setCustomSkills((items) => [...items, {
      id: `skill-${slug(name)}-${uid()}`,
      name,
      color: INK_VARS[(items.length + 3) % INK_VARS.length],
      status: 'active',
      currentLevel: 0,
      targetLevel: 80,
      weeklyHoursGoal: 3,
      nextMilestone: '',
      resources: '',
      notes: '',
      targetDate: null,
    }]);
    setSkillDraft('');
  };

  const subjectNames = subjects.map((subject) => subject.name.trim());
  const duplicateSubjects = new Set(subjectNames.map((name) => name.toLowerCase())).size !== subjectNames.length;

  const goNext = () => {
    setError('');
    if (step === 0 && !profileName.trim()) {
      setError('Enter the name you want to see on your dashboard.');
      return;
    }
    if (step === 1) {
      if (!subjects.length) {
        setError('Add at least one subject or class you are taking this term.');
        return;
      }
      if (subjectNames.some((name) => !name)) {
        setError('Give every subject a name or remove the empty one.');
        return;
      }
      if (duplicateSubjects) {
        setError('Subject names must be unique.');
        return;
      }
    }
    setStep((value) => Math.min(STEPS.length - 1, value + 1));
  };

  const finish = async () => {
    setSaving(true);
    setError('');
    try {
      if (!profileName.trim()) throw new Error('Enter the name you want to see on your dashboard.');
      if (!subjects.length) throw new Error('Add at least one subject to continue.');
      if (duplicateSubjects) throw new Error('Subject names must be unique.');
      if (habits.some((habit) => !habit.name.trim())) throw new Error('Give every habit a name or remove it.');
      if (habits.some((habit) => !Number.isFinite(habit.targetPerWeek) || habit.targetPerWeek < 0 || habit.targetPerWeek > 7)) throw new Error('Habit goals must be between 0 and 7 days per week.');
      if (!Number.isFinite(dailyTarget) || dailyTarget < 0.5 || dailyTarget > 24) throw new Error('Daily study target must be between 0.5 and 24 hours.');
      if (!Number.isFinite(codingTarget) || codingTarget < 0 || codingTarget > 168) throw new Error('Weekly coding target must be between 0 and 168 hours.');
      if (!Number.isFinite(semester) || semester < 1 || semester > 8) throw new Error('Semester or year must be between 1 and 8.');

      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      if (supabase) {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) throw new Error('Your sign-in has expired. Please sign in again to save your plan.');
      }

      const store = useNexus;
      const state = store.getState();
      const cleanedSubjects = subjects.map((subject) => ({ ...subject, name: subject.name.trim() }));
      const cleanedHabits = habits.map((habit) => ({ ...habit, name: habit.name.trim(), archived: false }));

      const chosen = new Map<string, Skill>();
      const addSkill = (skill: Skill) => {
        if (!chosen.has(skill.id)) chosen.set(skill.id, skill);
      };
      SKILL_SEED.filter((skill) => selectedSkills.includes(skill.id)).forEach((skill) => addSkill(buildSkill(skill)));
      customSkills.forEach(addSkill);
      // A coding subject without an explicit skill becomes a roadmap track so the
      // weekly coding-hours chart and roadmap stay aligned with the subjects.
      cleanedSubjects.filter((subject) => subject.category === 'coding').forEach((subject) => addSkill({
        id: subject.id,
        name: subject.name,
        color: subject.color,
        status: 'active',
        currentLevel: 0,
        targetLevel: 80,
        weeklyHoursGoal: 3,
        nextMilestone: '',
        resources: '',
        notes: '',
        targetDate: null,
      }));
      const skills = [...chosen.values()];

      const profile = {
        ...state.profile,
        name: profileName.trim(),
        university: university.trim(),
        degree: degree.trim(),
        semester,
        dailyTargetHours: dailyTarget,
        weeklyCodingTargetHours: codingTarget,
      };

      const data = {
        ...state,
        profile,
        subjects: cleanedSubjects,
        skills,
        dailyLogs: {},
        sessions: [],
        tasks: [],
        habits: cleanedHabits,
        habitRecords: Object.fromEntries(cleanedHabits.map((habit) => [habit.id, {}])),
        projects: [],
        notes: [],
        resources: [],
        exams: [],
        timetable: { ...state.timetable, events: [] },
        dsaActive,
        dsaTopics: dsaActive ? state.dsaTopics.map((topic) => ({ ...topic, problemsSolved: 0, mastery: 0 })) : [],
        chat: [],
        celebrated: [],
        settings: { ...state.settings, dashboardWidgets: [...state.settings.dashboardWidgets] },
      };

      store.setState(data);

      const user = supabase ? (await supabase.auth.getUser()).data.user : null;
      if (supabase && user) {
        const [profileResult, stateResult, roadmapResult] = await Promise.all([
          supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            full_name: profile.name,
            university: profile.university,
            degree: profile.degree,
            semester: profile.semester,
            daily_target_hours: profile.dailyTargetHours,
            weekly_coding_target_hours: profile.weeklyCodingTargetHours,
            theme_preference: state.settings.theme,
            dsa_active: dsaActive,
            onboarding_completed: true,
            onboarding: {
              subjects: cleanedSubjects.map(({ id, name, category }) => ({ id, name, category })),
              skills: skills.map(({ id, name }) => ({ id, name })),
              habits: cleanedHabits.map(({ id, name, targetPerWeek }) => ({ id, name, targetPerWeek })),
            },
          }),
          supabase.from('user_state').upsert({ user_id: user.id, payload: data }, { onConflict: 'user_id' }),
          skills.length ? supabase.from('coding_roadmap').upsert(skills.map((skill) => ({
            user_id: user.id,
            id: skill.id,
            name: skill.name,
            color: skill.color,
            status: skill.status,
            current_level: skill.currentLevel,
            target_level: skill.targetLevel,
            weekly_hours_goal: skill.weeklyHoursGoal,
            next_milestone: skill.nextMilestone,
            resources: skill.resources,
            notes: skill.notes,
            target_date: skill.targetDate,
          })), { onConflict: 'user_id,id' }) : Promise.resolve({ error: null }),
        ]);
        const failure = profileResult.error ?? stateResult.error ?? roadmapResult.error;
        if (failure) throw failure;
      }

      useUI.getState().setActiveModule('dashboard');
      onComplete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your plan. Your answers are kept on this device; try again when connected.');
    } finally {
      setSaving(false);
    }
  };

  const current = STEPS[step];
  const StepIcon = current.icon;
  const summary = `${subjects.length} subject${subjects.length === 1 ? '' : 's'} · ${selectedSkills.length + customSkills.length} skill${selectedSkills.length + customSkills.length === 1 ? '' : 's'} · ${habits.length} habit${habits.length === 1 ? '' : 's'}`;
  const canFinish = useMemo(() => Boolean(profileName.trim() && subjects.length && !duplicateSubjects && !saving), [profileName, subjects.length, duplicateSubjects, saving]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8 text-foreground">
      <div className="aurora-stage pointer-events-none" aria-hidden="true"><div className="aurora-stars" /><div className="aurora-blob aurora-blob-a" /><div className="aurora-blob aurora-blob-c" /><div className="aurora-vignette" /><div className="aurora-grain" /></div>
      <section className="glass-strong relative z-10 w-full max-w-2xl rounded-[28px] border border-border/60 p-5 shadow-2xl sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><StepIcon className="h-5 w-5" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Setup questions · {step + 1} of {STEPS.length}</p><h1 className="text-lg font-semibold sm:text-xl">{current.question}</h1></div></div>
          <span className="hidden text-xs text-muted-foreground sm:block">NEXUS OS</span>
        </div>
        <div className="mb-6 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
        <p className="mb-5 text-sm text-muted-foreground">{current.subtitle}</p>

        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium"><span>Your name</span><Input autoComplete="name" value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Name shown on your dashboard" className="h-11 rounded-xl bg-background/45" /></label>
            <label className="space-y-2 text-sm font-medium"><span>University or school</span><Input autoComplete="organization" value={university} onChange={(event) => setUniversity(event.target.value)} placeholder="Optional" className="h-11 rounded-xl bg-background/45" /></label>
            <label className="space-y-2 text-sm font-medium"><span>Degree or program</span><Input value={degree} onChange={(event) => setDegree(event.target.value)} placeholder="Optional — e.g. Computer Science" className="h-11 rounded-xl bg-background/45" /></label>
            <SemesterControl value={semester} onChange={setSemester} />
            <p className="text-xs text-muted-foreground sm:col-span-2">Only your name is required. Everything else can be changed later in Settings.</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Quick add</p>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_SUGGESTIONS.map((suggestion) => {
                  const added = subjects.some((subject) => subject.name.toLowerCase() === suggestion.name.toLowerCase());
                  return (
                    <Chip key={suggestion.name} active={added} onClick={() => added ? setSubjects((items) => items.filter((subject) => subject.name.toLowerCase() !== suggestion.name.toLowerCase())) : addSubject(suggestion.name, suggestion.category)}>
                      {suggestion.name}
                    </Chip>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={subjectDraft} onChange={(event) => setSubjectDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addSubject(subjectDraft, subjectDraftCategory); setSubjectDraft(''); } }} placeholder="Type a subject that is not listed" aria-label="Custom subject name" className="h-10 flex-1 rounded-xl bg-background/45" />
              <select value={subjectDraftCategory} onChange={(event) => setSubjectDraftCategory(event.target.value as SubjectCategory)} aria-label="Category for the custom subject" className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
                {Object.entries(CATEGORY_META).map(([category, meta]) => <option key={category} value={category}>{meta.label}</option>)}
              </select>
              <Button type="button" variant="outline" onClick={() => { addSubject(subjectDraft, subjectDraftCategory); setSubjectDraft(''); }} className="rounded-xl"><Plus className="h-4 w-4" /> Add</Button>
            </div>

            {subjects.length > 0 ? (
              <div className="space-y-2">
                {subjects.map((subject, index) => (
                  <div key={subject.id} className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/35 p-3 sm:flex-row">
                    <Input value={subject.name} onChange={(event) => setSubjects((items) => items.map((item) => item.id === subject.id ? { ...item, name: event.target.value } : item))} aria-label={`Subject ${index + 1} name`} placeholder="Subject name" className="h-10 min-w-0 flex-1 rounded-xl" />
                    <select value={subject.category} aria-label={`Category for ${subject.name || `subject ${index + 1}`}`} onChange={(event) => setSubjects((items) => items.map((item) => item.id === subject.id ? { ...item, category: event.target.value as SubjectCategory } : item))} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
                      {Object.entries(CATEGORY_META).map(([category, meta]) => <option key={category} value={category}>{meta.label}</option>)}
                    </select>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setSubjects((items) => items.filter((item) => item.id !== subject.id))} aria-label={`Remove ${subject.name || `subject ${index + 1}`}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            ) : <p className="rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">No subjects yet — tap a suggestion above or type your own.</p>}

            {duplicateSubjects && <p className="text-xs text-destructive">Two subjects share the same name. Rename or remove one.</p>}
            <p className="text-xs text-muted-foreground">These subjects appear in your tracker, analytics, reports and session log. Coding subjects also become roadmap tracks.</p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {SKILL_SEED.map((skill) => (
                <ToggleCard
                  key={skill.id}
                  title={skill.name}
                  detail={`${skill.weeklyHoursGoal}h / week · target ${skill.targetLevel}%`}
                  checked={selectedSkills.includes(skill.id)}
                  onToggle={() => setSelectedSkills((values) => values.includes(skill.id) ? values.filter((value) => value !== skill.id) : [...values, skill.id])}
                />
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={skillDraft} onChange={(event) => setSkillDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomSkill(); } }} placeholder="Add another skill — e.g. TypeScript, UI design, Spanish" aria-label="Custom skill name" className="h-10 flex-1 rounded-xl bg-background/45" />
              <Button type="button" variant="outline" onClick={addCustomSkill} className="rounded-xl"><Plus className="h-4 w-4" /> Add skill</Button>
            </div>

            {customSkills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {customSkills.map((skill) => (
                  <span key={skill.id} className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1.5 text-xs">
                    {skill.name}
                    <button type="button" onClick={() => setCustomSkills((items) => items.filter((item) => item.id !== skill.id))} aria-label={`Remove ${skill.name}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-border/60 bg-background/35 p-4">
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-sm font-medium">Add a DSA problem plan?</p><p className="mt-1 text-xs text-muted-foreground">Track solved problems and mastery across topics. You can turn this on later too.</p></div>
                <button type="button" role="switch" aria-checked={dsaActive} aria-label="Enable DSA tracking" onClick={() => setDsaActive((active) => !active)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${dsaActive ? 'bg-primary' : 'bg-muted'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-background transition-all ${dsaActive ? 'left-6' : 'left-1'}`} /></button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Nothing is pre-selected — your roadmap starts with only what you choose here.</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {HABIT_SEED.map((seed) => {
                const habit = buildHabit(seed);
                return (
                  <ToggleCard
                    key={habit.id}
                    title={habit.name}
                    detail={`${habit.targetPerWeek} days / week`}
                    checked={habitIds.includes(habit.id)}
                    onToggle={() => habitIds.includes(habit.id) ? removeHabit(habit.id) : addHabit(seed)}
                  />
                );
              })}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={habitDraft} onChange={(event) => setHabitDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomHabit(); } }} placeholder="Add your own routine" aria-label="Custom habit name" className="h-10 flex-1 rounded-xl bg-background/45" />
              <Button type="button" variant="outline" onClick={addCustomHabit} className="rounded-xl"><Plus className="h-4 w-4" /> Add habit</Button>
            </div>

            {habits.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Your tracked habits</p>
                {habits.map((habit) => (
                  <div key={habit.id} className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/35 p-3 sm:flex-row sm:items-center">
                    <Input value={habit.name} onChange={(event) => setHabits((items) => items.map((item) => item.id === habit.id ? { ...item, name: event.target.value } : item))} aria-label={`${habit.name || 'Habit'} name`} className="h-10 min-w-0 flex-1 rounded-xl" />
                    <HabitTarget name={habit.name} value={habit.targetPerWeek} onChange={(next) => setHabits((items) => items.map((item) => item.id === habit.id ? { ...item, targetPerWeek: next } : item))} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeHabit(habit.id)} aria-label={`Remove ${habit.name || 'habit'}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Habit history starts empty, so your streaks reflect your own routine from day one.</p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <TargetControl label="Daily study target" hint="A steady, achievable daily focus goal." value={dailyTarget} min={0.5} max={12} step={0.5} unit="hours / day" presets={[2, 3, 4, 6]} onChange={setDailyTarget} />
              <TargetControl label="Weekly coding target" hint="Time set aside for building skills." value={codingTarget} min={0} max={40} step={1} unit="hours / week" presets={[5, 10, 15, 20]} onChange={setCodingTarget} />
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/35 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Your workspace</p>
              <p className="mt-2 text-sm font-medium">{profileName.trim() || 'You'}{university.trim() ? ` · ${university.trim()}` : ''}</p>
              <p className="mt-1 text-xs text-muted-foreground">{summary}{dsaActive ? ' · DSA plan on' : ''}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {subjects.map((subject) => <span key={subject.id} className="rounded-full border border-border/60 bg-background/50 px-2.5 py-1 text-[11px] text-muted-foreground">{subject.name || 'Untitled subject'}</span>)}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">We will build your dashboard with no demo tasks, notes or history — only what you just told us.</p>
            </div>
          </div>
        )}

        {error && <p role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</p>}
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border/50 pt-5">
          <Button type="button" variant="ghost" disabled={step === 0 || saving} onClick={() => { setError(''); setStep((value) => Math.max(0, value - 1)); }} className="rounded-xl"><ArrowLeft className="h-4 w-4" /> Back</Button>
          {step < STEPS.length - 1
            ? <Button type="button" onClick={goNext} className="rounded-xl">Continue <ArrowRight className="h-4 w-4" /></Button>
            : <Button type="button" disabled={!canFinish} onClick={finish} className="rounded-xl">{saving ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Building…</> : <>Build my workspace <Check className="h-4 w-4" /></>}</Button>}
        </div>
      </section>
    </main>
  );
}
