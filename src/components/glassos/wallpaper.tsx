'use client';

/* ══════════════════════════════════════════════════════════════════════════
   GlassOS — Wallpaper Engine
   Live animated aurora/mesh gradient wallpapers + custom image upload.
   ══════════════════════════════════════════════════════════════════════════ */

import { memo, useMemo } from 'react';
import type { WallpaperId } from '@/lib/glassos/types';

interface Blob {
  color: string;
  x: number; // %
  y: number; // %
  size: number; // vw-ish units in %, used as width
  anim: 'a' | 'b' | 'c';
  delay: number;
  opacity: number;
  blur?: number;
}

interface WallpaperDef {
  name: string;
  base: string;
  blobs: Blob[];
  stars?: boolean;
  grid?: boolean;
  vignette?: number;
}

export const WALLPAPERS: Record<Exclude<WallpaperId, 'custom'>, WallpaperDef> = {
  aurora: {
    name: 'Aurora',
    base: 'linear-gradient(180deg,#020617 0%,#041626 55%,#02101c 100%)',
    blobs: [
      { color: '#10b981', x: 8, y: 6, size: 52, anim: 'a', delay: 0, opacity: 0.34 },
      { color: '#14b8a6', x: 58, y: -10, size: 46, anim: 'b', delay: 2, opacity: 0.3 },
      { color: '#6d28d9', x: 30, y: 52, size: 58, anim: 'c', delay: 1, opacity: 0.26 },
      { color: '#22d3ee', x: 74, y: 58, size: 40, anim: 'b', delay: 4, opacity: 0.22 },
      { color: '#0ea5e9', x: -8, y: 34, size: 36, anim: 'a', delay: 3, opacity: 0.2 },
    ],
    stars: true,
    vignette: 0.5,
  },
  midnight: {
    name: 'Midnight',
    base: 'linear-gradient(180deg,#030816 0%,#0a1230 60%,#060b1d 100%)',
    blobs: [
      { color: '#3b82f6', x: 18, y: 12, size: 48, anim: 'a', delay: 0, opacity: 0.26 },
      { color: '#6366f1', x: 64, y: 40, size: 52, anim: 'b', delay: 2, opacity: 0.24 },
      { color: '#0ea5e9', x: 40, y: 68, size: 44, anim: 'c', delay: 1, opacity: 0.2 },
    ],
    stars: true,
    vignette: 0.55,
  },
  nebula: {
    name: 'Nebula',
    base: 'linear-gradient(180deg,#0b0518 0%,#170a2e 55%,#0a0620 100%)',
    blobs: [
      { color: '#d946ef', x: 12, y: 8, size: 46, anim: 'b', delay: 0, opacity: 0.3 },
      { color: '#8b5cf6', x: 60, y: 20, size: 54, anim: 'a', delay: 2, opacity: 0.3 },
      { color: '#f43f5e', x: 34, y: 62, size: 42, anim: 'c', delay: 1, opacity: 0.22 },
      { color: '#22d3ee', x: 78, y: 60, size: 34, anim: 'a', delay: 3, opacity: 0.18 },
    ],
    stars: true,
    vignette: 0.5,
  },
  sunset: {
    name: 'Sunset',
    base: 'linear-gradient(180deg,#1a0b18 0%,#2a0f22 55%,#160a14 100%)',
    blobs: [
      { color: '#fb923c', x: 20, y: 58, size: 50, anim: 'a', delay: 0, opacity: 0.3 },
      { color: '#f43f5e', x: 58, y: 30, size: 48, anim: 'b', delay: 2, opacity: 0.26 },
      { color: '#a855f7', x: 6, y: 10, size: 46, anim: 'c', delay: 1, opacity: 0.24 },
      { color: '#fbbf24', x: 76, y: 66, size: 36, anim: 'b', delay: 3, opacity: 0.18 },
    ],
    stars: false,
    vignette: 0.55,
  },
  cyber: {
    name: 'Cyber',
    base: 'linear-gradient(180deg,#020108 0%,#090316 60%,#030109 100%)',
    blobs: [
      { color: '#e879f9', x: 14, y: 14, size: 44, anim: 'b', delay: 0, opacity: 0.3 },
      { color: '#22d3ee', x: 66, y: 48, size: 48, anim: 'a', delay: 2, opacity: 0.26 },
      { color: '#818cf8', x: 30, y: 70, size: 44, anim: 'c', delay: 1, opacity: 0.2 },
    ],
    stars: true,
    grid: true,
    vignette: 0.6,
  },
};

export const WALLPAPER_LIST = (Object.keys(WALLPAPERS) as Exclude<WallpaperId, 'custom'>[]).map(
  (id) => ({ id, ...WALLPAPERS[id] }),
);

function Stars() {
  const stars = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => {
        const seed = Math.sin(i * 127.1) * 43758.5453;
        const r = (v: number) => v - Math.floor(v);
        return {
          left: r(seed) * 100,
          top: r(seed * 1.7) * 62,
          size: r(seed * 2.3) * 1.6 + 0.6,
          delay: r(seed * 3.1) * 6,
          dur: 3 + r(seed * 4.7) * 4,
        };
      }),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animation: `g-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export const Wallpaper = memo(function Wallpaper({
  wallpaper,
  custom,
}: {
  wallpaper: WallpaperId;
  custom: string | null;
}) {
  if (wallpaper === 'custom' && custom) {
    return (
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={custom} alt="" className="h-full w-full scale-105 object-cover" draggable={false} />
        <div className="g-grain absolute inset-0" />
      </div>
    );
  }

  const def = WALLPAPERS[(wallpaper === 'custom' ? 'aurora' : wallpaper) as Exclude<WallpaperId, 'custom'>];

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: def.base }} aria-hidden>
      {def.blobs.map((b, i) => (
        <div
          key={i}
          className={`g-blob g-blob-${b.anim}`}
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: `${b.size}vw`,
            height: `${b.size}vw`,
            background: `radial-gradient(circle at 40% 40%, ${b.color}, transparent 68%)`,
            opacity: b.opacity,
            animationDelay: `${b.delay}s`,
            filter: `blur(${b.blur ?? 70}px)`,
          }}
        />
      ))}
      {def.stars && <Stars />}
      {def.grid && (
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(232,121,249,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.4) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse at 50% 100%, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 50% 100%, black 30%, transparent 75%)',
          }}
        />
      )}
      <div className="g-grain absolute inset-0" />
      {def.vignette ? (
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse at 50% 42%, transparent 40%, rgba(0,0,0,${def.vignette}) 100%)` }}
        />
      ) : null}
    </div>
  );
});
