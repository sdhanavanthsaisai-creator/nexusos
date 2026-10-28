/* ══════════════════════════════════════════════════════════════════════════
   GlassOS — State (Zustand)
   useSettings · useOS · useIsland · useMusicStore · useFiles · useNotes ·
   useBrowserStore · useSticky
   ══════════════════════════════════════════════════════════════════════════ */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { APP_META } from './app-meta';
import type {
  AppId, Rect, Settings, SnapHint, WinState, IslandAlert, IslandModule,
  TimerState, Track, VFile, NoteDoc, BrowserTab, Bookmark,
} from './types';
import { TRACKS } from './music';
import { sfx } from './sound';

/* Safe localStorage that never throws (quota, private mode). */
const safeStorage = {
  getItem: (name: string): string | null => {
    try { return localStorage.getItem(name); } catch { return null; }
  },
  setItem: (name: string, value: string) => {
    try { localStorage.setItem(name, value); } catch { /* quota — ignore */ }
  },
  removeItem: (name: string) => {
    try { localStorage.removeItem(name); } catch { /* noop */ }
  },
};
const storage = createJSONStorage(() => safeStorage);

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => Date.now();

/* ══════════════════════════════ Settings ═════════════════════════════════ */

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark-glass',
  wallpaper: 'aurora',
  customWallpaper: null,
  blur: 22,
  opacity: 0.55,
  sounds: true,
  volume: 0.6,
  brightness: 1,
  reduceTransparency: false,
  showWidgets: true,
  dockSize: 52,
  islandEnabled: true,
  clock24h: false,
  accent: '',
};

interface SettingsStore extends Settings {
  set<K extends keyof Settings>(key: K, value: Settings[K]): void;
  patch(p: Partial<Settings>): void;
  reset(): void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (key, value) => set({ [key]: value } as Partial<Settings>),
      patch: (p) => set(p),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    { name: 'glassos-settings-v1', storage },
  ),
);

/* ══════════════════════════════ Window OS ════════════════════════════════ */

interface OSStore {
  viewport: { w: number; h: number };
  windows: WinState[];
  zTop: number;
  focusedId: string | null;
  snapHint: SnapHint;
  spotlightOpen: boolean;
  launchpadOpen: boolean;
  contextMenu: { x: number; y: number } | null;
  booted: boolean;
  hintDismissed: boolean;

  setViewport(w: number, h: number): void;
  openApp(appId: AppId): void;
  closeWindow(id: string): void;
  focusWindow(id: string): void;
  minimizeWindow(id: string): void;
  toggleMaximize(id: string): void;
  setRect(id: string, rect: Partial<Rect>): void;
  snapWindow(id: string, hint: SnapHint): void;
  setSnapHint(h: SnapHint): void;
  tidyWindows(): void;
  setSpotlight(open: boolean): void;
  setLaunchpad(open: boolean): void;
  setContextMenu(pos: { x: number; y: number } | null): void;
  setBooted(b: boolean): void;
  dismissHint(): void;
  closeAll(): void;
}

function desktopArea(vp: { w: number; h: number }) {
  const top = 42; // topbar + breathing room
  const bottom = 100; // dock zone
  return { x: 0, y: top, w: vp.w, h: Math.max(240, vp.h - top - bottom) };
}

