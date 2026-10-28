/* ══════════════════════════════════════════════════════════════════════════
   GlassOS — Core Types
   ══════════════════════════════════════════════════════════════════════════ */

export type AppId =
  | 'finder'
  | 'browser'
  | 'notes'
  | 'music'
  | 'settings';

export type ThemeId = 'dark-glass' | 'frost-light' | 'aurora' | 'midnight-cyber';

export type WallpaperId =
  | 'aurora'
  | 'midnight'
  | 'nebula'
  | 'sunset'
  | 'cyber'
  | 'custom';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WinState extends Rect {
  id: string;
  appId: AppId;
  title?: string;
  z: number;
  minimized: boolean;
  maximized: boolean;
  prevRect?: Rect;
}

export type SnapHint = 'left' | 'right' | 'max' | null;

export type IslandModule = 'idle' | 'music' | 'timer' | 'ai' | 'alert';

export interface IslandAlert {
  id: string;
  icon: 'volume' | 'brightness' | 'battery' | 'download' | 'info' | 'check';
  title: string;
  detail?: string;
}

export interface TimerState {
  running: boolean;
  /** seconds remaining */
  remaining: number;
  /** total duration in seconds */
  total: number;
  label: string;
  endAt: number | null;
}

export interface Settings {
  theme: ThemeId;
  wallpaper: WallpaperId;
  customWallpaper: string | null; // dataURL
  blur: number;        // px 0..40
  opacity: number;     // 0..1 glass tint strength multiplier
  sounds: boolean;
  volume: number;      // 0..1 (UI sfx + music master)
  brightness: number;  // 0.35..1
  reduceTransparency: boolean;
  showWidgets: boolean;
  dockSize: number;    // 44..64
  islandEnabled: boolean;
  clock24h: boolean;
  accent: string;      // any css color, overrides --g-accent when set
}

/* ── Virtual file system ─────────────────────────────────────────────────── */

export type VFileType = 'folder' | 'note' | 'text' | 'image' | 'audio';

export interface VFile {
  id: string;
  name: string;
  type: VFileType;
  parentId: string | null; // null = root
  content?: string;        // text content or image dataURL
  size?: number;
  createdAt: number;
  updatedAt: number;
  starred?: boolean;
}

/* ── Notes ───────────────────────────────────────────────────────────────── */

export interface NoteDoc {
  id: string;
  title: string;
  body: string; // markdown
  tags: string[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

/* ── Music ───────────────────────────────────────────────────────────────── */

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  /** css gradient string used when no cover image exists */
  art: string;
  cover?: string; // /covers/xx.jpg
  duration: number; // seconds
  bpm: number;
  /** chord progression as semitone offsets from root, each chord = [a,b,c] */
  chords: number[][];
  root: number; // midi note of root
  mood: 'dreamy' | 'warm' | 'nocturnal' | 'ethereal';
}

/* ── Browser ─────────────────────────────────────────────────────────────── */

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  mode: 'web' | 'reader';
  reader?: { title: string; text: string; url: string } | null;
  loading: boolean;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
}

/* ── Misc ────────────────────────────────────────────────────────────────── */

export interface SysStatus {
  fps: number;
  battery: { level: number; charging: boolean } | null;
  memory: number | null; // used heap MB (chrome)
}

export const TOPBAR_H = 34;
export const DOCK_ZONE = 96;
