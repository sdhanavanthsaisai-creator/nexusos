'use client';

import { Renderer, Program, Mesh, Geometry, Triangle, Texture, RenderTarget } from 'ogl';
import { waveVertex, waveFragment, screenVertex, compositeFragment } from './ripple-glsl';

const MAX_WAVES = 100;
const QUALITY_SCALE = { low: 0.4, medium: 0.7, high: 1 };
const START_SCALE = 1.5;
const LIFE_CONSTANT = Math.log(500);

const hexToRGB = hex => {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map(c => c + c)
          .join('')
      : clean;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return [1, 1, 1];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const reduceMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Imperative ripple scene: builds the ogl renderer, the wave buffer and the composite pass,
 * keeps them running on rAF and hands back two handles — uniform updates and teardown.
 */
export const createRippleScene = (mount, configRef) => {
  const still = reduceMotion();
  const renderer = new Renderer({
    alpha: false,
    antialias: false,
    dpr: Math.min(window.devicePixelRatio || 1, 2)
  });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 1);
  const canvas = gl.canvas;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  mount.appendChild(canvas);

  const imageTexture = new Texture(gl, {
    generateMipmaps: false,
    minFilter: gl.LINEAR,
    magFilter: gl.LINEAR,
    wrapS: gl.CLAMP_TO_EDGE,
    wrapT: gl.CLAMP_TO_EDGE
  });

  let disposed = false;
  const image = new window.Image();
  image.crossOrigin = 'anonymous';
  image.decoding = 'async';
  image.onload = () => {
    if (disposed) return;
    imageTexture.image = image;
    compositeUniforms.uTextureSize.value = [image.naturalWidth || 1, image.naturalHeight || 1];
  };
  image.src = configRef.current.src;

  const offsets = new Float32Array(MAX_WAVES * 2);
  const scales = new Float32Array(MAX_WAVES * 2);
  const opacities = new Float32Array(MAX_WAVES);

  const waves = Array.from({ length: MAX_WAVES }, () => ({
    x: 0,
    y: 0,
    scale: START_SCALE,
    target: START_SCALE,
    size: 1,
    opacity: 0
  }));
  let current = 0;

  const geometry = new Geometry(gl, {
    position: { size: 2, data: new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]) },
    uv: { size: 2, data: new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]) },
    iOffset: { instanced: 1, size: 2, data: offsets },
    iScale: { instanced: 1, size: 2, data: scales },
    iOpacity: { instanced: 1, size: 1, data: opacities }
  });

  const waveUniforms = { uRings: { value: configRef.current.rings } };
  const waveProgram = new Program(gl, {
    vertex: waveVertex,
    fragment: waveFragment,
    uniforms: waveUniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    cullFace: false
  });
  waveProgram.setBlendFunc(gl.ONE, gl.ONE);
  const waveMesh = new Mesh(gl, { geometry, program: waveProgram, frustumCulled: false });

  const displacementTarget = new RenderTarget(gl, {
    width: 2,
    height: 2,
    depth: false,
    minFilter: gl.LINEAR,
    magFilter: gl.LINEAR,
    wrapS: gl.CLAMP_TO_EDGE,
    wrapT: gl.CLAMP_TO_EDGE
  });

  const compositeUniforms = {
    uTexture: { value: imageTexture },
    uDisplacement: { value: displacementTarget.texture },
    uResolution: { value: [1, 1] },
    uTextureSize: { value: [1, 1] },
    uTexel: { value: [1, 1] },
    uTint: { value: hexToRGB(configRef.current.tint) },
    uHighlight: { value: hexToRGB(configRef.current.highlightColor) },
    uStrength: { value: configRef.current.strength },
    uSwirl: { value: configRef.current.swirl },
    uDispersion: { value: configRef.current.dispersion },
    uGlint: { value: configRef.current.glint },
    uTintAmount: { value: configRef.current.tintAmount },
    uGrayscale: { value: configRef.current.grayscale ? 1 : 0 }
  };

  const compositeMesh = new Mesh(gl, {
    geometry: new Triangle(gl),
    program: new Program(gl, {
      vertex: screenVertex,
      fragment: compositeFragment,
      uniforms: compositeUniforms,
      depthTest: false,
      depthWrite: false
    })
  });

  let width = 1;
  let height = 1;

  const resize = () => {
    width = Math.max(1, mount.clientWidth);
    height = Math.max(1, mount.clientHeight);
    renderer.setSize(width, height);
    compositeUniforms.uResolution.value = [width, height];

    const scale = QUALITY_SCALE[configRef.current.quality] || QUALITY_SCALE.high;
    const fieldW = Math.max(2, Math.round(width * scale));
    const fieldH = Math.max(2, Math.round(height * scale));
    displacementTarget.setSize(fieldW, fieldH);
    compositeUniforms.uTexel.value = [1 / fieldW, 1 / fieldH];
  };

  const ro = new ResizeObserver(resize);
  ro.observe(mount);
  resize();

  const setNewWave = (x, y, power) => {
    const cfg = configRef.current;
    const wave = waves[current];
    current = (current + 1) % MAX_WAVES;
    wave.x = x;
    wave.y = y;
    wave.scale = START_SCALE * power;
    wave.target = START_SCALE * Math.max(1, cfg.spread) * power;
    wave.size = Math.max(1, cfg.brushSize);
    wave.opacity = 1;
  };

  const localPoint = (clientX, clientY) => {
    const rect = mount.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return null;
    }
    return [clientX - rect.left, rect.height - (clientY - rect.top)];
  };

  let previousX = 0;
  let previousY = 0;

  const onMove = event => {
    const cfg = configRef.current;
    if (!cfg.enabled || still || cfg.trigger === 'click') return;
    const point = localPoint(event.clientX, event.clientY);
    if (!point) return;
    const step = Math.max(1, cfg.spacing);
    if (Math.abs(point[0] - previousX) > step || Math.abs(point[1] - previousY) > step) {
      setNewWave(point[0], point[1], 1);
      previousX = point[0];
      previousY = point[1];
    }
  };

  const onDown = event => {
    const cfg = configRef.current;
    if (!cfg.enabled || still || cfg.trigger === 'hover') return;
    const point = localPoint(event.clientX, event.clientY);
    if (!point) return;
    setNewWave(point[0], point[1], Math.max(1, cfg.clickStrength));
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });

  let raf = 0;
  let previousTime = 0;

  const loop = now => {
    raf = requestAnimationFrame(loop);
    const delta = previousTime ? Math.min(0.05, (now - previousTime) / 1000) : 0;
    previousTime = now;
    const cfg = configRef.current;

    const growth = still ? 0 : 1 - Math.exp(-delta * 1.09);
    const decay = still ? 1 : Math.exp((-delta * LIFE_CONSTANT) / Math.max(0.15, cfg.fade));

    for (let i = 0; i < MAX_WAVES; i += 1) {
      const wave = waves[i];
      if (wave.opacity <= 0) {
        opacities[i] = 0;
        continue;
      }

      wave.opacity *= decay;
      wave.scale += (wave.target - wave.scale) * growth;

      if (wave.opacity < 0.002) {
        wave.opacity = 0;
        opacities[i] = 0;
        continue;
      }

      const half = (wave.scale * wave.size) / 2;
      offsets[i * 2] = (wave.x / width) * 2 - 1;
      offsets[i * 2 + 1] = (wave.y / height) * 2 - 1;
      scales[i * 2] = (half / width) * 2;
      scales[i * 2 + 1] = (half / height) * 2;
      opacities[i] = wave.opacity;
    }

    geometry.attributes.iOffset.needsUpdate = true;
    geometry.attributes.iScale.needsUpdate = true;
    geometry.attributes.iOpacity.needsUpdate = true;

    renderer.render({ scene: waveMesh, target: displacementTarget, clear: true });
    renderer.render({ scene: compositeMesh });
  };
  raf = requestAnimationFrame(loop);

  const update = values => {
    waveUniforms.uRings.value = values.rings;
    compositeUniforms.uStrength.value = values.strength;
    compositeUniforms.uSwirl.value = values.swirl;
    compositeUniforms.uDispersion.value = values.dispersion;
    compositeUniforms.uGlint.value = values.glint;
    compositeUniforms.uTintAmount.value = values.tintAmount;
    compositeUniforms.uGrayscale.value = values.grayscale ? 1 : 0;
    compositeUniforms.uHighlight.value = hexToRGB(values.highlightColor);
    compositeUniforms.uTint.value = hexToRGB(values.tint);
  };

  const dispose = () => {
    disposed = true;
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerdown', onDown);
    if (canvas.parentNode === mount) mount.removeChild(canvas);
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
  };

  return { update, dispose };
};
