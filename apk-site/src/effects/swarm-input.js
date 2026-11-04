'use client';

const locate = (container, event) => {
  const rect = container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  return { x, y, inside: x >= 0 && y >= 0 && x <= rect.width && y <= rect.height };
};

/** Wires the swarm to pointer input: tracking, click bursts and the twist it leaves in the field. */
export const attachSwarmInput = (container, ctx, settingsRef) => {
  const { pointer, burst, ping } = ctx;

  const onPointerMove = event => {
    const { x, y, inside } = locate(container, event);
    pointer.x = x;
    pointer.y = y;
    pointer.inside = inside;
  };

  const onPointerDown = event => {
    const s = settingsRef.current;
    const { x, y, inside } = locate(container, event);
    if (!inside || !s.enabled || ctx.reduce || s.clickEffect === 'none') return;
    const reachOut = s.spread * 2.2;
    if (s.clickEffect === 'pulse') {
      ping.x = x;
      ping.y = y;
      ping.age = 0;
    } else {
      burst.age = 0;
    }
    const kick = s.clickEffect === 'pulse' ? 160 : 780;
    for (let i = 0; i < s.count; i++) {
      const dx = ctx.px[i] - x;
      const dy = ctx.py[i] - y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > reachOut) continue;
      const k = (1 - d / reachOut) * kick * (0.6 + 0.4 * ctx.grain[i]);
      ctx.vx[i] += (dx / d) * k;
      ctx.vy[i] += (dy / d) * k;
    }
    if (s.clickEffect === 'pulse') return;
    const twist = 520 * (ctx.time % 2 < 1 ? 1 : -1);
    const inv = 1 / (s.spread * s.spread);
    for (let j = 1; j < ctx.rows - 1; j++) {
      for (let i = 1; i < ctx.cols - 1; i++) {
        const k = i + j * ctx.cols;
        const rx = (i + 0.5) * ctx.cell - x;
        const ry = (j + 0.5) * ctx.cell - y;
        const d2 = rx * rx + ry * ry;
        const w = (Math.sqrt(d2) / s.spread) * Math.exp(-d2 * inv);
        if (w < 0.003) continue;
        const d = Math.sqrt(d2) + 0.001;
        ctx.flowX[k] += (-ry / d) * twist * w;
        ctx.flowY[k] += (rx / d) * twist * w;
      }
    }
  };

  const onPointerUp = event => {
    if (event.pointerType !== 'mouse') pointer.inside = false;
  };

  const onPointerLeave = () => {
    pointer.inside = false;
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });
  window.addEventListener('pointercancel', onPointerUp, { passive: true });
  document.documentElement.addEventListener('pointerleave', onPointerLeave);

  return () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
  };
};