export const useOS = create<OSStore>()(
  persist(
    (set, get) => ({
      viewport: { w: 1280, h: 800 },
      windows: [],
      zTop: 10,
      focusedId: null,
      snapHint: null,
      spotlightOpen: false,
      launchpadOpen: false,
      contextMenu: null,
      booted: false,
      hintDismissed: false,

      setViewport: (w, h) => set({ viewport: { w, h } }),

      openApp: (appId) => {
        const meta = APP_META[appId];
        const st = get();
        const existing = st.windows.find((w) => w.appId === appId);
        if (existing) {
          set({
            windows: st.windows.map((w) =>
              w.id === existing.id ? { ...w, minimized: false, z: st.zTop + 1 } : w,
            ),
            zTop: st.zTop + 1,
            focusedId: existing.id,
            launchpadOpen: false,
            spotlightOpen: false,
          });
          return;
        }
        const area = desktopArea(st.viewport);
        const cascade = (st.windows.length % 5) * 28;
        const w = Math.min(meta.w, area.w - 40);
        const h = Math.min(meta.h, area.h - 20);
        const win: WinState = {
          id: uid(),
          appId,
          x: Math.max(12, Math.round((area.w - w) / 2 - 60 + cascade)),
          y: Math.max(area.y, Math.round(area.y + (area.h - h) / 2 - 40 + cascade * 0.6)),
          w,
          h,
          z: st.zTop + 1,
          minimized: false,
          maximized: false,
        };
        set({
          windows: [...st.windows, win],
          zTop: st.zTop + 1,
          focusedId: win.id,
          launchpadOpen: false,
          spotlightOpen: false,
          contextMenu: null,
        });
        sfx.pop();
      },

      closeWindow: (id) => {
        const st = get();
        const rest = st.windows.filter((w) => w.id !== id);
        const topRest = [...rest].filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0];
        set({ windows: rest, focusedId: topRest?.id ?? null });
        sfx.close();
      },

      focusWindow: (id) => {
        const st = get();
        const w = st.windows.find((x) => x.id === id);
        if (!w) return;
        if (st.focusedId === id && !w.minimized) return;
        set({
          windows: st.windows.map((x) => (x.id === id ? { ...x, z: st.zTop + 1, minimized: false } : x)),
          zTop: st.zTop + 1,
          focusedId: id,
        });
      },

      minimizeWindow: (id) => {
        const st = get();
        const rest = st.windows.filter((w) => w.id !== id && !w.minimized).sort((a, b) => b.z - a.z)[0];
        set({
          windows: st.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)),
          focusedId: rest?.id ?? null,
        });
        sfx.close();
      },

      toggleMaximize: (id) => {
        const st = get();
        const area = desktopArea(st.viewport);
        set({
          windows: st.windows.map((w) => {
            if (w.id !== id) return w;
            if (w.maximized && w.prevRect) {
              return { ...w, ...w.prevRect, maximized: false, prevRect: undefined };
            }
            return {
              ...w,
              prevRect: { x: w.x, y: w.y, w: w.w, h: w.h },
              x: area.x, y: area.y, w: area.w, h: area.h,
              maximized: true,
            };
          }),
        });
        sfx.toggleOn();
      },

      setRect: (id, rect) =>
        set({ windows: get().windows.map((w) => (w.id === id ? { ...w, ...rect, maximized: false } : w)) }),

      snapWindow: (id, hint) => {
        if (!hint) return;
        const st = get();
        const area = desktopArea(st.viewport);
        const rects: Record<Exclude<SnapHint, null>, Rect> = {
          left: { x: area.x, y: area.y, w: Math.round(area.w / 2), h: area.h },
          right: { x: area.x + Math.round(area.w / 2), y: area.y, w: Math.round(area.w / 2), h: area.h },
          max: { x: area.x, y: area.y, w: area.w, h: area.h },
        };
        set({
          windows: st.windows.map((w) => {
            if (w.id !== id) return w;
            if (!w.maximized && !w.prevRect) {
              return { ...w, ...rects[hint], maximized: hint === 'max', prevRect: { x: w.x, y: w.y, w: w.w, h: w.h } };
            }
            return { ...w, ...rects[hint], maximized: hint === 'max' };
          }),
          snapHint: null,
        });
        sfx.pop();
      },

      setSnapHint: (h) => set({ snapHint: h }),

      tidyWindows: () => {
        const st = get();
        const area = desktopArea(st.viewport);
        const vis = st.windows.filter((w) => !w.minimized);
        const cols = Math.ceil(Math.sqrt(vis.length || 1));
        const rows = Math.ceil(vis.length / cols) || 1;
        const cw = Math.floor(area.w / cols);
        const ch = Math.floor(area.h / rows);
        let i = 0;
        set({
          windows: st.windows.map((w) => {
            if (w.minimized) return w;
            const c = i % cols;
            const r = Math.floor(i / cols);
            i++;
            return {
              ...w,
              x: area.x + c * cw + 10,
              y: area.y + r * ch + 8,
              w: cw - 20,
              h: ch - 16,
              maximized: false,
            };
          }),
        });
        sfx.toggleOn();
      },

      setSpotlight: (open) => set({ spotlightOpen: open, launchpadOpen: false, contextMenu: null }),
      setLaunchpad: (open) => set({ launchpadOpen: open, spotlightOpen: false, contextMenu: null }),
      setContextMenu: (pos) => set({ contextMenu: pos }),
      setBooted: (b) => set({ booted: b }),
      dismissHint: () => set({ hintDismissed: true }),
      closeAll: () => set({ windows: [], focusedId: null }),
    }),
    {
      name: 'glassos-windows-v1',
      storage,
      partialize: (s) =>
        ({ windows: s.windows, hintDismissed: s.hintDismissed, zTop: s.zTop }) as unknown as OSStore,
    },
  ),
);

