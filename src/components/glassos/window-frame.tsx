'use client';

/* ══════════════════════════════════════════════════════════════════════════
   GlassOS — Window Frame & Layer
   Spring-physics dragging, 8-way resizing, edge snapping, focus elevation.
   ══════════════════════════════════════════════════════════════════════════ */

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  motion, animate, useMotionValue, type PanInfo, useDragControls,
} from 'framer-motion';
import { APP_META } from '@/lib/glassos/app-meta';
import { useOS } from '@/lib/glassos/store';
import type { WinState, Rect } from '@/lib/glassos/types';

export const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30, mass: 0.9 };
const TITLE_H = 38;

const EDGE = 26; // snap trigger distance

function clampRect(r: Rect, vp: { w: number; h: number }): Rect {
  return {
    x: Math.min(Math.max(r.x, -(r.w - 140)), vp.w - 140),
    y: Math.min(Math.max(r.y, 42), vp.h - 120),
    w: r.w,
    h: r.h,
  };
}

/* ── Traffic lights ──────────────────────────────────────────────────────── */

function TrafficLights({ id }: { id: string }) {
  const { closeWindow, minimizeWindow, toggleMaximize } = useOS();
  const btn =
    'g-tl flex h-[12px] w-[12px] items-center justify-center rounded-full text-[9px] font-bold leading-none text-black/55';
  return (
    <div className="g-tl-group flex items-center gap-[8px] pl-1" role="group" aria-label="Window controls">
      <button aria-label="Close window" className={`${btn} bg-[#ff5f57]`} onClick={() => closeWindow(id)}>
        <svg width="7" height="7" viewBox="0 0 8 8" className="opacity-0 group-hover:opacity-100"><path d="M1 1l6 6M7 1L1 7" stroke="black" strokeWidth="1.4" strokeLinecap="round" /></svg>
      </button>
      <button aria-label="Minimize window" className={`${btn} bg-[#febc2e]`} onClick={() => minimizeWindow(id)}>
        <svg width="7" height="7" viewBox="0 0 8 8" className="opacity-0 group-hover:opacity-100"><path d="M1 4h6" stroke="black" strokeWidth="1.4" strokeLinecap="round" /></svg>
      </button>
      <button aria-label="Maximize window" className={`${btn} bg-[#28c840]`} onClick={() => toggleMaximize(id)}>
        <svg width="7" height="7" viewBox="0 0 8 8" className="opacity-0 group-hover:opacity-100"><path d="M1.5 1.5h5v5h-5z" fill="none" stroke="black" strokeWidth="1.2" /></svg>
      </button>
    </div>
  );
}

/* ── Resize handles ──────────────────────────────────────────────────────── */

type Dir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const HANDLES: { dir: Dir; className: string; cursor: string }[] = [
  { dir: 'n', className: 'left-2 right-2 -top-[3px] h-[7px]', cursor: 'ns-resize' },
  { dir: 's', className: 'left-2 right-2 -bottom-[3px] h-[7px]', cursor: 'ns-resize' },
  { dir: 'e', className: 'top-2 bottom-2 -right-[3px] w-[7px]', cursor: 'ew-resize' },
  { dir: 'w', className: 'top-2 bottom-2 -left-[3px] w-[7px]', cursor: 'ew-resize' },
  { dir: 'ne', className: '-top-[4px] -right-[4px] h-[14px] w-[14px]', cursor: 'nesw-resize' },
  { dir: 'nw', className: '-top-[4px] -left-[4px] h-[14px] w-[14px]', cursor: 'nwse-resize' },
  { dir: 'se', className: '-bottom-[4px] -right-[4px] h-[14px] w-[14px]', cursor: 'nwse-resize' },
  { dir: 'sw', className: '-bottom-[4px] -left-[4px] h-[14px] w-[14px]', cursor: 'nesw-resize' },
];

/* ── Window frame ────────────────────────────────────────────────────────── */

