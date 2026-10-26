'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Search, Timer, Download, Braces, Moon, Sun, MonitorSmartphone, Palette,
  Plus, FileText, Sparkles, ListChecks, CornerDownLeft, type LucideIcon,
} from 'lucide-react';
import { useNexus, useUI } from '@/lib/nexus/store';
import type { ThemeId } from '@/lib/nexus/types';
import { MODULE_NAV } from '@/lib/nexus/constants';
import { downloadJSON } from '@/lib/nexus/utils';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command';

interface Action { id: string; label: string; icon: LucideIcon; run: () => void; keywords?: string; hint?: string }

const THEMES: { id: ThemeId; label: string; icon: LucideIcon }[] = [
  { id: 'dark', label: 'Obsidian Dark', icon: Moon },
  { id: 'light', label: 'Daylight', icon: Sun },
  { id: 'oled', label: 'OLED Black', icon: MonitorSmartphone },
  { id: 'cyberpunk', label: 'Cyberpunk', icon: Palette },
];

export default function CommandPalette() {
  const open = useUI((s) => s.paletteOpen);
  const setOpen = useUI((s) => s.setPaletteOpen);
  const setActiveModule = useUI((s) => s.setActiveModule);
  const setAiOpen = useUI((s) => s.setAiOpen);
  const startTimer = useUI((s) => s.startTimer);
  const subjects = useNexus((s) => s.subjects);

  // individual primitive-ish selectors (avoid new-object selectors)
  const tasks = useNexus((s) => s.tasks);
  const notes = useNexus((s) => s.notes);
  const setSetting = useNexus((s) => s.setSetting);
  const toggleDsa = useNexus((s) => s.toggleDsa);

  const [query, setQuery] = useState('');

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) setQuery('');
  };

  const close = () => handleOpenChange(false);

  const actions: Action[] = [
    {
      id: 'new-task', label: 'New task', icon: Plus, hint: 'N', keywords: 'create add todo',
      run: () => { setActiveModule('tasks'); window.dispatchEvent(new CustomEvent('nexus:new-task')); close(); },
    },
    {
      id: 'start-timer', label: 'Start focus timer', icon: Timer, hint: 'S', keywords: 'focus pomodoro log study',
      run: () => {
        const def = subjects[0]?.id;
        if (def) startTimer(def);
        setActiveModule('sessions');
        window.dispatchEvent(new CustomEvent('nexus:timer-started'));
        close();
      },
    },
    { id: 'ai-coach', label: 'Ask the AI Coach', icon: Sparkles, keywords: 'chat assistant help advice', run: () => { setAiOpen(true); close(); } },
    {
      id: 'export', label: 'Export JSON backup', icon: Download, keywords: 'backup save download',
      run: () => {
        const snap = useNexus.getState();
        const { _hydrated: _h, setHydrated: _s, ...data } = snap as typeof snap & Record<string, unknown>;
        void _h; void _s;
        downloadJSON(`nexusos-backup-${new Date().toISOString().slice(0, 10)}`, data);
        close();
      },
    },
    { id: 'toggle-dsa', label: 'Toggle DSA mode', icon: Braces, keywords: 'unlock data structures algorithms', run: () => { toggleDsa(); close(); } },
    ...THEMES.map((t) => ({
      id: `theme-${t.id}`, label: `Theme: ${t.label}`, icon: t.icon, keywords: 'appearance switch',
      run: () => { setSetting({ theme: t.id }); close(); },
    })),
  ];

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== 'done').slice(0, 8), [tasks]);

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput placeholder="Type a command or search…" value={query} onValueChange={setQuery} />
      <CommandList className="slim-scroll">
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick actions">
          {actions.map((a) => (
            <CommandItem key={a.id} value={a.label} keywords={[a.keywords ?? '']} onSelect={a.run}>
              <a.icon className="mr-2 h-4 w-4 text-primary" aria-hidden="true" />
              <span>{a.label}</span>
              {a.hint && <span className="kbd ml-auto">{a.hint}</span>}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {MODULE_NAV.map((m) => (
            <CommandItem key={m.id} value={`${m.label} ${m.desc}`} onSelect={() => { setActiveModule(m.id); close(); }}>
              <Search className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span>{m.label}</span>
              <span className="ml-auto text-[11px] text-muted-foreground">{m.desc}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />

        {openTasks.length > 0 && (
          <CommandGroup heading="Open tasks">
            {openTasks.map((t) => (
              <CommandItem key={t.id} value={t.title} onSelect={() => { setActiveModule('tasks'); close(); }}>
                <ListChecks className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="truncate">{t.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {notes.length > 0 && (
          <CommandGroup heading="Notes">
            {notes.map((n) => (
              <CommandItem key={n.id} value={n.title} onSelect={() => { setActiveModule('notes'); close(); }}>
                <FileText className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="truncate">{n.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
      <div className="flex items-center gap-3 border-t px-3 py-1.5 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><CornerDownLeft className="h-3 w-3" aria-hidden="true" /> select</span>
        <span>↑↓ navigate</span>
        <span>esc close</span>
      </div>
    </CommandDialog>
  );
}