/* ══════════════════════════════ Dynamic Island ═══════════════════════════ */

interface IslandStore {
  expanded: boolean;
  module: IslandModule;
  alerts: IslandAlert[];
  timer: TimerState;
  aiBusy: boolean;

  setExpanded(b: boolean): void;
  setModule(m: IslandModule): void;
  pushAlert(a: Omit<IslandAlert, 'id'>): void;
  dismissAlert(): void;
  startTimer(seconds: number, label: string): void;
  pauseTimer(): void;
  resumeTimer(): void;
  resetTimer(): void;
  tickTimer(): void;
  setAiBusy(b: boolean): void;
}

export const useIsland = create<IslandStore>()((set, get) => ({
  expanded: false,
  module: 'idle',
  alerts: [],
  timer: { running: false, remaining: 0, total: 0, label: '', endAt: null },
  aiBusy: false,

  setExpanded: (b) => set({ expanded: b }),
  setModule: (m) => set({ module: m, expanded: m !== 'idle' ? get().expanded : false }),

  pushAlert: (a) => {
    const alert: IslandAlert = { ...a, id: uid() };
    set({ alerts: [...get().alerts, alert].slice(-3), module: 'alert' });
    sfx.notify();
    setTimeout(() => {
      const st = get();
      if (st.module === 'alert' && st.alerts.some((x) => x.id === alert.id)) {
        const rest = st.alerts.filter((x) => x.id !== alert.id);
        set({ alerts: rest, module: rest.length ? 'alert' : 'idle' });
      }
    }, 3200);
  },

  dismissAlert: () => {
    const [, ...rest] = get().alerts;
    set({ alerts: rest, module: rest.length ? 'alert' : 'idle' });
  },

  startTimer: (seconds, label) => {
    set({
      timer: { running: true, remaining: seconds, total: seconds, label, endAt: now() + seconds * 1000 },
      module: 'timer',
    });
    sfx.toggleOn();
  },
  pauseTimer: () => {
    const t = get().timer;
    set({ timer: { ...t, running: false, endAt: null } });
    sfx.toggleOff();
  },
  resumeTimer: () => {
    const t = get().timer;
    if (t.remaining <= 0) return;
    set({ timer: { ...t, running: true, endAt: now() + t.remaining * 1000 } });
    sfx.toggleOn();
  },
  resetTimer: () => {
    const t = get().timer;
    set({ timer: { ...t, running: false, remaining: t.total, endAt: null } });
    sfx.toggleOff();
  },
  tickTimer: () => {
    const t = get().timer;
    if (!t.running || !t.endAt) return;
    const remaining = Math.max(0, Math.round((t.endAt - now()) / 1000));
    if (remaining !== t.remaining) {
      set({ timer: { ...t, remaining } });
      if (remaining === 0) {
        sfx.notify();
        get().pushAlert({ icon: 'check', title: `${t.label} complete`, detail: 'Timer finished' });
        set({ timer: { ...t, running: false, endAt: null, remaining: 0 } });
      } else if (remaining <= 3) {
        sfx.tick();
      }
    }
  },
  setAiBusy: (b) => set({ aiBusy: b }),
}));

/* ══════════════════════════════ Music ════════════════════════════════════ */

interface MusicStore {
  tracks: Track[];
  currentId: string;
  playing: boolean;
  liked: string[];
  shuffle: boolean;
  /** snapshot position updated ~2x/s for compact UI; smooth UI reads engine directly */
  posSnapshot: number;

  setCurrent(id: string): void;
  setPlaying(p: boolean): void;
  toggleLike(id: string): void;
  setShuffle(s: boolean): void;
  setPosSnapshot(p: number): void;
}

