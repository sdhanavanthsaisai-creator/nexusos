'use client';

/* ══════════════════════════════════════════════════════════════════════════
   GlassOS — Root Shell
   Themes · wallpaper · windows · island · dock · spotlight · shortcuts · sfx
   ══════════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Command, MousePointerClick } from 'lucide-react';
import {
  useOS, useSettings, useIsland, useMusicStore,
} from '@/lib/glassos/store';
import { musicEngine } from '@/lib/glassos/music';
import { configureSfx, sfx, unlockAudio } from '@/lib/glassos/sound';
import { Wallpaper } from './wallpaper';
import { TopBar } from './top-bar';
import { WindowLayer } from './app-registry';
import { Dock } from './dock';
import { Spotlight } from './spotlight';
import { Launchpad, DesktopContextMenu, DesktopWidgets, BootScreen } from './desktop-extras';
import type { ThemeId } from '@/lib/glassos/types';

/** Per-theme base glass alpha; settings.opacity (default .55) scales it. */
const THEME_BASE_ALPHA: Record<ThemeId, number> = {
  'dark-glass': 0.07,
  'frost-light': 0.5,
  aurora: 0.08,
  'midnight-cyber': 0.06,
};

export default function GlassOS() {
  const settings = useSettings();
  const setBooted = useOS((s) => s.setBooted);
  const booted = useOS((s) => s.booted);
  const hintDismissed = useOS((s) => s.hintDismissed);
  const dismissHint = useOS((s) => s.dismissHint);
  const [showBoot, setShowBoot] = useState(true);

  /* ── Viewport tracking ─────────────────────────────────────────────── */
  useEffect(() => {
    const update = () => useOS.getState().setViewport(window.innerWidth, window.innerHeight);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  /* ── Audio config ──────────────────────────────────────────────────── */
  useEffect(() => {
    configureSfx(settings.sounds, settings.volume);
    musicEngine.setVolume(settings.volume);
  }, [settings.sounds, settings.volume]);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  /* ── Music auto-advance ────────────────────────────────────────────── */
  useEffect(() => {
    musicEngine.setEndedCallback(() => {
      const st = useMusicStore.getState();
      const idx = st.tracks.findIndex((t) => t.id === st.currentId);
      const nextTrack = st.tracks[(idx + 1) % st.tracks.length];
      musicEngine.play(nextTrack, 0);
      st.setCurrent(nextTrack.id);
    });
    return () => musicEngine.setEndedCallback(null);
  }, []);

  /* ── Global shortcuts ──────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const os = useOS.getState();
      if (meta && (e.key === 'k' || e.code === 'Space')) {
        e.preventDefault();
        const open = !os.spotlightOpen;
        os.setSpotlight(open);
        if (open) sfx.open();
        return;
      }
      if (meta && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        if (os.focusedId) os.minimizeWindow(os.focusedId);
        return;
      }
      if (meta && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (os.focusedId) os.closeWindow(os.focusedId);
        return;
      }
      if (e.key === 'Escape') {
        if (os.contextMenu) os.setContextMenu(null);
        else if (os.launchpadOpen) os.setLaunchpad(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── Cross-component command bus ───────────────────────────────────── */
  useEffect(() => {
    const openHandler = (e: Event) => {
      const app = (e as CustomEvent<string>).detail;
      if (app === 'music' || app === 'finder' || app === 'notes' || app === 'settings' || app === 'browser') {
        useOS.getState().openApp(app);
      }
    };
    window.addEventListener('glassos:open', openHandler);
    return () => window.removeEventListener('glassos:open', openHandler);
  }, []);

  const onDesktopContext = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    useOS.getState().setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  /* ── Live CSS variable wiring ──────────────────────────────────────── */
  const rootStyle = {
    '--g-blur': settings.reduceTransparency ? '2px' : `${settings.blur}px`,
    '--g-tint-a': settings.reduceTransparency
      ? '0.9'
      : `${(THEME_BASE_ALPHA[settings.theme] * settings.opacity) / 0.55}`,
    '--g-accent': settings.accent || undefined,
  } as React.CSSProperties;

  return (
    <div
      className="glass-root fixed inset-0 select-none overflow-hidden"
      data-glass-theme={settings.theme}
      style={rootStyle}
    >
      {/* Wallpaper */}
      <div className="absolute inset-0">
        <Wallpaper wallpaper={settings.wallpaper} custom={settings.customWallpaper} />
      </div>

      {/* Desktop area */}
      <main id="glass-desktop" className="absolute inset-0" onContextMenu={onDesktopContext}>
        <DesktopWidgets />
        <WindowLayer />
      </main>

      {/* System chrome */}
      <TopBar />
      <Dock />
      <Spotlight />
      <Launchpad />
      <DesktopContextMenu />

      {/* First-run hint */}
      <AnimatePresence>
        {booted && !hintDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, delay: 0.6 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="glass-chip fixed bottom-[104px] left-4 z-[70] flex items-center gap-3 rounded-full py-2 pl-3.5 pr-2"
          >
            <span className="flex items-center gap-1.5 text-[11.5px] g-text-2">
              <Command size={11} /> K — Spotlight
              <span className="mx-1 opacity-40">·</span>
              <MousePointerClick size={11} /> right-click desktop
              <span className="mx-1 opacity-40">·</span>
              hover the island
            </span>
            <button
              aria-label="Dismiss hint"
              onClick={() => { sfx.click(); dismissHint(); }}
              className="glass-chip rounded-full px-2 py-0.5 text-[10.5px] g-text-1"
            >
              got it
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brightness overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[300] bg-black transition-opacity duration-300"
        style={{ opacity: (1 - settings.brightness) * 0.6 }}
        aria-hidden
      />

      {/* Boot */}
      <AnimatePresence>
        {showBoot && (
          <BootScreen
            onDone={() => {
              setShowBoot(false);
              setBooted(true);
              sfx.open();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
