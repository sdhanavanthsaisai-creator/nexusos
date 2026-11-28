'use client';

import { BookOpenCheck, ListChecks, Target, Check, ArrowRight, X } from 'lucide-react';
import { useNexus, useUI } from '@/lib/nexus/store';
import { dayTotalMinutes, todayKey } from '@/lib/nexus/utils';
import { DEFAULT_PROFILE } from '@/lib/nexus/constants';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * StartHere — the first-session path. Three steps, each with a live completion
 * check so the card empties itself out instead of nagging. Disappears once all
 * three are done, or when the user hides it.
 */
export default function StartHere() {
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const tasks = useNexus((s) => s.tasks);
  const profile = useNexus((s) => s.profile);
  const guideDismissed = useNexus((s) => s.settings.guideDismissed);
  const setSetting = useNexus((s) => s.setSetting);
  const setActiveModule = useUI((s) => s.setActiveModule);

  const today = todayKey();
  const loggedToday = dayTotalMinutes(dailyLogs[today]) > 0;
  const enoughTasks = tasks.length >= 3;
  const targetSet = profile.dailyTargetHours !== DEFAULT_PROFILE.dailyTargetHours;

  const steps = [
    {
      id: 'log',
      title: "Log today's study time",
      why: 'Pick a subject and how long you studied. Every chart and target counts from here.',
      done: loggedToday,
      action: 'Log study',
      icon: BookOpenCheck,
      run: () => setActiveModule('tracker'),
    },
    {
      id: 'tasks',
      title: 'Add 3 things you need to do',
      why: 'Tasks feed your focus list, the calendar and the deadline reminders.',
      done: enoughTasks,
      action: 'Add a task',
      icon: ListChecks,
      run: () => {
        setActiveModule('tasks');
        window.dispatchEvent(new CustomEvent('nexus:new-task'));
      },
    },
    {
      id: 'target',
      title: 'Set your daily study target',
      why: 'Your target is the line drawn across every week chart.',
      done: targetSet,
      action: 'Set target',
      icon: Target,
      run: () => setActiveModule('settings'),
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (guideDismissed || doneCount === steps.length) return null;

  return (
    <section className="glass rounded-2xl p-4" aria-labelledby="start-here-title">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 id="start-here-title" className="text-sm font-semibold tracking-tight">
            Start here
          </h3>
          <p className="text-xs text-muted-foreground">
            Three steps and your workspace starts working for you — {doneCount} of {steps.length} done.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground"
          aria-label="Hide the Start here guide"
          onClick={() => setSetting({ guideDismissed: true })}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>

      <ol className="space-y-1.5">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li
              key={step.id}
              className={cn(
                'flex items-start gap-3 rounded-xl border px-3 py-2.5',
                step.done ? 'border-border/40 bg-background/25' : 'border-border/60 bg-background/40',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold',
                  step.done
                    ? 'border-foreground/40 bg-foreground text-background'
                    : 'border-border bg-transparent text-muted-foreground',
                )}
                aria-hidden="true"
              >
                {step.done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
              </span>

              <div className="min-w-0 flex-1">
                <p className={cn('text-sm', step.done ? 'text-muted-foreground line-through' : 'font-medium')}>
                  {step.title}
                  <span className="sr-only">{step.done ? ' — done' : ' — not done yet'}</span>
                </p>
                {!step.done && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{step.why}</p>}
              </div>

              {!step.done && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 gap-1 text-[11px]"
                  onClick={step.run}
                >
                  {step.action}
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Button>
              )}
            </li>
          );
        })}
      </ol>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Not sure where something belongs? Open the <span className="font-medium text-foreground">?</span> button in
        the top bar.
      </p>
    </section>
  );
}