export const useMusicStore = create<MusicStore>()(
  persist(
    (set, get) => ({
      tracks: TRACKS,
      currentId: TRACKS[0].id,
      playing: false,
      liked: [],
      shuffle: false,
      posSnapshot: 0,
      setCurrent: (id) => set({ currentId: id }),
      setPlaying: (p) => set({ playing: p }),
      toggleLike: (id) =>
        set({ liked: get().liked.includes(id) ? get().liked.filter((x) => x !== id) : [...get().liked, id] }),
      setShuffle: (s) => set({ shuffle: s }),
      setPosSnapshot: (p) => set({ posSnapshot: p }),
    }),
    {
      name: 'glassos-music-v1',
      storage,
      partialize: (s) => ({ currentId: s.currentId, liked: s.liked, shuffle: s.shuffle }) as unknown as MusicStore,
    },
  ),
);

/* ══════════════════════════════ Files (Finder) ═══════════════════════════ */

function seedFiles(): VFile[] {
  const t = now();
  return [
    { id: 'f-docs', name: 'Documents', type: 'folder', parentId: null, createdAt: t, updatedAt: t },
    { id: 'f-pics', name: 'Pictures', type: 'folder', parentId: null, createdAt: t, updatedAt: t },
    { id: 'f-music', name: 'Music', type: 'folder', parentId: null, createdAt: t, updatedAt: t },
    { id: 'f-proj', name: 'Projects', type: 'folder', parentId: null, createdAt: t, updatedAt: t },
    {
      id: 'file-welcome', name: 'read-me-first.txt', type: 'text', parentId: 'f-docs',
      content:
        'Welcome to GlassOS ✦\n\nEverything here is real:\n· Drag windows by their title bar — near a screen edge they snap.\n· ⌘K opens Spotlight, ⌘M minimizes, Esc dismisses.\n· The Dynamic Island up top is alive — hover it.\n· Music is synthesized live by your browser.\n· Everything you do is saved locally.\n\nHave fun exploring.',
      size: 312, createdAt: t, updatedAt: t, starred: true,
    },
    {
      id: 'file-roadmap', name: 'ideas.md', type: 'text', parentId: 'f-docs',
      content: '# Ideas\n\n- [x] Glass window manager\n- [x] Dynamic Island\n- [ ] Multiplayer desktops\n- [ ] Plugin API\n\n> "Design is not just what it looks like. Design is how it works."',
      size: 168, createdAt: t, updatedAt: t,
    },
    {
      id: 'file-sunrise', name: 'sunrise.svg', type: 'image', parentId: 'f-pics',
      content:
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#312e81"/><stop offset=".55" stop-color="#a855f7"/><stop offset="1" stop-color="#fb923c"/></linearGradient></defs><rect width="640" height="400" fill="url(#g)"/><circle cx="320" cy="330" r="90" fill="#fde68a"/><rect y="330" width="640" height="70" fill="#1e1b4b"/></svg>',
        ),
      size: 640, createdAt: t, updatedAt: t,
    },
    {
      id: 'file-wave', name: 'waveform.svg', type: 'image', parentId: 'f-pics',
      content:
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="#0f172a"/><g stroke="#22d3ee" stroke-width="6" stroke-linecap="round">' +
          Array.from({ length: 20 }, (_, i) => {
            const x = 40 + i * 30;
            const h = 40 + Math.abs(Math.sin(i * 0.9)) * 220;
            return `<line x1="${x}" y1="${200 - h / 2}" x2="${x}" y2="${200 + h / 2}" opacity="${0.4 + (i % 3) * 0.2}"/>`;
          }).join('') +
          '</g></svg>',
        ),
      size: 610, createdAt: t, updatedAt: t,
    },
    { id: 'file-tracknote', name: 'liner-notes.txt', type: 'text', parentId: 'f-music', content: 'Aurora Drift — recorded in the key of A, 72 BPM.\nGlass Ribbons — G major, 84 BPM.\nMidnight Lagoon — F lydian-ish, 64 BPM.\nNeon Comet — D minor, 96 BPM.', size: 190, createdAt: t, updatedAt: t },
    { id: 'file-glass', name: 'glass-os/', type: 'folder', parentId: 'f-proj', createdAt: t, updatedAt: t },
    { id: 'file-spec', name: 'spec.md', type: 'text', parentId: 'file-glass', content: '# GlassOS spec\n\nSpring(300, 30) everywhere.\nBlur 22px, saturate 1.7.\nOne island to rule them all.', size: 90, createdAt: t, updatedAt: t, starred: true },
  ];
}

