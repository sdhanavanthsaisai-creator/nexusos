import type { AppId } from './types';

/* App metadata (no React) — shared by store + registry to avoid cycles. */

export interface AppMeta {
  id: AppId;
  name: string;
  /** default window size */
  w: number;
  h: number;
  minW: number;
  minH: number;
  /** dock order */
  dock: number;
}

export const APP_META: Record<AppId, AppMeta> = {
  finder:   { id: 'finder',   name: 'Finder',   w: 860, h: 560, minW: 560, minH: 360, dock: 0 },
  browser:  { id: 'browser',  name: 'Prism',    w: 940, h: 620, minW: 560, minH: 400, dock: 1 },
  notes:    { id: 'notes',    name: 'Notes',    w: 820, h: 560, minW: 520, minH: 360, dock: 2 },
  music:    { id: 'music',    name: 'Music',    w: 780, h: 540, minW: 520, minH: 420, dock: 3 },
  settings: { id: 'settings', name: 'Settings', w: 780, h: 560, minW: 560, minH: 420, dock: 4 },
};

export const APP_ORDER: AppId[] = ['finder', 'browser', 'notes', 'music', 'settings'];
