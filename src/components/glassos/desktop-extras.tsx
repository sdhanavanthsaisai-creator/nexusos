'use client';

/* ══════════════════════════════════════════════════════════════════════════
   GlassOS — Launchpad · Desktop Context Menu · Desktop Widgets · Boot
   ══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutGrid, Image as ImageIcon, StickyNote, Wand2, Info, Search, Activity,
  BatteryFull, Cpu, X,
} from 'lucide-react';
import { useOS, useSettings, useSticky, useFiles, useIsland } from '@/lib/glassos/store';
import { sfx } from '@/lib/glassos/sound';
import { APP_META, APP_ORDER } from '@/lib/glassos/app-meta';
import { AppIconTile } from './app-icons';
import { WALLPAPER_LIST } from './wallpaper';

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 28 };

/* ── Launchpad ───────────────────────────────────────────────────────────── */

export function Launchpad() {
  const { launchpadOpen, setLaunchpad, openApp } = useOS();
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (launchpadOpen) {
      setQ('');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [launchpadOpen]);

  const apps = useMemo(
    () => APP_ORDER.filter((id) => APP_META[id].name.toLowerCase().includes(q.trim().toLowerCase())),
    [q],
  );

  return (
    <AnimatePresence>
      {launchpadOpen && (
        <motion.div
          className="fixed inset-0 z-[115] flex flex-col items-center"
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(26px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          transition={{ duration: 0.28 }}
          style={{ background: 'rgba(2,4,10,0.45)' }}
          onPointerDown={() => setLaunchpad(false)}
          role="dialog" aria-label="Launchpad"
        >
          <div className="relative z-10 mt-[9vh] w-[300px]">
            <div className="glass-chip flex items-center gap-2 rounded-full px-4 py-2">
              <Search size={14} className="g-text-3" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && apps[0]) { openApp(apps[0]); }
                  if (e.key === 'Escape') setLaunchpad(false);
                }}
                placeholder="Search apps"
                className="g-input w-full text-[13.5px]"
                aria-label="Search apps"
              />
            </div>
          </div>

          <div
            className="relative z-10 mt-[7vh] grid w-full max-w-[720px] grid-cols-3 gap-x-6 gap-y-9 px-8 sm:grid-cols-5"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {apps.map((id, i) => (
              <motion.button
                key={id}
                initial={{ opacity: 0, scale: 0.6, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ ...SPRING, delay: i * 0.035 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => openApp(id)}
                className="flex flex-col items-center gap-2.5"
              >
                <div className="drop-shadow-2xl"><AppIconTile appId={id} size={72} radius={19} /></div>
                <span className="text-[12.5px] font-medium text-white/90 drop-shadow">{APP_META[id].name}</span>
              </motion.button>
            ))}
            {apps.length === 0 && <div className="col-span-full text-center text-[14px] text-white/60">No apps found</div>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Desktop context menu ────────────────────────────────────────────────── */

export function DesktopContextMenu() {
  const { contextMenu, setContextMenu, openApp, tidyWindows } = useOS();
  const setWallpaper = useSettings((s) => s.set);
  const toggleSticky = useSticky((s) => s.toggle);

  const close = () => setContextMenu(null);

  const items = [
    { icon: <ImageIcon size={14} />, label: 'Shuffle wallpaper', run: () => {
      const st = useSettings.getState();
      const i = WALLPAPER_LIST.findIndex((w) => w.id === st.wallpaper);
      setWallpaper('wallpaper', WALLPAPER_LIST[(i + 1) % WALLPAPER_LIST.length].id);
      sfx.click();
    } },
    { icon: <LayoutGrid size={14} />, label: 'Open Launchpad', run: () => useOS.getState().setLaunchpad(true) },
    { icon: <Wand2 size={14} />, label: 'Tidy windows', run: () => tidyWindows() },
    { icon: <StickyNote size={14} />, label: 'Toggle sticky note', run: () => { toggleSticky(); sfx.click(); } },
    { icon: <Info size={14} />, label: 'About GlassOS', run: () => {
      useIsland.getState().pushAlert({ icon: 'info', title: 'GlassOS 1.0 “Aurora”', detail: 'A glass desktop in your browser' });
      sfx.click();
    } },
  ];

  return (
    <AnimatePresence>
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[100]" onPointerDown={close} onContextMenu={(e) => { e.preventDefault(); close(); }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
            transition={SPRING}
            className="glass-deep fixed z-[101] w-[210px] rounded-xl p-1.5"
            style={{
              left: Math.min(contextMenu.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 230),
              top: Math.min(contextMenu.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 240),
            }}
            role="menu"
          >
            {items.map((it) => (
              <button
                key={it.label}
                role="menuitem"
                onClick={() => { sfx.click(); it.run(); close(); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] g-text-1 transition hover:bg-white/[0.1]"
              >
                <span className="g-text-3">{it.icon}</span> {it.label}
              </button>
            ))}
            <div className="mx-2 my-1 h-px bg-white/10" />
            <button
              role="menuitem"
              onClick={() => { sfx.pop(); openApp('settings'); close(); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] g-text-1 transition hover:bg-white/[0.1]"
            >
              <span className="g-text-3"><Info size={14} /></span> Settings…
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Desktop widgets ─────────────────────────────────────────────────────── */

function ClockWidget() {
  const clock24h = useSettings((s) => s.clock24h);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);
  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: !clock24h });
  const date = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  return (
    <div className="glass-deep rounded-2xl px-5 py-4 text-right">
      <div className="text-[40px] font-bold leading-none tracking-tight tabular-nums text-white drop-shadow-lg">{time}</div>
      <div className="mt-1.5 text-[12px] font-medium text-white/70">{date}</div>
    </div>
  );
}

function SystemWidget() {
  const [fps, setFps] = useState(60);
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);
  const [mem, setMem] = useState<number | null>(null);
  const frames = useRef(0);
  const last = useRef(performance.now());

  useEffect(() => {
    let raf = 0;
    const loop = (t: number) => {
      frames.current++;
      if (t - last.current >= 1000) {
        setFps(Math.round((frames.current * 1000) / (t - last.current)));
        frames.current = 0;
        last.current = t;
        const pm = performance as Performance & { memory?: { usedJSHeapSize: number } };
        if (pm.memory) setMem(Math.round(pm.memory.usedJSHeapSize / 1048576));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean; addEventListener: (t: string, cb: () => void) => void }> };
    if (!nav.getBattery) return;
    nav.getBattery().then((b) => {
      const u = () => setBattery({ level: Math.round(b.level * 100), charging: b.charging });
      u();
      b.addEventListener('levelchange', u);
    }).catch(() => {});
  }, []);

  const rows = [
    { icon: <Activity size={12} />, label: 'FPS', value: String(fps), good: fps >= 50 },
    { icon: <BatteryFull size={12} />, label: 'Battery', value: battery ? `${battery.level}%${battery.charging ? ' ⚡' : ''}` : '—', good: !battery || battery.level > 20 },
    { icon: <Cpu size={12} />, label: 'Memory', value: mem !== null ? `${mem} MB` : '—', good: true },
  ];

  return (
    <div className="glass rounded-2xl px-4 py-3">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] g-text-3">
        <Activity size={11} /> System
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-[12px]">
            <span className="flex items-center gap-1.5 g-text-2">{r.icon}{r.label}</span>
            <span className={`font-semibold tabular-nums ${r.good ? 'g-text-1' : 'text-amber-300'}`}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StickyWidget() {
  const { text, visible, setText } = useSticky();
  const setVisible = useSticky((s) => s.toggle);
  if (!visible) return null;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass relative w-[210px] rounded-2xl"
      style={{ background: 'linear-gradient(160deg, rgba(251,191,36,0.16), rgba(251,113,133,0.10))' }}
    >
      <button
        aria-label="Hide sticky note"
        onClick={() => { sfx.toggleOff(); setVisible(); }}
        className="absolute right-2 top-2 rounded-full p-1 g-text-3 hover:text-white"
      >
        <X size={11} />
      </button>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Jot something…"
        aria-label="Sticky note"
        className="g-input g-scroll h-[130px] w-full resize-none rounded-2xl bg-transparent p-3.5 text-[12.5px] leading-relaxed"
      />
    </motion.div>
  );
}

export function DesktopWidgets() {
  const showWidgets = useSettings((s) => s.showWidgets);
  if (!showWidgets) return null;
  return (
    <div className="pointer-events-auto absolute right-5 top-[52px] z-[5] flex w-[230px] flex-col items-end gap-3">
      <ClockWidget />
      <SystemWidget />
      <StickyWidget />
    </div>
  );
}

/* ── Boot screen ─────────────────────────────────────────────────────────── */

export function BootScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const DUR = 1500;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / DUR);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(onDone, 240);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#020208]"
      exit={{ opacity: 0, scale: 1.04, filter: 'blur(6px)' }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      role="status"
      aria-label="GlassOS is starting"
    >
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        className="relative mb-8 h-24 w-24"
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg,#a78bfa,#22d3ee,#34d399,#f472b6,#a78bfa)',
            filter: 'blur(18px)',
            animation: 'g-spin 3s linear infinite',
          }}
        />
        <div className="absolute inset-[10px] rounded-full bg-[#05060c]/90 backdrop-blur" />
        <div
          className="absolute inset-[26px] rounded-full"
          style={{ background: 'linear-gradient(135deg,#a78bfa22,#22d3ee33)' }}
        />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 10, letterSpacing: '0.3em' }}
        animate={{ opacity: 1, y: 0, letterSpacing: '0.02em' }}
        transition={{ delay: 0.25, duration: 0.7 }}
        className="text-[26px] font-bold text-white"
      >
        <span className="g-grad-text">GlassOS</span>
      </motion.h1>
      <div className="mt-5 h-[3px] w-[180px] overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-100"
          style={{ width: `${progress * 100}%`, background: 'linear-gradient(90deg,#a78bfa,#22d3ee)' }}
        />
      </div>
      <p className="mt-3 text-[11px] text-white/40">composed locally · spring 300 · damping 30</p>
    </motion.div>
  );
}
