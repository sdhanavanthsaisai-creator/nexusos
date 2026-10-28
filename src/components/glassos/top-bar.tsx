'use client';

/* ══════════════════════════════════════════════════════════════════════════
   GlassOS — Top Status Bar + Control Center
   ══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, SlidersHorizontal, Sun, Volume2, VolumeX, Image as ImageIcon,
  AudioLines, Sparkles, Wifi, BatteryFull, BatteryLow, Moon,
} from 'lucide-react';
import { useOS, useSettings, useIsland } from '@/lib/glassos/store';
import { sfx, unlockAudio } from '@/lib/glassos/sound';
import { musicEngine } from '@/lib/glassos/music';
import { APP_META } from '@/lib/glassos/app-meta';
import { WALLPAPER_LIST } from './wallpaper';
import type { ThemeId } from '@/lib/glassos/types';
import { DynamicIsland } from './dynamic-island';

const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: 'dark-glass', label: 'Dark Glass', swatch: 'linear-gradient(135deg,#1e293b,#a78bfa)' },
  { id: 'frost-light', label: 'Frost Light', swatch: 'linear-gradient(135deg,#e2e8f0,#c4b5fd)' },
  { id: 'aurora', label: 'Aurora', swatch: 'linear-gradient(135deg,#022c22,#34d399)' },
  { id: 'midnight-cyber', label: 'Cyber', swatch: 'linear-gradient(135deg,#0f031f,#e879f9)' },
];

function useClock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const iv = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);
  return t;
}

function Battery() {
  const [bat, setBat] = useState<{ level: number; charging: boolean } | null>(null);
  useEffect(() => {
    let batterylevel = 0;
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean; addEventListener: (e: string, cb: () => void) => void }> };
    if (!nav.getBattery) return;
    let cleanup = () => {};
    nav.getBattery().then((b) => {
      const update = () => setBat({ level: Math.round(b.level * 100), charging: b.charging });
      update();
      const onChange = () => {
        update();
        if (Math.round(b.level * 100) === 20 && !b.charging) {
          useIsland.getState().pushAlert({ icon: 'battery', title: 'Low battery', detail: `${batterylevel}% remaining` });
        }
      };
      batterylevel = Math.round(b.level * 100);
      b.addEventListener('levelchange', onChange);
      b.addEventListener('chargingchange', onChange);
      cleanup = () => {
        b.removeEventListener('levelchange', onChange);
        b.removeEventListener('chargingchange', onChange);
      };
    }).catch(() => {});
    return () => cleanup();
  }, []);
  if (!bat) return <BatteryFull size={15} className="g-text-2" />;
  return (
    <span className="flex items-center gap-1 g-text-2" aria-label={`Battery ${bat.level}%`}>
      <span className="text-[10.5px] tabular-nums">{bat.level}%</span>
      {bat.charging || bat.level > 20 ? <BatteryFull size={15} /> : <BatteryLow size={15} className="text-amber-400" />}
    </span>
  );
}

function ControlCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useSettings();
  const set = useSettings((s) => s.set);
  const pushAlert = useIsland((s) => s.pushAlert);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open, onClose]);

  const sliderRow = (
    label: string, icon: React.ReactNode, value: number, min: number, max: number, step: number,
    onChange: (v: number) => void, format?: (v: number) => string,
  ) => (
    <div className="flex items-center gap-3">
      <span className="g-text-2">{icon}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-white
          [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
      />
      <span className="w-9 text-right text-[10.5px] tabular-nums g-text-3">{format ? format(value) : Math.round(value * 100) + '%'}</span>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="glass-deep absolute right-2 top-[38px] z-[110] w-[300px] rounded-2xl p-4"
          role="dialog"
          aria-label="Control Center"
        >
          <div className="space-y-3.5">
            {sliderRow('Brightness', <Sun size={14} />, settings.brightness, 0.35, 1, 0.01, (v) => set('brightness', v))}
            {sliderRow('Volume', settings.volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />, settings.volume, 0, 1, 0.01, (v) => {
              set('volume', v);
              musicEngine.setVolume(v);
              useIsland.getState().pushAlert({ icon: 'volume', title: `Volume ${Math.round(v * 100)}%` });
            })}
            {sliderRow('Glass blur', <Sparkles size={14} />, settings.blur, 0, 40, 1, (v) => set('blur', v), (v) => `${v}px`)}
          </div>

          <div className="mt-4 border-t border-white/10 pt-3.5">
            <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider g-text-3">Theme</div>
            <div className="grid grid-cols-4 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  aria-label={t.label}
                  title={t.label}
                  onClick={() => { sfx.toggleOn(); set('theme', t.id); }}
                  className={`h-9 rounded-xl border-2 transition ${settings.theme === t.id ? 'scale-95 border-white' : 'border-white/15 hover:border-white/40'}`}
                  style={{ background: t.swatch }}
                />
              ))}
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-between border-t border-white/10 pt-3.5">
            <button
              className="glass-chip glass-hover flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] g-text-1"
              onClick={() => {
                sfx.click();
                const idx = WALLPAPER_LIST.findIndex((w) => w.id === settings.wallpaper);
                const next = WALLPAPER_LIST[(idx + 1) % WALLPAPER_LIST.length];
                set('wallpaper', next.id);
                useIsland.getState().pushAlert({ icon: 'info', title: 'Wallpaper', detail: next.name });
              }}
            >
              <ImageIcon size={12} /> Shuffle
            </button>
            <button
              aria-label="Toggle sound effects"
              onClick={() => { const v = !settings.sounds; sfx.toggleOn(); set('sounds', v); }}
              className={`glass-chip glass-hover flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] ${settings.sounds ? 'g-text-1' : 'g-text-3'}`}
            >
              <AudioLines size={12} /> SFX {settings.sounds ? 'on' : 'off'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function TopBar() {
  const { focusedId, windows, setSpotlight } = useOS();
  const { clock24h, theme } = useSettings();
  const [ccOpen, setCcOpen] = useState(false);
  const time = useClock();
  const focusedApp = windows.find((w) => w.id === focusedId);

  const dateStr = time.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = time.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: !clock24h });

  const cycleTheme = () => {
    const idx = THEMES.findIndex((t) => t.id === useSettings.getState().theme);
    useSettings.getState().set('theme', THEMES[(idx + 1) % THEMES.length].id);
    sfx.toggleOn();
  };

  useEffect(() => {
    const handler = () => cycleTheme();
    window.addEventListener('glassos:cycle-theme', handler);
    return () => window.removeEventListener('glassos:cycle-theme', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <header
      className="glass fixed inset-x-0 top-0 z-[90] flex items-center justify-between px-3 text-white"
      style={{ height: 32, borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}
      onPointerDown={unlockAudio}
    >
      {/* Left — identity + focused app */}
      <div className="flex items-center gap-2.5" data-glass-theme={theme}>
        <div className="flex items-center gap-1.5">
          <span
            className="g-orb-pulse h-[13px] w-[13px] rounded-full"
            style={{ background: 'conic-gradient(from 180deg, var(--g-accent), var(--g-accent-2), var(--g-accent-3), var(--g-accent))', boxShadow: '0 0 12px var(--g-accent)' }}
            aria-hidden
          />
          <span className="text-[12.5px] font-bold tracking-[-0.02em] g-grad-text">GlassOS</span>
        </div>
        <span className="text-[12px] font-medium g-text-2">
          {focusedApp ? APP_META[focusedApp.appId].name : 'Desktop'}
        </span>
      </div>

      {/* Center — Dynamic Island */}
      <div className="pointer-events-auto absolute left-1/2 top-[5px] -translate-x-1/2">
        <DynamicIsland />
      </div>

      {/* Right — status + control center */}
      <div className="flex items-center gap-3.5">
        <span className="hidden items-center gap-1 sm:flex"><Wifi size={14} className="g-text-2" /></span>
        <Battery />
        <span className="text-[12px] font-medium tabular-nums g-text-1">{dateStr}</span>
        <span className="text-[12px] font-semibold tabular-nums g-text-1">{timeStr}</span>
        <button aria-label="Open Spotlight" onClick={() => { sfx.open(); setSpotlight(true); }} className="g-text-2 transition hover:scale-110 hover:text-white">
          <Search size={14} />
        </button>
        <button aria-label={theme === 'frost-light' ? 'Dark mode' : 'Light mode'} onClick={cycleTheme} className="g-text-2 transition hover:scale-110 hover:text-white">
          <Moon size={14} />
        </button>
        <button aria-label="Open Control Center" onClick={() => { sfx.click(); setCcOpen((o) => !o); }} className="g-text-2 transition hover:scale-110 hover:text-white">
          <SlidersHorizontal size={14} />
        </button>
      </div>

      <ControlCenter open={ccOpen} onClose={() => setCcOpen(false)} />
    </header>
  );
}
