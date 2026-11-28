'use client';

import { ArrowRight } from 'lucide-react';
import { useUI } from '@/lib/nexus/store';
import { MODULE_NAV, moduleMeta } from '@/lib/nexus/constants';
import type { ModuleId } from '@/lib/nexus/types';
import { NAV_ICONS } from './nav-icons';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';

/** The four loops the whole product implements. Order matters — it is a path. */
const LOOPS: { step: string; what: string; ids: ModuleId[] }[] = [
  { step: '1 · Plan', what: 'Decide what to work on, and when.', ids: ['timetable', 'calendar', 'tasks', 'roadmap'] },
  { step: '2 · Study', what: 'Do the work, then record it.', ids: ['sessions', 'tracker', 'notes'] },
  { step: '3 · Track', what: 'Mark the routines and practice you kept up.', ids: ['habits', 'dsa'] },
  { step: '4 · Review', what: 'Look back, then adjust your targets.', ids: ['dashboard', 'analytics', 'reports'] },
];

/** The app's biggest ambiguity: four places accept effort. Say which is which. */
const RECORD: { want: string; go: ModuleId }[] = [
  { want: 'Time yourself studying', go: 'sessions' },
  { want: 'Record study you already did (yesterday, or a class)', go: 'tracker' },
  { want: 'Tick off a routine you kept', go: 'habits' },
  { want: 'Note something you have to do later', go: 'tasks' },
  { want: 'Save a link, or write something down', go: 'notes' },
];

const GLOSSARY: { term: string; meaning: string }[] = [
  { term: 'DSA', meaning: 'Data structures and algorithms — coding-interview practice. Off until you turn it on in Settings.' },
  { term: 'Kanban', meaning: 'A board of columns you move tasks across as they progress.' },
  { term: 'Burndown', meaning: 'How many tasks were still open at the end of each week.' },
  { term: 'Streak', meaning: 'Days in a row you hit your daily study target.' },
  { term: 'Energy', meaning: 'How you felt that day, 1–5. It shows which hours you study best.' },
  { term: 'Prime time', meaning: 'The hours of the day when you get the most done.' },
  { term: 'Concentration', meaning: 'Your self-rated focus for one session, 1–5.' },
  { term: 'Target', meaning: 'The number of hours you are aiming for, per day or per week.' },
];

const SHORTCUTS: { keys: string; what: string }[] = [
  { keys: 'Ctrl / ⌘ + K', what: 'Search and run a command' },
  { keys: 'N', what: 'New task' },
  { keys: 'S', what: 'Start a focus session' },
];

export default function HelpSheet() {
  const open = useUI((s) => s.helpOpen);
  const setOpen = useUI((s) => s.setHelpOpen);
  const setActiveModule = useUI((s) => s.setActiveModule);

  const go = (id: ModuleId) => {
    setActiveModule(id);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="glass-strong slim-scroll w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">How Study Hall works</SheetTitle>
          <SheetDescription className="text-xs">
            Everything here is one student&apos;s private workspace. Nothing is shared, and nothing is shown to you
            that you did not enter.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-7 px-4 pb-10 pt-5">
          {/* 1 — the loops */}
          <section aria-labelledby="help-loops">
            <h3 id="help-loops" className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              The four things you do
            </h3>
            <ol className="space-y-3">
              {LOOPS.map((loop) => (
                <li key={loop.step}>
                  <p className="text-sm font-medium">{loop.step}</p>
                  <p className="text-[11px] text-muted-foreground">{loop.what}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {loop.ids.map((id) => {
                      const meta = moduleMeta(id);
                      const Icon = NAV_ICONS[id];
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => go(id)}
                          className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                        >
                          <Icon className="h-3 w-3" aria-hidden="true" />
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* 2 — where do I record this */}
          <section aria-labelledby="help-record">
            <h3 id="help-record" className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Where do I record this?
            </h3>
            <ul className="space-y-1.5">
              {RECORD.map((row) => {
                const meta = moduleMeta(row.go);
                return (
                  <li key={row.go + row.want}>
                    <button
                      type="button"
                      onClick={() => go(row.go)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-background/30 px-3 py-2 text-left transition-colors hover:border-foreground/30 hover:bg-muted/30"
                    >
                      <span className="min-w-0 flex-1 text-xs">{row.want}</span>
                      <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-foreground">
                        {meta.label}
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* 3 — glossary */}
          <section aria-labelledby="help-words">
            <h3 id="help-words" className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Words we use
            </h3>
            <dl className="space-y-2">
              {GLOSSARY.map((entry) => (
                <div key={entry.term}>
                  <dt className="text-xs font-semibold">{entry.term}</dt>
                  <dd className="text-[11px] leading-relaxed text-muted-foreground">{entry.meaning}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* 4 — shortcuts */}
          <section aria-labelledby="help-keys">
            <h3 id="help-keys" className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Shortcuts
            </h3>
            <ul className="space-y-1.5">
              {SHORTCUTS.map((row) => (
                <li key={row.keys} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{row.what}</span>
                  <span className="kbd shrink-0">{row.keys}</span>
                </li>
              ))}
            </ul>
          </section>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Your work is saved to your account as you type. To take a copy, open {moduleMeta('reports').label} → JSON
            backup.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
