'use client';

/* Live analyser-driven waveform bars, shared by Island & Music app. */

import { useEffect, useRef } from 'react';
import { musicEngine } from '@/lib/glassos/music';

export function LiveWaveform({
  active,
  bars = 32,
  className,
  barColor,
  idleOpacity = 0.35,
}: {
  active: boolean;
  bars?: number;
  className?: string;
  barColor?: string;
  idleOpacity?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const data = activeRef.current ? musicEngine.waveform() : null;
      const t = performance.now() / 1000;
      const n = bars;
      const gap = 2;
      const bw = (w - gap * (n - 1)) / n;

      for (let i = 0; i < n; i++) {
        let v: number;
        if (data) {
          v = data[Math.floor((i / n) * data.length)] / 255;
          v = 0.12 + v * 0.88;
        } else {
          // idle gentle ripple
          v = 0.18 + 0.14 * (Math.sin(t * 1.6 + i * 0.55) * 0.5 + 0.5);
        }
        const bh = Math.max(2, v * h);
        const x = i * (bw + gap);
        const y = (h - bh) / 2;
        ctx.fillStyle = barColor ?? getComputedStyle(canvas).color;
        ctx.globalAlpha = activeRef.current ? 0.95 : idleOpacity;
        ctx.beginPath();
        ctx.roundRect(x, y, bw, bh, bw / 2);
        ctx.fill();
      }
      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, [active, bars, barColor, idleOpacity]);

  return <canvas ref={ref} className={className} aria-hidden />;
}
