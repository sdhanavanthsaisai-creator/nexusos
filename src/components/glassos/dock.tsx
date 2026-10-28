'use client';

/* ══════════════════════════════════════════════════════════════════════════
   GlassOS — Magnetic Dock
   macOS-style magnification, tooltips, running indicators, badges.
   ══════════════════════════════════════════════════════════════════════════ */

import { useRef, useState } from 'react';
import {
  motion, useMotionValue, useSpring, useTransform, type MotionValue,
  AnimatePresence,
} from 'framer-motion';
import { LayoutGrid, Search } from 'lucide-react';
import { useOS, useSettings, useNotes, useBrowserStore, useMusicStore } from '@/lib/glassos/store';
import { sfx, unlockAudio } from '@/lib/glassos/sound';
import { APP_META, APP_ORDER } from '@/lib/glassos/app-meta';
import { APP_ICONS } from './app-icons';
import type { AppId } from '@/lib/glassos/types';

function useBadge(appId: AppId): number | null {
  const notesCount = useNotes((s) => s.notes.length);
  const tabsCount = useBrowserStore((s) => s.tabs.length);
  const playing = useMusicStore((s) => s.playing);
  if (appId === 'notes' && notesCount > 0) return notesCount;
  if (appId === 'browser' && tabsCount > 1) return tabsCount;
  if (appId === 'music' && playing) return -1; // pulsing dot
  return null;
}

function DockIcon({
  mouseX, appId, baseSize,
}: {
  mouseX: MotionValue<number>;
  appId: AppId;
  baseSize: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const windows = useOS((s) => s.windows);
  const focusedId = useOS((s) => s.focusedId);
  const openApp = useOS((s) => s.openApp);
  const minimizeWindow = useOS((s) => s.minimizeWindow);
  const badge = useBadge(appId);
  const { Icon, grad, shadow } = APP_ICONS[appId];

  const win = windows.find((w) => w.appId === appId);
  const isOpen = !!win;
  const isFocused = win && focusedId === win.id && !win.minimized;

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const sizeSync = useTransform(distance, [-170, -85, 0, 85, 170], [baseSize, baseSize * 1.18, baseSize * 1.44, baseSize * 1.18, baseSize]);
  const size = useSpring(sizeSync, { stiffness: 340, damping: 22, mass: 0.6 });
  const ySync = useTransform(distance, [-170, 0, 170], [0, -baseSize * 0.3, 0]);
  const y = useSpring(ySync, { stiffness: 340, damping: 22, mass: 0.6 });

  const onClick = () => {
    unlockAudio();
    if (isFocused) minimizeWindow(win.id);
    else openApp(appId);
  };

  return (
    <motion.div
      ref={ref}
      className="relative flex flex-col items-center"
      style={{ width: baseSize + 26, height: baseSize + 16 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="glass-chip absolute -top-[46px] whitespace-nowrap rounded-lg px-2.5 py-1 text-[11.5px] font-medium g-text-1"
            role="tooltip"
          >
            {APP_META[appId].name}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        aria-label={`Open ${APP_META[appId].name}`}
        style={{ y }}
        onClick={onClick}
        whileTap={{ scale: 0.86 }}
      >
        <motion.div
          className="flex items-center justify-center text-white"
          style={{
            width: size,
            height: size,
            borderRadius: Math.round(baseSize * 0.28),
            background: grad,
            boxShadow: `0 8px 20px -4px ${shadow}, inset 0 1px 0 rgba(255,255,255,.4)`,
          }}
        >
          <Icon size={baseSize * 0.52} strokeWidth={1.8} style={{ scale: 1 }} />
        </motion.div>

        {badge !== null &&
          (badge === -1 ? (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] g-orb-pulse" />
          ) : (
            <span className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9.5px] font-bold text-white shadow">
              {badge}
            </span>
          ))}
      </motion.button>

      <span
        className={`mt-[3px] h-[4px] rounded-full transition-all duration-300 ${isOpen ? 'w-[4px] bg-white/80' : 'w-0 bg-transparent'}`}
        aria-hidden
      />
    </motion.div>
  );
}

function UtilityButton({
  mouseX, baseSize, label, onClick, children,
}: {
  mouseX: MotionValue<number>;
  baseSize: number;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });
  const sizeSync = useTransform(distance, [-170, -85, 0, 85, 170], [baseSize, baseSize * 1.15, baseSize * 1.32, baseSize * 1.15, baseSize]);
  const size = useSpring(sizeSync, { stiffness: 340, damping: 22, mass: 0.6 });
  const ySync = useTransform(distance, [-170, 0, 170], [0, -baseSize * 0.24, 0]);
  const y = useSpring(ySync, { stiffness: 340, damping: 22, mass: 0.6 });

  return (
    <div ref={ref} className="relative flex flex-col items-center" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="glass-chip absolute -top-[46px] whitespace-nowrap rounded-lg px-2.5 py-1 text-[11.5px] g-text-1"
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        aria-label={label}
        style={{ y, width: size, height: size }}
        onClick={onClick}
        whileTap={{ scale: 0.86 }}
        className="glass-chip flex items-center justify-center rounded-[26%] g-text-1"
      >
        {children}
      </motion.button>
      <span className="mt-[3px] h-[4px] w-0 rounded-full bg-transparent" aria-hidden />
    </div>
  );
}

export function Dock() {
  const setSpotlight = useOS((s) => s.setSpotlight);
  const setLaunchpad = useOS((s) => s.setLaunchpad);
  const dockSize = useSettings((s) => s.dockSize);
  const baseSize = dockSize;
  const mouseX = useMotionValue(Infinity);

  return (
    <nav
      aria-label="Dock"
      className="g-dock fixed bottom-3 left-1/2 z-[96] flex -translate-x-1/2 items-end gap-1.5 rounded-[22px] px-2.5 pb-1.5 pt-2"
      onMouseMove={(e) => { mouseX.set(e.clientX); unlockAudio(); }}
      onMouseLeave={() => mouseX.set(Infinity)}
    >
      {APP_ORDER.map((id) => (
        <DockIcon key={id} mouseX={mouseX} appId={id} baseSize={baseSize} />
      ))}

      <div className="mx-1 mb-4 h-9 w-px self-center bg-white/15" aria-hidden />

      <UtilityButton mouseX={mouseX} baseSize={baseSize * 0.82} label="Launchpad" onClick={() => { sfx.open(); setLaunchpad(true); }}>
        <LayoutGrid size={baseSize * 0.42} />
      </UtilityButton>
      <UtilityButton mouseX={mouseX} baseSize={baseSize * 0.82} label="Spotlight (⌘K)" onClick={() => { sfx.open(); setSpotlight(true); }}>
        <Search size={baseSize * 0.42} />
      </UtilityButton>
    </nav>
  );
}
