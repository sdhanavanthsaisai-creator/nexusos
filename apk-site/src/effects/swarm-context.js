'use client';

import { VERTEX, FRAGMENT } from './swarm-glsl';
import { MAX_PARTICLES, rectField } from './swarm-grid';

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const compile = (gl, type, source) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
};

const link = gl => {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
};

/**
 * Compiles the swarm program, allocates every GPU buffer and returns the mutable ctx object the
 * simulation passes share. Returns null when WebGL2 or the shaders are unavailable.
 */
export const createSwarmContext = (canvas, container, settingsRef) => {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false
  });
  if (!gl) return null;
  const shader = link(gl);
  if (!shader) return null;

  const slots = MAX_PARTICLES + 1;
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const cornerBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const agentData = new Float32Array(slots * 4);
  const lookData = new Float32Array(slots * 4);
  const extraData = new Float32Array(slots * 2);
  const instanced = (location, width, data) => {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, width, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(location, 1);
    return buffer;
  };
  const agentBuffer = instanced(1, 4, agentData);
  const lookBuffer = instanced(2, 4, lookData);
  const extraBuffer = instanced(3, 2, extraData);
  gl.bindVertexArray(null);

  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const colorCache = new Map();
  const parse = value => {
    const key = String(value);
    const cached = colorCache.get(key);
    if (cached) return cached;
    let rgb = [1, 1, 1];
    if (probe) {
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = '#000000';
      probe.fillStyle = key;
      probe.fillRect(0, 0, 1, 1);
      const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
      rgb = [r / 255, g / 255, b / 255];
    }
    colorCache.set(key, rgb);
    return rgb;
  };

  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  const ctx = {
    gl,
    canvas,
    container,
    shader,
    vao,
    cornerBuffer,
    agentBuffer,
    lookBuffer,
    extraBuffer,
    agentData,
    lookData,
    extraData,
    parse,
    sdf: rectField,
    reduce,
    view: { width: 1, height: 1, ratio: 1 },
    cols: 1,
    rows: 1,
    cell: 16,
    flowX: new Float32Array(1),
    flowY: new Float32Array(1),
    lastX: new Float32Array(1),
    lastY: new Float32Array(1),
    pressure: new Float32Array(1),
    divergence: new Float32Array(1),
    curl: new Float32Array(1),
    field: [0, 0, 0],
    px: new Float32Array(MAX_PARTICLES),
    py: new Float32Array(MAX_PARTICLES),
    pz: new Float32Array(MAX_PARTICLES),
    vx: new Float32Array(MAX_PARTICLES),
    vy: new Float32Array(MAX_PARTICLES),
    vz: new Float32Array(MAX_PARTICLES),
    home: new Float32Array(MAX_PARTICLES),
    heft: new Float32Array(MAX_PARTICLES),
    bob: new Float32Array(MAX_PARTICLES),
    bobRate: new Float32Array(MAX_PARTICLES),
    grain: new Float32Array(MAX_PARTICLES),
    glint: new Float32Array(MAX_PARTICLES),
    order: new Int32Array(MAX_PARTICLES),
    crowd: new Int32Array(MAX_PARTICLES),
    crowdHeads: new Int32Array(1),
    crowdRows: 1,
    pointer: { x: 0, y: 0, inside: false },
    anchor: { x: 0, y: 0, lastX: 0, lastY: 0, moveX: 0, moveY: 0 },
    ring: { active: false, x: 0, y: 0, hx: 0, hy: 0, corner: 0, spin: 1 },
    burst: { age: 10 },
    ping: { age: 10, x: 0, y: 0 },
    hovered: null,
    time: 0,
    presence: 1,
    introClock: settingsRef.current.intro && !reduce ? 0 : 1,
    sorted: 0,
    seeded: false,
    hidden: false
  };

  return ctx;
};