interface FilesStore {
  files: VFile[];
  create(parentId: string | null, name: string, type: VFile['type'], content?: string): string;
  rename(id: string, name: string): void;
  updateContent(id: string, content: string): void;
  remove(id: string): void;
  toggleStar(id: string): void;
  resetFs(): void;
}

export const useFiles = create<FilesStore>()(
  persist(
    (set, get) => ({
      files: seedFiles(),
      create: (parentId, name, type, content) => {
        const id = 'f' + uid();
        const file: VFile = { id, name, type, parentId, content, size: content?.length ?? 0, createdAt: now(), updatedAt: now() };
        set({ files: [...get().files, file] });
        sfx.pop();
        return id;
      },
      rename: (id, name) => {
        const taken = get().files.some((f) => f.parentId === (get().files.find((x) => x.id === id)?.parentId ?? null) && f.name === name && f.id !== id);
        if (taken) { sfx.error(); return; }
        set({ files: get().files.map((f) => (f.id === id ? { ...f, name, updatedAt: now() } : f)) });
      },
      updateContent: (id, content) =>
        set({ files: get().files.map((f) => (f.id === id ? { ...f, content, size: content.length, updatedAt: now() } : f)) }),
      remove: (id) => {
        const all = get().files;
        const doomed = new Set([id]);
        let grew = true;
        while (grew) {
          grew = false;
          for (const f of all) {
            if (f.parentId && doomed.has(f.parentId) && !doomed.has(f.id)) {
              doomed.add(f.id);
              grew = true;
            }
          }
        }
        set({ files: all.filter((f) => !doomed.has(f.id)) });
        sfx.toggleOff();
      },
      toggleStar: (id) => set({ files: get().files.map((f) => (f.id === id ? { ...f, starred: !f.starred } : f)) }),
      resetFs: () => set({ files: seedFiles() }),
    }),
    { name: 'glassos-files-v1', storage },
  ),
);

/* ══════════════════════════════ Notes ════════════════════════════════════ */

function seedNotes(): NoteDoc[] {
  const t = now();
  return [
    {
      id: 'n-welcome',
      title: 'Welcome to GlassOS',
      body:
        '# Welcome ✦\n\nThis is **GlassOS** — a desktop that lives in your browser.\n\n## Try this\n- Press `⌘K` for **Spotlight**\n- Hover the **Dynamic Island** at the top\n- Drag a window against the **left edge** to snap it\n- Open **Music** — it is synthesized live, waveform and all\n\n> Everything auto-saves to this device. No accounts, no cloud, no noise.',
      tags: ['glassos'],
      pinned: true,
      createdAt: t,
      updatedAt: t,
    },
    {
      id: 'n-shortcuts',
      title: 'Shortcuts cheat-sheet',
      body:
        '## Keyboard\n\n| Keys | Action |\n|---|---|\n| `⌘K` / `⌘Space` | Spotlight |\n| `⌘M` | Minimize window |\n| `⌘W` | Close window |\n| `Esc` | Dismiss overlays |\n\n## Windows\n- Drag to **screen edges** to snap (left / right / top = max)\n- Double-click the title bar to maximize\n- Right-click the desktop for quick actions',
      tags: ['guide'],
      pinned: false,
      createdAt: t - 86400000,
      updatedAt: t - 86400000,
    },
    {
      id: 'n-reading',
      title: 'Reading list',
      body: '## Queue\n\n1. *The Design of Everyday Things*\n2. *Refactoring UI*\n3. Spring physics — Apple HIG motion page\n\n`note-to-self`: less blur, more contrast.',
      tags: ['books'],
      pinned: false,
      createdAt: t - 2 * 86400000,
      updatedAt: t - 2 * 86400000,
    },
  ];
}

interface NotesStore {
  notes: NoteDoc[];
  create(): string;
  update(id: string, patch: Partial<Pick<NoteDoc, 'title' | 'body' | 'tags' | 'pinned'>>): void;
  remove(id: string): void;
  resetNotes(): void;
}