export const WindowFrame = memo(function WindowFrame({
  win,
  children,
  title,
  icon,
}: {
  win: WinState;
  children: React.ReactNode;
  title: string;
  icon?: React.ReactNode;
}) {
  const meta = APP_META[win.appId];
  const { viewport, focusedId, focusWindow, setRect, snapHint, setSnapHint, snapWindow } = useOS();
  const focused = focusedId === win.id;
  const controls = useDragControls();
  const interacting = useRef(false);

  const mx = useMotionValue(win.x);
  const my = useMotionValue(win.y);
  const mw = useMotionValue(win.w);
  const mh = useMotionValue(win.h);

  // External rect changes (snap / maximize / tidy) → spring there, unless user is interacting.
  useEffect(() => {
    if (interacting.current) return;
    const opts = { ...SPRING };
    animate(mx, win.x, opts);
    animate(my, win.y, opts);
    animate(mw, win.w, opts);
    animate(mh, win.h, opts);
  }, [win.x, win.y, win.w, win.h, mx, my, mw, mh]);

  const onDragEnd = (_e: unknown, _info: PanInfo) => {
    interacting.current = false;
    const hint = useOS.getState().snapHint;
    if (hint) {
      snapWindow(win.id, hint);
      return;
    }
    setRect(win.id, clampRect({ x: mx.get(), y: my.get(), w: win.w, h: win.h }, viewport));
  };

  const onDrag = (e: MouseEvent | TouchEvent | PointerEvent) => {
    const pt = 'clientX' in e ? { x: e.clientX, y: e.clientY } : null;
    if (!pt) return;
    const { w: vw, h: vh } = viewport;
    let hint: 'left' | 'right' | 'max' | null = null;
    if (pt.y <= 6) hint = 'max';
    else if (pt.x <= EDGE) hint = 'left';
    else if (pt.x >= vw - EDGE) hint = 'right';
    if (hint !== snapHint) setSnapHint(hint);
  };

  const startResize = (dir: Dir) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    focusWindow(win.id);
    interacting.current = true;
    const startX = e.clientX;
    const startY = e.clientY;
    const start = { x: mx.get(), y: my.get(), w: mw.get(), h: mh.get() };
    const minW = meta.minW;
    const minH = meta.minH;

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let { x, y, w, h } = start;
      if (dir.includes('e')) w = Math.max(minW, start.w + dx);
      if (dir.includes('s')) h = Math.max(minH, start.h + dy);
      if (dir.includes('w')) {
        w = Math.max(minW, start.w - dx);
        x = start.x + (start.w - w);
      }
      if (dir.includes('n')) {
        h = Math.max(minH, start.h - dy);
        y = Math.max(42, start.y + (start.h - h));
      }
      w = Math.min(w, viewport.w + 200);
      h = Math.min(h, viewport.h + 200);
      mx.set(x);
      my.set(y);
      mw.set(w);
      mh.set(h);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      interacting.current = false;
      setRect(win.id, { x: mx.get(), y: my.get(), w: mw.get(), h: mh.get() });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const constraints = useMemo(
    () => ({
      left: -(win.w - 140),
      right: viewport.w - 140,
      top: 42,
      bottom: viewport.h - 120,
    }),
    [win.w, viewport],
  );

  return (
    <motion.div
      role="dialog"
      aria-label={`${title} window`}
      className={`glass absolute left-0 top-0 flex flex-col overflow-hidden rounded-[14px] will-change-transform ${
        focused ? 'g-win-focused' : 'g-win-blurred'
      }`}
      style={{
        x: mx,
        y: my,
        width: mw,
        height: mh,
        zIndex: win.z,
        pointerEvents: win.minimized ? 'none' : 'auto',
      }}
      initial={{ scale: 0.9, opacity: 0, y: win.y + 30 }}
      animate={{
        scale: win.minimized ? 0.06 : 1,
        opacity: win.minimized ? 0 : 1,
      }}
      exit={{ scale: 0.9, opacity: 0, y: win.y + 40 }}
      transition={SPRING}
      drag={!win.maximized}
      dragListener={false}
      dragControls={controls}
      dragMomentum={false}
      dragElastic={0.04}
      dragConstraints={constraints}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      onPointerDown={() => focusWindow(win.id)}
      onAnimationComplete={() => {
        // hide fully minimized windows from hit-testing after the spring settles
        if (win.minimized) mx.set(win.x);
      }}
    >
      {/* Title bar */}
      <div
        className="relative flex shrink-0 items-center gap-2 border-b border-white/[0.07] bg-white/[0.04] px-3 backdrop-blur-xl"
        style={{ height: TITLE_H, cursor: win.maximized ? 'default' : 'grab' }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          controls.start(e);
        }}
        onDoubleClick={() => !win.maximized && useOS.getState().toggleMaximize(win.id)}
      >
        <TrafficLights id={win.id} />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5">
          {icon}
          <span className="text-[12.5px] font-medium tracking-[-0.01em] g-text-2 select-none">{title}</span>
        </div>
      </div>

      {/* Content */}
      <div className="g-scroll relative min-h-0 flex-1 overflow-hidden">{children}</div>

      {/* Resize handles (disabled while maximized) */}
      {!win.maximized &&
        HANDLES.map((h) => (
          <div
            key={h.dir}
            aria-hidden
            className={`absolute z-10 ${h.className}`}
            style={{ cursor: h.cursor, touchAction: 'none' }}
            onPointerDown={startResize(h.dir)}
          />
        ))}
    </motion.div>
  );
});

/* ── Snap preview overlay ────────────────────────────────────────────────── */

export function SnapPreview() {
  const { snapHint, viewport } = useOS();
  if (!snapHint) return null;
  const top = 42;
  const h = viewport.h - top - 100;
  const rect =
    snapHint === 'left'
      ? { left: 10, top, width: viewport.w / 2 - 20, height: h }
      : snapHint === 'right'
        ? { left: viewport.w / 2 + 10, top, width: viewport.w / 2 - 20, height: h }
        : { left: 10, top, width: viewport.w - 20, height: h };
  return (
    <div
      className="g-snap-preview glass-deep pointer-events-none absolute z-[80] border-2"
      style={{ ...rect, borderColor: 'var(--g-accent)' }}
    />
  );
}
