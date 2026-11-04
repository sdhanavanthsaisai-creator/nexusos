'use client';

import { createSwarmContext, clamp } from './swarm-context';
import { MAX_PARTICLES, random, allocateGrid } from './swarm-grid';
import { stir, flowField } from './swarm-flow';
import { moveParticles } from './swarm-particles';
import { drawSwarm } from './swarm-draw';
import { attachSwarmInput } from './swarm-input';

const INTRO_SECONDS = 1.4;
const HIDDEN = 'swarm-cursor-hidden';

export const createSwarmScene = (canvas, container, settingsRef) => {
  const ctx = createSwarmContext(canvas, container, settingsRef);
  if (!ctx) return null;

  const { gl, shader, vao, cornerBuffer, agentBuffer, lookBuffer, extraBuffer, view, anchor, ring, pointer, burst, ping, reduce } = ctx;
  let raf = 0;
  let last = 0;
  let visible = true;

  const setHidden = value => {
    if (value === ctx.hidden) return;
    ctx.hidden = value;
    container.classList.toggle(HIDDEN, value);
  };

  const seed = () => {
    const rand = random(7);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      ctx.home[i] = 0.08 + 0.92 * Math.sqrt(rand());
      ctx.heft[i] = rand() * rand();
      ctx.bob[i] = rand() * Math.PI * 2;
      ctx.bobRate[i] = 0.5 + rand() * 1.1;
      ctx.grain[i] = 0.55 + rand() * 0.9;
      ctx.glint[i] = rand() * 100;
    }
    ctx.seeded = true;
  };

  const place = gathered => {
    const s = settingsRef.current;
    const rand = random(11);
    const reachOut = Math.hypot(view.width, view.height) * 0.5;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const a = rand() * Math.PI * 2;
      const r = gathered ? ctx.home[i] * s.spread : (0.35 + 0.65 * Math.sqrt(rand())) * reachOut;
      ctx.px[i] = anchor.x + Math.cos(a) * r;
      ctx.py[i] = anchor.y + Math.sin(a) * r;
      ctx.pz[i] = Math.sin(ctx.bob[i]) * s.spread * 0.55;
      ctx.vx[i] = 0;
      ctx.vy[i] = 0;
      ctx.vz[i] = 0;
    }
  };

  const findTarget = () => {
    const s = settingsRef.current;
    if (!s.targets || !pointer.inside) return null;
    const rect = container.getBoundingClientRect();
    const element = document.elementFromPoint(rect.left + pointer.x, rect.top + pointer.y);
    if (!element || !container.contains(element)) return null;
    let match = null;
    try {
      match = element.closest(s.targets);
    } catch {
      match = null;
    }
    return match && container.contains(match) ? match : null;
  };

  const updateAnchor = (s, dt) => {
    const w = view.width;
    const h = view.height;
    if (ctx.hovered && ctx.hovered.isConnected) {
      const box = ctx.hovered.getBoundingClientRect();
      const frame = container.getBoundingClientRect();
      const radius = parseFloat(getComputedStyle(ctx.hovered).borderTopLeftRadius) || 0;
      ring.x = box.left - frame.left + box.width / 2;
      ring.y = box.top - frame.top + box.height / 2;
      ring.hx = box.width / 2;
      ring.hy = box.height / 2;
      ring.corner = Math.min(radius, ring.hx, ring.hy);
      if (!ring.active) {
        let turning = 0;
        for (let i = 0; i < s.count; i++) turning += (ctx.px[i] - ring.x) * ctx.vy[i] - (ctx.py[i] - ring.y) * ctx.vx[i];
        ring.spin = turning < 0 ? -1 : 1;
      }
      ring.active = true;
    } else {
      ring.active = false;
    }
    let goal = 1;
    if (pointer.inside) {
      anchor.x = pointer.x;
      anchor.y = pointer.y;
    } else if (s.idle === 'gather') {
      anchor.x = w * 0.5;
      anchor.y = h * 0.5;
    } else if (s.idle === 'hide') {
      goal = 0;
    } else {
      anchor.x = w * (0.5 + 0.3 * Math.sin(ctx.time * 0.21) + 0.06 * Math.sin(ctx.time * 0.53 + 1.7));
      anchor.y = h * (0.5 + 0.24 * Math.sin(ctx.time * 0.29 + 0.8) + 0.05 * Math.sin(ctx.time * 0.71));
    }
    if (dt > 0) {
      const moveX = clamp((anchor.x - anchor.lastX) / dt, -4000, 4000);
      const moveY = clamp((anchor.y - anchor.lastY) / dt, -4000, 4000);
      const blend = 1 - Math.exp(-dt * 30);
      anchor.moveX += (moveX - anchor.moveX) * blend;
      anchor.moveY += (moveY - anchor.moveY) * blend;
    }
    anchor.lastX = anchor.x;
    anchor.lastY = anchor.y;
    ctx.presence += (goal - ctx.presence) * (1 - Math.exp(-dt / 0.25));
  };

  const resize = () => {
    const s = settingsRef.current;
    view.width = Math.max(1, container.clientWidth);
    view.height = Math.max(1, container.clientHeight);
    view.ratio = Math.min(s.dpr || window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(view.width * view.ratio));
    canvas.height = Math.max(1, Math.round(view.height * view.ratio));
    allocateGrid(ctx);
    if (!ctx.seeded) {
      seed();
      updateAnchor(s, 0);
      if (reduce) {
        anchor.x = view.width / 2;
        anchor.y = view.height / 2;
      }
      anchor.lastX = anchor.x;
      anchor.lastY = anchor.y;
      place(ctx.introClock >= 1);
    }
    drawSwarm(ctx, s);
    wake();
  };

  const frame = now => {
    raf = 0;
    if (!visible || document.hidden) return;
    const s = settingsRef.current;
    const dt = last ? clamp((now - last) / 1000, 0.001, 1 / 30) : 1 / 60;
    last = now;
    if (!s.enabled || reduce) {
      setHidden(false);
      drawSwarm(ctx, s);
      return;
    }
    ctx.time += dt;
    burst.age += dt;
    ping.age += dt;
    if (ctx.introClock < 1) ctx.introClock = Math.min(1, ctx.introClock + dt / INTRO_SECONDS);
    const ease = ctx.introClock * ctx.introClock * (3 - 2 * ctx.introClock);
    ctx.hovered = findTarget();
    updateAnchor(s, dt);
    setHidden(s.hideCursor && pointer.inside);
    stir(ctx, s, dt, ease);
    flowField(ctx, s, dt);
    moveParticles(ctx, s, dt / 2, ease);
    moveParticles(ctx, s, dt / 2, ease);
    drawSwarm(ctx, s);
    raf = requestAnimationFrame(frame);
  };

  function wake() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  const detachInput = attachSwarmInput(container, ctx, settingsRef);

  const onVisibility = () => {
    last = 0;
    wake();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersection = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    if (visible) {
      last = 0;
      wake();
    }
  });
  intersection.observe(container);
  document.addEventListener('visibilitychange', onVisibility);
  resize();

  const dispose = () => {
    cancelAnimationFrame(raf);
    setHidden(false);
    resizeObserver.disconnect();
    intersection.disconnect();
    detachInput();
    document.removeEventListener('visibilitychange', onVisibility);
    gl.deleteBuffer(cornerBuffer);
    gl.deleteBuffer(agentBuffer);
    gl.deleteBuffer(lookBuffer);
    gl.deleteBuffer(extraBuffer);
    gl.deleteVertexArray(vao);
    gl.deleteProgram(shader.program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };

  return { resize, wake, dispose };
};
