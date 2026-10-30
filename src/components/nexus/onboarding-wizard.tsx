'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Code2, Dumbbell, LoaderCircle, Target, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNexus, useUI } from '@/lib/nexus/store';
import { HABIT_SEED, SUBJECT_SEED } from '@/lib/nexus/constants';
import type { Habit, Subject } from '@/lib/nexus/types';
import { uid } from '@/lib/nexus/utils';

const STEPS: { title: string; subtitle: string; icon: LucideIcon }[] = [
  { title: 'Your subjects', subtitle: 'Choose the college subjects in your weekly plan.', icon: BookOpen },
  { title: 'Coding tracks', subtitle: 'Set your skill goals and DSA access.', icon: Code2 },
  { title: 'Habits & hobbies', subtitle: 'Pick the routines you want to track.', icon: Dumbbell },
  { title: 'Study targets', subtitle: 'Choose goals that feel realistic for your week.', icon: Target },
];

const CODING_IDS = new Set(['htmlcss', 'js', 'java', 'react', 'c', 'cpp', 'guitar']);

function ToggleCard({ checked, onToggle, title, detail }: { checked: boolean; onToggle: () => void; title: string; detail?: string }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={checked} className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition ${checked ? 'border-primary/45 bg-primary/[0.09]' : 'border-border/60 bg-background/35 hover:bg-accent/50'}`}>
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background/40'}`}>{checked && <Check className="h-3.5 w-3.5" />}</span>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{title}</span>{detail && <span className="mt-0.5 block text-[11px] text-muted-foreground">{detail}</span>}</span>
    </button>
  );
}

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const initial = useMemo(() => useNexus.getState(), []);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState(() => initial.subjects.map((subject) => subject.id));
  const [selectedSkills, setSelectedSkills] = useState(() => initial.skills.map((skill) => skill.id));
  const [selectedHabits, setSelectedHabits] = useState(() => initial.habits.filter((habit) => !habit.archived).map((habit) => habit.id));
  const [dsaActive, setDsaActive] = useState(() => initial.dsaActive);
  const [dailyTarget, setDailyTarget] = useState(() => String(initial.profile.dailyTargetHours));
  const [codingTarget, setCodingTarget] = useState(() => String(initial.profile.weeklyCodingTargetHours));

  const toggle = (values: string[], setValues: (next: string[]) => void, id: string) => {
    setValues(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);
  };

  const finish = async () => {
    setSaving(true);
    setError('');
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const store = useNexus;
      const state = store.getState();
      const selected = new Set(selectedSubjects);
      const skillsSelected = new Set(selectedSkills);
      const habitsSelected = new Set(selectedHabits);

      const subjects: Subject[] = state.subjects
        .filter((subject) => !['college', 'language'].includes(subject.category) || selected.has(subject.id))
        .filter((subject) => !CODING_IDS.has(subject.id) || selected.has(subject.id));
      for (const subject of SUBJECT_SEED) {
        if (selected.has(subject.id) && !subjects.some((item) => item.id === subject.id)) subjects.push({ ...subject });
      }

      const skills = state.skills.filter((skill) => skillsSelected.has(skill.id));
      const habits: Habit[] = state.habits.map((habit) => ({ ...habit, archived: !habitsSelected.has(habit.id) }));
      for (const seed of HABIT_SEED.filter((habit) => habitsSelected.has(habit.name))) {
        if (!habits.some((habit) => habit.name === seed.name)) {
          habits.push({ id: uid(), ...seed, archived: false, createdAt: new Date().toISOString() });
        }
      }
      const habitRecords = { ...state.habitRecords };
      for (const habit of habits) habitRecords[habit.id] ??= {};

      const profile = {
        ...state.profile,
        dailyTargetHours: Number(dailyTarget),
        weeklyCodingTargetHours: Number(codingTarget),
      };
      const data = {
        ...state,
        profile,
        subjects,
        skills,
        habits,
        habitRecords,
        dsaActive,
        settings: { ...state.settings, dashboardWidgets: [...state.settings.dashboardWidgets] },
      };

      if (supabase) {
        const { error: authError, data: authData } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) throw new Error('Your sign-in has expired. Please sign in again to save your plan.');
      }

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
            onboarding: { subjects: selectedSubjects, skills: selectedSkills, habits: selectedHabits },
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
      setError(cause instanceof Error ? cause.message : 'Could not save your plan. Your choices are kept on this device; try again when connected.');
    } finally {
      setSaving(false);
    }
  };

  const current = STEPS[step];
  const StepIcon = current.icon;
  const skills = initial.skills.filter((skill) => CODING_IDS.has(skill.id));

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8 text-foreground">
      <div className="aurora-stage pointer-events-none" aria-hidden="true"><div className="aurora-stars" /><div className="aurora-blob aurora-blob-a" /><div className="aurora-blob aurora-blob-c" /><div className="aurora-vignette" /><div className="aurora-grain" /></div>
      <section className="glass-strong relative z-10 w-full max-w-2xl rounded-[28px] border border-border/60 p-5 shadow-2xl sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><StepIcon className="h-5 w-5" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Personalize your plan · {step + 1} of {STEPS.length}</p><h1 className="text-xl font-semibold">{current.title}</h1></div></div>
          <span className="hidden text-xs text-muted-foreground sm:block">NEXUS OS</span>
        </div>
        <div className="mb-6 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
        <p className="mb-5 text-sm text-muted-foreground">{current.subtitle}</p>

        {step === 0 && <div className="grid gap-2 sm:grid-cols-2">{initial.subjects.filter((subject) => subject.category === 'college' || subject.category === 'language').map((subject) => <ToggleCard key={subject.id} title={subject.name} checked={selectedSubjects.includes(subject.id)} onToggle={() => toggle(selectedSubjects, setSelectedSubjects, subject.id)} />)}</div>}

        {step === 1 && <div className="space-y-4"><div className="grid gap-2 sm:grid-cols-2">{skills.map((skill) => <ToggleCard key={skill.id} title={skill.name} detail={`Target level · ${skill.targetLevel}%`} checked={selectedSkills.includes(skill.id)} onToggle={() => toggle(selectedSkills, setSelectedSkills, skill.id)} />)}</div><div className="rounded-2xl border border-border/60 bg-background/35 p-4"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">DSA Semester 1 lock</p><p className="mt-1 text-xs text-muted-foreground">Keep DSA locked until you are ready to begin.</p></div><button type="button" role="switch" aria-checked={dsaActive} onClick={() => setDsaActive((active) => !active)} className={`relative h-6 w-11 rounded-full transition ${dsaActive ? 'bg-primary' : 'bg-muted'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-background transition-all ${dsaActive ? 'left-6' : 'left-1'}`} /></button></div></div></div>}

        {step === 2 && <div className="grid gap-2 sm:grid-cols-2">{initial.habits.map((habit) => <ToggleCard key={habit.id} title={habit.name} detail={`Goal · ${habit.targetPerWeek} days per week`} checked={selectedHabits.includes(habit.id)} onToggle={() => toggle(selectedHabits, setSelectedHabits, habit.id)} />)}{HABIT_SEED.filter((seed) => !initial.habits.some((habit) => habit.name === seed.name)).map((seed) => <ToggleCard key={seed.name} title={seed.name} detail={`Goal · ${seed.targetPerWeek} days per week`} checked={selectedHabits.includes(seed.name)} onToggle={() => toggle(selectedHabits, setSelectedHabits, seed.name)} />)}</div>}

        {step === 3 && <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium"><span>Daily study target (hours)</span><Input type="number" min="0.5" max="24" step="0.5" required value={dailyTarget} onChange={(event) => setDailyTarget(event.target.value)} className="h-11 rounded-xl bg-background/45" /><span className="block text-xs font-normal text-muted-foreground">A steady, achievable daily focus goal.</span></label><label className="space-y-2 text-sm font-medium"><span>Weekly coding target (hours)</span><Input type="number" min="0" max="168" step="0.5" required value={codingTarget} onChange={(event) => setCodingTarget(event.target.value)} className="h-11 rounded-xl bg-background/45" /><span className="block text-xs font-normal text-muted-foreground">Time set aside for building coding skills.</span></label></div>}

        {error && <p role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</p>}
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border/50 pt-5"><Button type="button" variant="ghost" disabled={step === 0 || saving} onClick={() => setStep((value) => Math.max(0, value - 1))} className="rounded-xl"> <ArrowLeft className="h-4 w-4" /> Back</Button>{step < STEPS.length - 1 ? <Button type="button" onClick={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))} className="rounded-xl">Continue <ArrowRight className="h-4 w-4" /></Button> : <Button type="button" disabled={saving || !Number.isFinite(Number(dailyTarget)) || !Number.isFinite(Number(codingTarget))} onClick={finish} className="rounded-xl">{saving ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Saving…</> : <>Finish setup <Check className="h-4 w-4" /></>}</Button>}</div>
      </section>
    </main>
  );
}
