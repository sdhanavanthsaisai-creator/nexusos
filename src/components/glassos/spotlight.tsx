'use client';

/* ══════════════════════════════════════════════════════════════════════════
   GlassOS — Spotlight (⌘K / ⌘Space)
   Search apps, actions, notes and files. Full keyboard navigation.
   ══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, Music2, Timer, Palette, Image as ImageIcon, StickyNote, LayoutGrid,
  FolderHeart, Sparkles, CornerDownLeft, ArrowUpDown, Wand2, FileText,
} from 'lucide-react';
import { useOS, useSettings, useNotes, useFiles, useIsland } from '@/lib/glassos/store';
import { useMusicControls } from '@/lib/glassos/music-hooks';
import { sfx } from '@/lib/glassos/sound';
import { APP_META, APP_ORDER } from '@/lib/glassos/app-meta';
import { AppIconTile } from './app-icons';
import { WALLPAPER_LIST } from './wallpaper';
import type { ThemeId } from '@/lib/glassos/types';

interface Item {
  id: string;
  group: 'Apps' | 'Actions' | 'Notes' | 'Files';
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

const THEME_ORDER: ThemeId[] = ['dark-glass', 'frost-light', 'aurora', 'midnight-cyber'];

export function Spotlight() {
  const spotlightOpen = useOS((s) => s.spotlightOpen);
  const setSpotlight = useOS((s) => s.setSpotlight);
  const openApp = useOS((s) => s.openApp);
  const tidyWindows = useOS((s) => s.tidyWindows);
  const setLaunchpad = useOS((s) => s.setLaunchpad);
  const settings = useSettings();
  const notes = useNotes((s) => s.notes);
  const files = useFiles((s) => s.files);
  const music = useMusicControls();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(() => {
    const query = q.trim().toLowerCase();

    const apps: Item[] = APP_ORDER.map((id) => ({
      id: `app-${id}`,
      group: 'Apps' as const,
      label: APP_META[id].name,
      hint: 'Application',
      icon: <AppIconTile appId={id} size={26} radius={7} />,
      run: () => openApp(id),
    }));

    const actions: Item[] = [
      {
        id: 'act-launchpad', group: 'Actions' as const, label: 'Open Launchpad',
        icon: <LayoutGrid size={16} className="g-accent" />, run: () => setLaunchpad(true),
      },
      {
        id: 'act-theme', group: 'Actions' as const, label: 'Cycle theme',
        hint: THEME_ORDER[(THEME_ORDER.indexOf(settings.theme) + 1) % THEME_ORDER.length],
        icon: <Palette size={16} className="g-accent" />,
        run: () => {
          const i = THEME_ORDER.indexOf(useSettings.getState().theme);
          useSettings.getState().set('theme', THEME_ORDER[(i + 1) % THEME_ORDER.length]);
          sfx.toggleOn();
        },
      },
      {
        id: 'act-wallpaper', group: 'Actions' as const, label: 'Shuffle wallpaper',
        icon: <ImageIcon size={16} className="g-accent" />,
        run: () => {
          const st = useSettings.getState();
          const i = WALLPAPER_LIST.findIndex((w) => w.id === st.wallpaper);
          st.set('wallpaper', WALLPAPER_LIST[(i + 1) % WALLPAPER_LIST.length].id);
          sfx.click();
        },
      },
      {
        id: 'act-timer', group: 'Actions' as const, label: 'Start 5 minute timer',
        icon: <Timer size={16} className="g-accent" />,
        run: () => useIsland.getState().startTimer(5 * 60, '5 min'),
      },
      {
        id: 'act-play', group: 'Actions' as const, label: music.playing ? 'Pause music' : 'Play music',
        icon: <Music2 size={16} className="g-accent" />, run: () => music.toggle(),
      },
      {
        id: 'act-tidy', group: 'Actions' as const, label: 'Tidy windows',
        icon: <Wand2 size={16} className="g-accent" />, run: () => tidyWindows(),
      },
      {
        id: 'act-note', group: 'Actions' as const, label: 'New note',
        icon: <StickyNote size={16} className="g-accent" />,
        run: () => { useNotes.getState().create(); openApp('notes'); },
      },
      {
        id: 'act-ai', group: 'Actions' as const, label: 'Ask the AI assistant',
        icon: <Sparkles size={16} className="g-accent" />,
        run: () => { openApp('settings'); window.dispatchEvent(new CustomEvent('glassos:settings-nav', { detail: 'ai' })); },
      },
      {
        id: 'act-favorites', group: 'Actions' as const, label: 'Show starred files',
        icon: <FolderHeart size={16} className="g-accent" />,
        run: () => { openApp('finder'); window.dispatchEvent(new CustomEvent('glassos:finder-starred')); },
      },
    ];

    const noteItems: Item[] = notes.map((n) => ({
      id: `note-${n.id}`, group: 'Notes' as const, label: n.title || 'Untitled',
      hint: n.tags.join(', ') || 'Note',
      icon: <StickyNote size={16} className="text-amber-300" />,
      run: () => { openApp('notes'); window.dispatchEvent(new CustomEvent('glassos:open-note', { detail: n.id })); },
    }));

    const fileItems: Item[] = files
      .filter((f) => f.type !== 'folder')
      .map((f) => ({
        id: `file-${f.id}`, group: 'Files' as const, label: f.name, hint: 'File',
        icon: <FileText size={15} className="g-text-3" />,
        run: () => { openApp('finder'); window.dispatchEvent(new CustomEvent('glassos:open-file', { detail: f.id })); },
      }));

    const all = [...apps, ...actions, ...noteItems, ...fileItems];
    if (!query) return [...apps, ...actions.slice(0, 5)];
    return all
      .filter((it) => it.label.toLowerCase().includes(query) || (it.hint ?? '').toLowerCase().includes(query))
      .slice(0, 12);
  }, [q, notes, files, settings.theme, openApp, tidyWindows, setLaunchpad, music]);

  useEffect(() => {
    if (spotlightOpen) {
      setQ('');
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [spotlightOpen]);

  useEffect(() => setIdx(0), [q]);

  const grouped = useMemo(() => {
    const g: Partial<Record<Item['group'], { item: Item; index: number }[]>> = {};
    items.forEach((item, index) => (g[item.group] ??= []).push({ item, index }));
    return g;
  }, [items]);

  const runItem = (it: Item) => {
    sfx.pop();
    it.run();
    setSpotlight(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter' && items[idx]) { e.preventDefault(); runItem(items[idx]); }
    else if (e.key === 'Escape') { setSpotlight(false); }
  };

  useEffect(() => {
    listRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [idx]);

  return (
    <AnimatePresence>
      {spotlightOpen && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-start justify-center pt-[16vh]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onPointerDown={() => setSpotlight(false)}
          role="dialog" aria-label="Spotlight search"
        >
          <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />
          <motion.div
            initial={{ scale: 0.94, y: -12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: -8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="glass-deep relative w-[600px] max-w-[92vw] overflow-hidden rounded-2xl"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
              <Search size={17} className="g-text-3" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder="Search apps, actions, notes, files…"
                className="g-input flex-1 text-[15px]"
                aria-label="Search"
              />
              <kbd className="glass-chip rounded-md px-1.5 py-0.5 text-[10px] g-text-3">esc</kbd>
            </div>

            <div ref={listRef} className="g-scroll max-h-[340px] overflow-y-auto p-2">
              {items.length === 0 && (
                <div className="px-4 py-8 text-center text-[13px] g-text-3">No results for “{q}”</div>
              )}
              {Object.entries(grouped).map(([group, list]) => (
                <div key={group} className="mb-1.5">
                  <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.12em] g-text-3">{group}</div>
                  {list!.map(({ item, index }) => {
                    const selected = index === idx;
                    return (
                      <button
                        key={item.id}
                        data-selected={selected}
                        onMouseEnter={() => setIdx(index)}
                        onClick={() => runItem(item)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${selected ? 'bg-white/[0.12]' : 'hover:bg-white/[0.06]'}`}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center">{item.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium g-text-1">{item.label}</span>
                          {item.hint && <span className="block truncate text-[11px] g-text-3">{item.hint}</span>}
                        </span>
                        {selected && <CornerDownLeft size={13} className="g-text-3" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[10.5px] g-text-3">
              <span className="flex items-center gap-1"><ArrowUpDown size={11} /> navigate · <CornerDownLeft size={11} /> open</span>
              <span>GlassOS Spotlight</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
