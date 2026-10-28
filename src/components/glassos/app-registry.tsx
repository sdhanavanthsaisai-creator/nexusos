'use client';

/* ══════════════════════════════════════════════════════════════════════════
   GlassOS — App Registry & Window Layer
   ══════════════════════════════════════════════════════════════════════════ */

import { AnimatePresence } from 'framer-motion';
import { useOS } from '@/lib/glassos/store';
import { APP_META } from '@/lib/glassos/app-meta';
import type { AppId, WinState } from '@/lib/glassos/types';
import { WindowFrame, SnapPreview } from './window-frame';
import { AppIconTile } from './app-icons';
import { FinderApp } from './apps/finder';
import { BrowserApp } from './apps/browser';
import { NotesApp } from './apps/notes';
import { MusicApp } from './apps/music-player';
import { SettingsApp } from './apps/settings-app';

export type AppProps = { win: WinState };

export const APP_COMPONENTS: Record<AppId, React.ComponentType<AppProps>> = {
  finder: FinderApp,
  browser: BrowserApp,
  notes: NotesApp,
  music: MusicApp,
  settings: SettingsApp,
};

export function WindowLayer() {
  const windows = useOS((s) => s.windows);

  return (
    <>
      <SnapPreview />
      <AnimatePresence>
        {windows.map((win) => {
          const Comp = APP_COMPONENTS[win.appId];
          const meta = APP_META[win.appId];
          return (
            <WindowFrame
              key={win.id}
              win={win}
              title={win.title ?? meta.name}
              icon={<AppIconTile appId={win.appId} size={13} radius={4} />}
            >
              <Comp win={win} />
            </WindowFrame>
          );
        })}
      </AnimatePresence>
    </>
  );
}
