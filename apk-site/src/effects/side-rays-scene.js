'use client';

import { VERTEX, FRAGMENT } from './side-rays-glsl';
import { clamp, wrapAngle, geometryFor, link } from './side-rays-utils';

const PIXEL_BUDGET = 2.4e6;

export const ORIGINS = {
  'top-right': { flipX: 0, flipY: 0, side: 0 },
  'top-left': { flipX: 1, flipY: 0, side: 0 },
  'bottom-right': { flipX: 0, flipY: 1, side: 0 },
  'bottom-left': { flipX: 1, flipY: 1, side: 0 },
  right: { flipX: 0, flipY: 0, side: 1 },
  left: { flipX: 1, flipY: 0, side: 1 }
};

/**
 * Runs the light fan on its own canvas. Returns handles for resize/wake plus teardown, and
 * reports context loss so the caller can remount a fresh scene.
 */
export const createRaysScene = (canvas, container, settingsRef, options = {}) => {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance'
  });
  const shader = gl ? link(gl, VERTEX, FRAGMENT) : null;
  if (!gl || !shader) return null;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const vao = gl.createVertexArray();
  const size = { width: 1, height: 1 };
  const pointer = { x: 0, y: 0, inside: false };
  const aim = { value: 0, velocity: 0 };
  const focus = { angle: 0, strength: 0 };
  let time = Math.random() * 100;
  let reveal = settingsRef.current.intro && !reduced && options.allowIntro ? 0 : 1;
  let raf = 0;
  let last = 0;
  let visible = true;
  let pageVisible = document.visibilityState !== 'hidden';
  let lost = false;

  const resize = () => {
    const s = settingsRef.current;
    const rect = container.getBoundingClientRect();
    const cssWidth = Math.max(1, rect.width);
    const cssHeight = Math.max(1, rect.height);
    const ratio = Math.min(
      window.devicePixelRatio || 1,
      s.maxRatio,
      Math.sqrt(PIXEL_BUDGET / (cssWidth * cssHeight))
    );
    const width = Math.max(1, Math.round(cssWidth * ratio));
    const height = Math.max(1, Math.round(cssHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    size.width = cssWidth;
    size.height = cssHeight;
  };

  const pointerAngle = s => {
    let x = (pointer.x - size.width / 2) / size.height;
    let y = (size.height / 2 - pointer.y) / size.height;
    if (s.frame.flipX) x = -x;
    if (s.frame.flipY) y = -y;
    const { source, heading } = geometryFor(s.frame, size.width / size.height);
    return wrapAngle(Math.atan2(y - source[1], x - source[0]) - heading - s.tilt);
  };

  const frame = now => {
    raf = 0;
    if (lost) return;
    const s = settingsRef.current;
    const dt = clamp((now - last) / 1000 || 0, 0, 0.05);
    last = Math.max(last, now);
    time += dt * s.speed * (reduced ? 0.3 : 1);
    if (reveal < 1) reveal = Math.min(1, reveal + dt / 1.6);

    const tracking = s.followMouse && pointer.inside && !reduced;
    const pointed = tracking ? pointerAngle(s) : 0;
    const target = tracking ? clamp(pointed, -s.spread, s.spread) * s.mouseInfluence : 0;
    const focusTarget = tracking ? s.mouseInfluence : 0;
    const ease = 1 - Math.exp(-dt * 6);
    if (tracking) focus.angle += (clamp(pointed - aim.value, -s.spread * 1.5, s.spread * 1.5) - focus.angle) * ease;
    focus.strength += (focusTarget - focus.strength) * ease;
    const stiffness = 18;
    const damping = 2 * Math.sqrt(stiffness);
    aim.velocity += ((target - aim.value) * stiffness - aim.velocity * damping) * dt;
    aim.value += aim.velocity * dt;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(shader.program);
    gl.bindVertexArray(vao);
    const u = shader.uniforms;
    gl.uniform2f(u.uResolution, canvas.width, canvas.height);
    gl.uniform1f(u.uTime, time);
    gl.uniform3f(u.uColorA, s.colorA[0], s.colorA[1], s.colorA[2]);
    gl.uniform3f(u.uColorB, s.colorB[0], s.colorB[1], s.colorB[2]);
    gl.uniform1f(u.uBlend, s.blend);
    gl.uniform1f(u.uIntensity, s.intensity);
    gl.uniform1f(u.uSpread, s.spread);
    gl.uniform1f(u.uDensity, s.density);
    gl.uniform1f(u.uSharpness, s.sharpness);
    gl.uniform1f(u.uFalloff, s.falloff);
    gl.uniform1f(u.uGlow, s.glow);
    gl.uniform1f(u.uSaturation, s.saturation);
    gl.uniform1f(u.uDust, s.dust);
    gl.uniform1f(u.uOpacity, s.opacity);
    gl.uniform1f(u.uReveal, 1 - Math.pow(1 - reveal, 3));
    gl.uniform1f(u.uLight, s.light ? 1 : 0);
    gl.uniform3f(u.uFrame, s.frame.flipX, s.frame.flipY, s.frame.side);
    gl.uniform1f(u.uAim, s.tilt + aim.value);
    gl.uniform3f(u.uFocus, focus.angle, Math.max(0.06, s.spread * 0.25), focus.strength * 1.4);
    gl.uniform1f(u.uSway, reduced ? 0 : 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const settling =
      Math.abs(target - aim.value) > 1e-4 ||
      Math.abs(aim.velocity) > 1e-4 ||
      Math.abs(focusTarget - focus.strength) > 1e-3;
    const busy = (s.speed > 0 && !reduced) || reveal < 1 || settling;
    if (busy && visible && pageVisible) raf = requestAnimationFrame(frame);
  };

  const wake = () => {
    if (raf || lost || !visible || !pageVisible) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const onPointerMove = event => {
    const rect = container.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    wake();
  };
  const onLeave = () => {
    pointer.inside = false;
    wake();
  };
  const onPointerUp = event => {
    if (event.pointerType !== 'mouse') onLeave();
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });
  window.addEventListener('pointercancel', onPointerUp, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);

  const onLost = event => {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const onRestored = () => options.onRestore?.();
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  const resizeObserver = new ResizeObserver(() => {
    resize();
    wake();
  });
  resizeObserver.observe(container);

  const intersection = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    wake();
  });
  intersection.observe(container);

  const onVisibility = () => {
    pageVisible = document.visibilityState !== 'hidden';
    wake();
  };
  document.addEventListener('visibilitychange', onVisibility);

  resize();
  wake();

  const dispose = () => {
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    intersection.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    document.removeEventListener('visibilitychange', onVisibility);
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
    if (!gl.isContextLost()) {
      gl.deleteVertexArray(vao);
      gl.deleteProgram(shader.program);
    }
  };

  return { resize, wake, dispose };
};