export const useNotes = create<NotesStore>()(
  persist(
    (set, get) => ({
      notes: seedNotes(),
      create: () => {
        const id = 'n' + uid();
        set({ notes: [{ id, title: 'Untitled', body: '', tags: [], pinned: false, createdAt: now(), updatedAt: now() }, ...get().notes] });
        sfx.pop();
        return id;
      },
      update: (id, patch) =>
        set({ notes: get().notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now() } : n)) }),
      remove: (id) => {
        set({ notes: get().notes.filter((n) => n.id !== id) });
        sfx.toggleOff();
      },
      resetNotes: () => set({ notes: seedNotes() }),
    }),
    { name: 'glassos-notes-v1', storage },
  ),
);

/* ══════════════════════════════ Browser ══════════════════════════════════ */

interface BrowserStore {
  tabs: BrowserTab[];
  activeTabId: string | null;
  bookmarks: Bookmark[];

  newTab(url?: string): string;
  closeTab(id: string): void;
  setActive(id: string): void;
  updateTab(id: string, patch: Partial<BrowserTab>): void;
  toggleBookmark(b: Omit<Bookmark, 'id'>): void;
  isBookmarked(url: string): boolean;
  removeBookmark(id: string): void;
}

const HOME = 'glass://start';

export const useBrowserStore = create<BrowserStore>()(
  persist(
    (set, get) => {
      const first: BrowserTab = { id: 't1', title: 'New Tab', url: HOME, mode: 'web', reader: null, loading: false };
      return {
        tabs: [first],
        activeTabId: 't1',
        bookmarks: [
          { id: 'b1', title: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Operating_system' },
          { id: 'b2', title: 'MDN', url: 'https://developer.mozilla.org/en-US/docs/Web' },
          { id: 'b3', title: 'Hacker News', url: 'https://news.ycombinator.com' },
          { id: 'b4', title: 'OpenStreetMap', url: 'https://www.openstreetmap.org' },
        ],
        newTab: (url) => {
          const id = 't' + uid();
          set({ tabs: [...get().tabs, { id, title: 'New Tab', url: url ?? HOME, mode: 'web', reader: null, loading: false }], activeTabId: id });
          sfx.click();
          return id;
        },
        closeTab: (id) => {
          const tabs = get().tabs;
          const idx = tabs.findIndex((t) => t.id === id);
          const rest = tabs.filter((t) => t.id !== id);
          const active = rest[Math.max(0, idx - 1)];
          set({ tabs: rest.length ? rest : [{ ...first, id: 't' + uid() }], activeTabId: rest.length ? active.id : null });
          sfx.click();
        },
        setActive: (id) => set({ activeTabId: id }),
        updateTab: (id, patch) => set({ tabs: get().tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)) }),
        toggleBookmark: (b) => {
          const exists = get().bookmarks.find((x) => x.url === b.url);
          if (exists) {
            set({ bookmarks: get().bookmarks.filter((x) => x.id !== exists.id) });
            sfx.toggleOff();
          } else {
            set({ bookmarks: [...get().bookmarks, { ...b, id: 'b' + uid() }] });
            sfx.toggleOn();
          }
        },
        isBookmarked: (url) => !!get().bookmarks.find((x) => x.url === url),
        removeBookmark: (id) => set({ bookmarks: get().bookmarks.filter((b) => b.id !== id) }),
      };
    },
    {
      name: 'glassos-browser-v1',
      storage,
      partialize: (s) =>
        ({ bookmarks: s.bookmarks, tabs: s.tabs.map((t) => ({ ...t, loading: false, reader: null })) }) as unknown as BrowserStore,
    },
  ),
);

/* ══════════════════════════════ Sticky ═══════════════════════════════════ */

interface StickyStore {
  text: string;
  visible: boolean;
  setText(t: string): void;
  toggle(): void;
}

export const useSticky = create<StickyStore>()(
  persist(
    (set) => ({
      text: 'Ideas that glow ✦\n\n— ship the island\n— tune the springs',
      visible: true,
      setText: (text) => set({ text }),
      toggle: () => set((s) => ({ visible: !s.visible })),
    }),
    { name: 'glassos-sticky-v1', storage },
  ),
);
